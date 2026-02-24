"""
ShadowTrace Backend — Pydantic Request/Response Schemas

Input validation and response serialization models.
All external data passes through these schemas.
"""

from pydantic import BaseModel, Field, field_validator, EmailStr
from typing import Any, List, Optional
from datetime import datetime
import re


# ── Multi-Tenancy Models ─────────────────────────────────────────────

class Organization(BaseModel):
    id: str = Field(..., alias="_id")
    name: str = Field(..., min_length=1, max_length=100)
    slug: str = Field(..., min_length=1, max_length=50) # e.g. "acme-corp"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    subscription_tier: str = "community" # community, pro, enterprise, guardian
    white_label_enabled: bool = False

class UsageStats(BaseModel):
    scans_this_month: int = 0
    quota_limit: int = 100
    members_count: int = 1
    members_limit: int = 1

class SubscriptionInfo(BaseModel):
    tier: str
    limits: dict
    usage: UsageStats

class OrganizationCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    slug: str = Field(..., min_length=1, max_length=50)
    subscription_tier: str = "community"

class OrganizationResponse(BaseModel):
    id: str
    name: str
    slug: str
    subscription_tier: str
    created_at: datetime
    subscription: Optional[SubscriptionInfo] = None

class User(BaseModel):
    id: str = Field(..., alias="_id")
    email: EmailStr
    username: str
    org_id: str
    role: str = "member" # admin, member
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Member(BaseModel):
    user_id: str
    email: EmailStr
    role: str
    joined_at: datetime

class InvitationCreate(BaseModel):
    email: EmailStr
    role: str = "member"

class InvitationResponse(BaseModel):
    id: str
    email: EmailStr
    role: str
    org_id: str
    created_at: datetime
    expires_at: datetime



# ── Request Models ───────────────────────────────────────────────────

class DomainSignals(BaseModel):
    hostname: str = Field(..., min_length=1, max_length=253)
    protocol: str = Field(default="https", max_length=10)
    isHTTPS: bool = False
    isIPBased: bool = False
    isPunycode: bool = False
    tld: str = Field(default="", max_length=20)
    isSuspiciousTLD: bool = False
    fullURL: Optional[str] = Field(default=None, max_length=2048)

    @field_validator("hostname")
    @classmethod
    def sanitize_hostname(cls, v: str) -> str:
        # Strip whitespace, lowercase, basic injection prevention
        v = v.strip().lower()
        if not re.match(r'^[a-z0-9\.\-\[\]:]+$', v) and not v.startswith("xn--"):
            # Allow punycode and standard hostnames only
            v = re.sub(r'[^a-z0-9\.\-\[\]:]', '', v)
        return v


class FormSignals(BaseModel):
    hasLoginForm: bool = False
    formCount: int = Field(default=0, ge=0, le=500)
    standalonePasswordFields: int = Field(default=0, ge=0)
    forms: Optional[List[dict]] = Field(default_factory=list)


class BehaviorSignals(BaseModel):
    externalFetchDetected: bool = False
    externalXHRDetected: bool = False
    suspiciousSubmissions: Optional[List[dict]] = Field(default_factory=list)


class MLBehaviorSignals(BaseModel):
    scriptCount: int = 0
    totalScriptSize: int = 0
    evalCount: int = 0
    largeHexCount: int = 0
    hasSuspiciousFunctions: bool = False


class InteractionSignals(BaseModel):
    inputCount: int = 0
    suspiciousHandlerCount: int = 0
    hasGlobalKeylogger: bool = False


class TrapSignals(BaseModel):
    hiddenFormCount: int = 0
    offscreenElementCount: int = 0


class NetworkRequest(BaseModel):
    id: str
    url: str
    method: str
    type: str
    timestamp: int
    headers: Optional[List[dict]] = Field(default_factory=list)
    responseHeaders: Optional[List[dict]] = Field(default_factory=list)
    statusCode: Optional[int] = None


class MetaInfo(BaseModel):
    extensionVersion: Optional[str] = None
    userAgent: Optional[str] = Field(default=None, max_length=512)
    user_email: Optional[str] = Field(default=None, max_length=254)


