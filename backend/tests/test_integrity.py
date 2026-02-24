"""
ShadowTrace Phase 1.5 — Integration Tests
Covers all 4 integrity pipeline stages:
  1. Canonical serializer determinism
  2. Nonce dedup (replay immunity)
  3. Hash chain validation (deletion detection)
  4. Sequence gap detection
  5. Full pipeline — valid/invalid flows
"""

import json
import hmac
import hashlib
import asyncio
import random
import string
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
import pytest

# ── Import the functions under test ─────────────────────────────────
import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.routers.integrity import (
    _canonical,
    canonical_bytes,
    verify_envelope_hmac,
    compute_envelope_hash,
    check_and_record_nonce,
    verify_hash_chain,
    analyze_sequence_gap,
    run_integrity_pipeline,
)


# ════════════════════════════════════════════════════════════════════
# §1 — CANONICAL SERIALIZER DETERMINISM
# ════════════════════════════════════════════════════════════════════

def _random_dict(depth=3):
    """Generate a random nested dict for fuzzing."""
    if depth == 0:
        return random.choice([
            ''.join(random.choices(string.ascii_letters, k=8)),
            random.randint(0, 1000),
            random.random(),
            True, False, None
        ])
    keys = [
        ''.join(random.choices(string.ascii_lowercase, k=random.randint(1, 8)))
        for _ in range(random.randint(1, 5))
    ]
    return {k: _random_dict(depth - 1) for k in keys}


def test_canonical_determinism_1000_random():
    """
    For 1000 random nested dicts, inserting the same keys in different order
    must produce identical canonical output.
    """
    for _ in range(1000):
        original = _random_dict()
        as_json = json.loads(json.dumps(original))        # round-trip to normalise types

        # Rebuild with shuffled key order
        def shuffle_keys(d):
            if not isinstance(d, dict):
                return d
            items = list(d.items())
            random.shuffle(items)
            return {k: shuffle_keys(v) for k, v in items}

        shuffled = shuffle_keys(as_json)
        assert _canonical(original) == _canonical(shuffled), \
            f"Canonical mismatch for: {original}"


def test_canonical_byte_reproducibility():
    """canonical_bytes() must produce identical bytes for same logical object."""
    obj = {
        "header": {"nonce": "abc-123", "seq": 42, "version": "1.2"},
        "payload": {"domain": {"hostname": "evil.com"}, "forms": {"hasLoginForm": True}},
    }
    b1 = canonical_bytes(obj)
    b2 = canonical_bytes(obj)
    assert b1 == b2


def test_canonical_key_sort():
    """Keys must be sorted by unicode codepoint, recursively."""
    obj = {"z": 1, "a": 2, "m": {"z": 10, "a": 20}}
    result = _canonical(obj)
    assert result == '{"a":2,"m":{"a":20,"z":10},"z":1}'


def test_canonical_handles_arrays_and_primitives():
    obj = {"arr": [3, 1, 2], "n": None, "b": True, "s": "hello"}
    result = _canonical(obj)
    # Arrays preserve order; primitives pass through json.dumps
    assert '"arr":[3,1,2]' in result
    assert '"n":null' in result
    assert '"b":true' in result


# ════════════════════════════════════════════════════════════════════
# §2 — NONCE DEDUPLICATION (REPLAY IMMUNITY)
# ════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_fresh_nonce_accepted():
    db = _make_mock_db()
    result = await check_and_record_nonce("nonce-abc-123", "install-001", db)
    assert result is True
    db.nonce_registry.insert_one.assert_called_once()


@pytest.mark.asyncio
async def test_replayed_nonce_rejected():
    from pymongo.errors import DuplicateKeyError
    db = _make_mock_db()
    db.nonce_registry.insert_one.side_effect = DuplicateKeyError("E11000")
    result = await check_and_record_nonce("nonce-abc-123", "install-001", db)
    assert result is False


# ════════════════════════════════════════════════════════════════════
# §3 — HASH CHAIN VALIDATION (DELETION DETECTION)
# ════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_genesis_block_valid():
    db = _make_mock_db()
    db.forensic_chain.find_one.return_value = None  # No prior chain
    result = await verify_hash_chain("install-001", seq=1, prev_hash="GENESIS", genesis=True, db=db)
    assert result["valid"] is True


@pytest.mark.asyncio
async def test_genesis_hash_mismatch():
    db = _make_mock_db()
    result = await verify_hash_chain("install-001", seq=1, prev_hash="WRONG_HASH", genesis=True, db=db)
    assert result["valid"] is False
    assert result["reason"] == "GENESIS_HASH_MISMATCH"


@pytest.mark.asyncio
async def test_valid_chain_continuation():
    stored_hash = "deadbeefdeadbeef" * 4  # 64 hex chars
    db = _make_mock_db()
    db.forensic_chain.find_one.return_value = {"seq": 41, "envelope_hash": stored_hash}

    result = await verify_hash_chain("install-001", seq=42, prev_hash=stored_hash, genesis=False, db=db)
    assert result["valid"] is True


@pytest.mark.asyncio
async def test_chain_break_detected():
    """Delete event N — event N+1 must produce CHAIN_BROKEN."""
    stored_hash = "aabbccdd" * 8
    tampered_prev = "00112233" * 8  # Attacker submits wrong prev_hash after deleting N

    db = _make_mock_db()
    db.forensic_chain.find_one.return_value = {"seq": 41, "envelope_hash": stored_hash}

    result = await verify_hash_chain("install-001", seq=42, prev_hash=tampered_prev, genesis=False, db=db)
    assert result["valid"] is False
    assert result["reason"] == "CHAIN_BROKEN"


