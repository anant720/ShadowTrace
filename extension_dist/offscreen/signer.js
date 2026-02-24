/**
 * ShadowTrace — Offscreen HMAC Signer
 *
 * Runs inside the offscreen document (signer.html).  Receives sign requests
 * from the service worker via chrome.runtime.onMessage and replies with the
 * computed HMAC hex string.  Also computes SHA-256 envelope hashes.
 *
 * Message protocol:
 *   → { type: 'ST_SIGN',   envelope: <object>, keyHex: <string> }
 *   ← { hmac: <hexString>, envelopeHash: <hexString> }
 *
 *   → { type: 'ST_HASH',   data: <string> }
 *   ← { hash: <hexString> }
 */

'use strict';

// canonicalize() is loaded by signer.html via utils/canonicalize.js

// ── Helpers ─────────────────────────────────────────────────────────

function hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
}

function bufToHex(buf) {
    return Array.from(new Uint8Array(buf))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// ── Core Operations ─────────────────────────────────────────────────

/**
 * Compute HMAC-SHA-256 over the canonical form of `envelope` using the
 * raw key `keyHex`.  Also returns the SHA-256 hash of (canonical + hmac)
 * which becomes the `envelope_hash` stored in the forensic chain.
 */
async function signEnvelope(envelope, keyHex) {
    // 1. Canonical bytes of envelope-without-hmac
    const canonical = canonicalize(envelope);
    const msgBytes = new TextEncoder().encode(canonical);

    // 2. Import key
    const keyData = hexToBytes(keyHex);
    const cryptoKey = await crypto.subtle.importKey(
        'raw', keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false, ['sign']
    );

    // 3. HMAC
    const sigBuf = await crypto.subtle.sign('HMAC', cryptoKey, msgBytes);
    const hmac = bufToHex(sigBuf);

    // 4. Envelope hash = SHA-256( canonical_bytes || hmac_bytes )
    // Used for the hash-chain `prev_hash` of the NEXT event.
    const hmacBytes = new TextEncoder().encode(hmac);
    const combined = new Uint8Array(msgBytes.byteLength + hmacBytes.byteLength);
    combined.set(msgBytes, 0);
    combined.set(hmacBytes, msgBytes.byteLength);
    const hashBuf = await crypto.subtle.digest('SHA-256', combined);
    const envelopeHash = bufToHex(hashBuf);

    return { hmac, envelopeHash };
}

/**
 * Compute SHA-256 of an arbitrary string — used for installation_id derivation
 * in the fallback identity path.
 */
async function sha256String(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return bufToHex(buf);
}

// ── Message Listener ─────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || !msg.type) return false;

    if (msg.type === 'ST_SIGN') {
        signEnvelope(msg.envelope, msg.keyHex)
            .then(sendResponse)
            .catch(err => sendResponse({ error: err.message }));
        return true; // Keep channel open for async reply
    }

    if (msg.type === 'ST_HASH') {
        sha256String(msg.data)
            .then(hash => sendResponse({ hash }))
            .catch(err => sendResponse({ error: err.message }));
        return true;
    }

    return false;
});
