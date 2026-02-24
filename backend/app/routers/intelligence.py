"""
ShadowTrace — Intelligence Feed Router
Provides high-fidelity threat signals for enterprise SIEM integration.
"""

import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from app.dependencies import get_database, get_current_org_id, require_admin
from app.config.tier_config import get_tier_config

logger = logging.getLogger("shadowtrace.routers.intelligence")
router = APIRouter(prefix="/intelligence", tags=["Intelligence Feed"])

@router.get("/shadowfeed", summary="Get real-time threat intelligence feed")
async def get_shadowfeed(
    db: AsyncIOMotorDatabase = Depends(get_database),
    org_id: str = Depends(get_current_org_id),
    limit: int = 50
):
    """
    Enterprise-only endpoint providing high-fidelity DGA and JS-obfuscated threat signals.
    """
    if org_id == "community":
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED, 
            detail="ShadowFeed API requires an Enterprise subscription."
        )

    # Verify tier
    org = await db.organizations.find_one({"_id": ObjectId(org_id)})
    tier = org.get("subscription_tier", "community") if org else "community"
    tier_config = get_tier_config(tier)
    
    if not tier_config["features"].get("shadowfeed_api"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="ShadowFeed API access is not included in your current tier."
        )

    # Fetch high-confidence threats (Entropy > 4.5 or High Risk Score)
    query = {
        "org_id": org_id,
        "$or": [
            {"final_risk_score": {"$gt": 80}},
            {"explainability.top_indicators.shannon_entropy": {"$gt": 4.5}}
        ]
    }
    
    threats = await db.scan_logs.find(query).sort("timestamp", -1).to_list(length=limit)
    
    # Sanitize for external feed
    sanitized_threats = []
    for t in threats:
        sanitized_threats.append({
            "domain": t.get("domain"),
            "risk_score": t.get("final_risk_score"),
            "risk_level": t.get("risk_level"),
            "indicators": t.get("explainability", {}).get("top_indicators"),
            "timestamp": t.get("timestamp")
        })
        
    return {
        "status": "success",
        "count": len(sanitized_threats),
        "data": sanitized_threats
    }
