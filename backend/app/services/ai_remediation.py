"""
ShadowTrace — AI Triage & Autonomous Remediation
Auto-blocks critical threats in fleet policies for all org users.
"""

import logging
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone

logger = logging.getLogger("shadowtrace.services.ai_remediation")

async def analyze_and_remediate(org_id: str, scan_result: dict, db: AsyncIOMotorDatabase):
    """
    Evaluates a scan result and updates fleet policies automatically if risk is critical.
    Enabled for all organization users.
    """
    risk_score = scan_result.get("risk_score", 0)
    domain = scan_result.get("domain")

    if risk_score > 90:
        logger.warning(f"[AI TRIAGE] High-criticality threat: {domain}. Initiating auto-remediation.")
        current_policy = await db.fleet_policies.find_one({"org_id": org_id})
        blocked = current_policy.get("blocked_domains", []) if current_policy else []

        if domain not in blocked:
            blocked.append(domain)
            await db.fleet_policies.update_one(
                {"org_id": org_id},
                {"$set": {"blocked_domains": blocked, "updated_at": datetime.now(timezone.utc)}},
                upsert=True
            )
            logger.info(f"[AI TRIAGE] Domain {domain} auto-blocked for Org {org_id}.")

    elif risk_score > 75:
        logger.info(f"[AI TRIAGE] Moderate threat detected ({domain}). Monitoring for repeat patterns.")