@pytest.mark.asyncio
async def test_missing_prev_event():
    """If the backend has no record of seq N-1, return PREV_EVENT_MISSING."""
    db = _make_mock_db()
    db.forensic_chain.find_one.return_value = None

    result = await verify_hash_chain("install-001", seq=100, prev_hash="any", genesis=False, db=db)
    assert result["valid"] is False
    assert result["reason"] == "PREV_EVENT_MISSING"


# ════════════════════════════════════════════════════════════════════
# §4 — SEQUENCE GAP DETECTION
# ════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_no_gap_normal():
    db = _make_mock_db()
    db.forensic_chain.find_one.return_value = {"seq": 41}
    result = await analyze_sequence_gap("install-001", "org-1", seq=42, db=db)
    assert result["state"] == "NORMAL"
    assert result["gap"] == 0


@pytest.mark.asyncio
async def test_small_gap_low_severity():
    db = _make_mock_db()
    db.forensic_chain.find_one.return_value = {"seq": 41}
    result = await analyze_sequence_gap("install-001", "org-1", seq=45, db=db)
    assert result["state"] == "GAP_DETECTED"
    assert result["gap"] == 3
    assert result["severity"] == "LOW"


@pytest.mark.asyncio
async def test_large_gap_high_severity():
    db = _make_mock_db()
    db.forensic_chain.find_one.return_value = {"seq": 10}
    result = await analyze_sequence_gap("install-001", "org-1", seq=100, db=db)
    assert result["state"] == "GAP_DETECTED"
    assert result["gap"] == 89
    assert result["severity"] == "HIGH"


@pytest.mark.asyncio
async def test_counter_reset_critical():
    db = _make_mock_db()
    db.forensic_chain.find_one.return_value = {"seq": 500}
    result = await analyze_sequence_gap("install-001", "org-1", seq=1, db=db)
    assert result["state"] == "RESET_DETECTED"
    assert result["severity"] == "CRITICAL"


# ════════════════════════════════════════════════════════════════════
# §5 — FULL PIPELINE TESTS
# ════════════════════════════════════════════════════════════════════

def _build_valid_envelope(seq=1, prev_hash="GENESIS", genesis=True,
                          nonce="test-nonce-uuid", key_str=None):
    """Build a correctly signed envelope for testing purposes.
    key_str is the integrity_key stored in the DB (plain UTF-8 string).
    """
    key_str = key_str or "shadowtrace_test_integrity_key_2025"
    key = key_str.encode("utf-8")

    header_sans_hmac = {
        "version": "1.2",
        "seq": seq,
        "nonce": nonce,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "installation_id": "test-install-aabbcc",
        "id_tier": "derived",
        "prev_hash": prev_hash,
        "genesis": genesis,
    }
    envelope_sans = {"header": header_sans_hmac, "payload": {"domain": {"hostname": "test.com"}}}
    msg = canonical_bytes(envelope_sans)
    hmac_hex = hmac.new(key, msg, hashlib.sha256).hexdigest()

    return {
        "header": {**header_sans_hmac, "hmac": hmac_hex},
        "payload": {"domain": {"hostname": "test.com"}}
    }, key_str


@pytest.mark.asyncio
async def test_full_pipeline_valid_genesis():
    envelope, key_str = _build_valid_envelope()
    db = _mock_db_for_pipeline(key_str)

    result = await run_integrity_pipeline(envelope, "org-test", db)
    assert result["valid"] is True
    assert result["violation_type"] is None


@pytest.mark.asyncio
async def test_full_pipeline_replay_rejected():
    from pymongo.errors import DuplicateKeyError
    envelope, key_str = _build_valid_envelope()
    db = _mock_db_for_pipeline(key_str)
    db.nonce_registry.insert_one.side_effect = DuplicateKeyError("E11000")

    result = await run_integrity_pipeline(envelope, "org-test", db)
    assert result["valid"] is False
    assert result["violation_type"] == "REPLAY"


@pytest.mark.asyncio
async def test_full_pipeline_hmac_mismatch():
    envelope, key_str = _build_valid_envelope()
    # Corrupt the hmac
    envelope["header"]["hmac"] = "0" * 64
    db = _mock_db_for_pipeline(key_str)

    result = await run_integrity_pipeline(envelope, "org-test", db)
    assert result["valid"] is False
    assert result["violation_type"] == "HMAC_MISMATCH"


# ════════════════════════════════════════════════════════════════════
# Helpers
# ════════════════════════════════════════════════════════════════════

def _make_mock_db():
    db = MagicMock()
    db.nonce_registry.insert_one = AsyncMock()
    db.forensic_chain.find_one = AsyncMock(return_value=None)
    db.forensic_chain.insert_one = AsyncMock()
    db.anomalies.insert_one = AsyncMock()
    db.tamper_alerts.insert_one = AsyncMock()
    db.organizations.find_one = AsyncMock(return_value=None)
    return db


def _mock_db_for_pipeline(key_str: str):
    db = _make_mock_db()
    db.organizations.find_one = AsyncMock(return_value={"integrity_secret": key_str})
    db.forensic_chain.find_one = AsyncMock(return_value=None)
    return db


def _hex_key_to_str(hex_key: str) -> str:
    """Return the key string as-is (kept for reference)."""
    return hex_key