class AnalyzeRequest(BaseModel):
    timestamp: Optional[str] = None
    fullURL: Optional[str] = None
    domain: DomainSignals
    forms: Optional[FormSignals] = Field(default_factory=FormSignals)
    behavior: Optional[BehaviorSignals] = Field(default_factory=BehaviorSignals)
    ml_behavior: Optional[MLBehaviorSignals] = Field(default_factory=MLBehaviorSignals)
    interaction: Optional[InteractionSignals] = Field(default_factory=InteractionSignals)
    traps: Optional[TrapSignals] = Field(default_factory=TrapSignals)
    network_requests: Optional[List[NetworkRequest]] = Field(default_factory=list)
    meta: Optional[MetaInfo] = None
    org_id: Optional[str] = Field(None, description="Organization context for the scan")

    class Config:
        # Limit total request size via max content length in middleware
        json_schema_extra = {
            "example": {
                "domain": {
                    "hostname": "g00gle.com",
                    "protocol": "http",
                    "isHTTPS": False,
                    "isIPBased": False,
                    "isPunycode": False,
                    "tld": "com",
                    "isSuspiciousTLD": False,
                },
                "forms": {
                    "hasLoginForm": True,
                    "formCount": 1,
                },
                "behavior": {
                    "externalFetchDetected": True,
                },
            }
        }


class ReportRequest(BaseModel):
    domain: str = Field(..., min_length=1, max_length=253)
    reason: str = Field(..., min_length=1, max_length=1000)


class CorrectionRequest(BaseModel):
    domain: str
    actual_risk: str  # Safe / Dangerous
    analyst_notes: Optional[str] = None
    org_id: Optional[str] = None


# ── Response Models ──────────────────────────────────────────────────

class AnalyzeResponse(BaseModel):
    risk_score: float = Field(..., ge=0, le=100)
    risk_level: str = Field(...)  # Safe / Suspicious / Dangerous
    reasons: List[str] = Field(default_factory=list)
    confidence: float = 1.0
    engine_scores: Optional[dict] = None
    explainability: Optional[dict] = None
    security_score: Optional[float] = None
    security_findings: Optional[List[dict]] = Field(default_factory=list)
    source: Optional[str] = None
    intelligence_policy: Optional[dict] = None


class ReportResponse(BaseModel):
    status: str
    message: str

class FleetPolicy(BaseModel):
    org_id: str
    blocked_domains: List[str] = Field(default_factory=list)
    restricted_keywords: List[str] = Field(default_factory=list)
    dlp_rules: List[dict] = Field(default_factory=list) # e.g. {"pattern": "regex", "action": "block"}
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class PolicyUpdate(BaseModel):
    blocked_domains: Optional[List[str]] = None
    restricted_keywords: Optional[List[str]] = None
    dlp_rules: Optional[List[dict]] = None

class HeartbeatRequest(BaseModel):
    user_id: str
    extension_version: str
    tab_count: int
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ForensicHeader(BaseModel):
    version: str
    seq: int
    nonce: str
    timestamp: datetime
    installation_id: str
    id_tier: Optional[str] = "derived"   # enterprise_tpm | platform_keychain | derived
    prev_hash: str = "GENESIS"            # SHA-256 of previous envelope; "GENESIS" for seq==1
    genesis: bool = False                 # True only when seq == 1 and no prior chain exists
    hmac: str


class AnalyzeEnvelope(BaseModel):
    header: ForensicHeader
    payload: dict  # Raw dict — validated as AnalyzeRequest downstream


class NonceRecord(BaseModel):
    nonce: str
    installation_id: str
    received_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime


class ChainRecord(BaseModel):
    installation_id: str
    org_id: str
    seq: int
    nonce: str
    timestamp: datetime
    envelope_hash: str    # SHA-256(canonical_bytes ‖ hmac) — used as NEXT prev_hash
    stored_at: datetime = Field(default_factory=datetime.utcnow)


class IntegrityCheckResult(BaseModel):
    valid: bool
    violation_type: Optional[str] = None  # REPLAY | HMAC_MISMATCH | CHAIN_BROKEN | GAP_DETECTED | GENESIS_MISMATCH
    seq_gap: Optional[int] = None



class StatsResponse(BaseModel):
    total_scans: int
    scans_today: int
    risk_distribution: dict  # {"Safe": N, "Suspicious": N, "Dangerous": N}
    top_risky_domains: List[dict]
    recent_reports: int


class HealthResponse(BaseModel):
    status: str
    version: str
    database: str


# ── Organization & membership schemas ──────────────────────────────────────
class OrganizationCreate(BaseModel):
    name: str
    slug: str
    subscription_tier: str = "community"


class OrganizationResponse(BaseModel):
    id: str
    name: str
    slug: str
    subscription_tier: str
    created_at: Optional[datetime] = None


class InvitationCreate(BaseModel):
    email: str
    role: str = "member"


class InvitationResponse(BaseModel):
    id: str
    email: str
    role: str
    org_id: str
    token: str
    created_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None


class Member(BaseModel):
    user_id: str
    email: str
    role: str
    joined_at: Optional[datetime] = None
