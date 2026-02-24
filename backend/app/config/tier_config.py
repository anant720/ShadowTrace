"""
ShadowTrace — Tier Configuration

Defines the limits and feature sets for each subscription tier.
"""

TIER_LIMITS = {
    "community": {
        "name": "Community",
        "price_per_month": 0,
        "scans_per_month": 100,
        "retention_days": 7,
        "max_members": 1,
        "features": {
            "ml_explainability": False,
            "forensic_reasoning": False,
            "shadowfeed_api": False,
            "dlp_exfiltration_blocking": False,
            "behavioral_fingerprinting": False
        }
    },
    "pro": {
        "name": "Professional",
        "price_per_month": 15,
        "scans_per_month": 5000,
        "retention_days": 90,
        "max_members": 10,
        "features": {
            "ml_explainability": False,
            "forensic_reasoning": True,
            "shadowfeed_api": False,
            "dlp_exfiltration_warning": True,
            "behavioral_fingerprinting": True
        }
    },
    "enterprise": {
        "name": "Enterprise",
        "price_per_month": 8,  # $5-8 per seat
        "scans_per_month": -1,  # Unlimited
        "retention_days": 365,
        "max_members": -1, # Unlimited
        "features": {
            "ml_explainability": True,
            "forensic_reasoning": True,
            "shadowfeed_api": True,
            "dlp_exfiltration_blocking": True,
            "behavioral_fingerprinting": True,
            "advanced_forensics": True,
            "saml_sso": True
        }
    },
    "guardian": {
        "name": "Enterprise+ (Guardian)",
        "price_per_month": 50, # $25-50 per seat
        "scans_per_month": -1,
        "retention_days": -1, # Permanent
        "max_members": -1,
        "features": {
            "ml_explainability": True,
            "forensic_reasoning": True,
            "shadowfeed_api": True,
            "dlp_exfiltration_blocking": True,
            "behavioral_fingerprinting": True,
            "advanced_forensics": True,
            "saml_sso": True,
            "fleet_policy_engine": True,
            "autonomous_remediation": True,
            "siem_connectors": True,
            "white_labeling": True,
            "marketplace_access": True,
            "priority_support": True
        }
    }
}

def get_tier_config(tier: str) -> dict:
    return TIER_LIMITS.get(tier.lower(), TIER_LIMITS["community"])
