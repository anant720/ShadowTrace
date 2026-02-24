"""
ShadowTrace — Intelligence Feed Router
High-fidelity threat signals for org SIEM integration.
All org users have full ShadowFeed access.
"""

import logging
from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from app.dependencies import get_database, get_current_org_id

logger = logging.getLogger("shadowtrace.routers.intelligence")
router = APIRouter(prefix="/intelligence", tags=["Intelligence Feed"])

@router.get("/shadowfeed", summary="Get real-time threat intelligence feed")
async def get_shadowfeed(
    db: AsyncIOMotorDatabase = Depends(get_database),
    org_id: str = Depends(get_current_org_id),
    limit: int = 50
):
    """High-fidelity threat feed for org users — scoped to the requesting org."""
    query = {
        "org_id": org_id,
        "$or": [
            {"final_risk_score": {"$gt": 80}},
            {"explainability.top_indicators.shannon_entropy": {"$gt": 4.5}}
        ]
    }
    threats = await db.scan_logs.find(query).sort("timestamp", -1).to_list(length=limit)

    sanitized = [
        {
            "domain": t.get("domain"),
            "risk_score": t.get("final_risk_score"),
            "risk_level": t.get("risk_level"),
            "indicators": t.get("explainability", {}).get("top_indicators"),
            "timestamp": t.get("timestamp")
        }
        for t in threats
    ]

    return {"status": "success", "count": len(sanitized), "data": sanitized}
