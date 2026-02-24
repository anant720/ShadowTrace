"""
ShadowTrace — Persistence & Tamper Detection
Monitors extension health and warns admins of removal or immobilization.
"""

import logging
from fastapi import APIRouter, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone

from app.dependencies import get_database, get_current_org_id, get_current_admin
from app.models.schemas import HeartbeatRequest

logger = logging.getLogger("shadowtrace.routers.persistence")
router = APIRouter(prefix="/persistence", tags=["Persistence & Health"])

@router.post("/heartbeat")
async def record_heartbeat(
    request: HeartbeatRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
    org_id: str = Depends(get_current_org_id)
):
    """
    Record that the extension is alive and active for a user.
    """
    heartbeat_data = request.dict()
    heartbeat_data["org_id"] = org_id
    heartbeat_data["last_seen"] = datetime.now(timezone.utc)

    # Upsert health record
    await db.extension_health.update_one(
        {"user_id": request.user_id, "org_id": org_id},
        {"$set": heartbeat_data},
        upsert=True
    )
    
    return {"status": "ok", "message": "Heartbeat recorded"}

@router.get("/status")
async def get_fleet_health(
    db: AsyncIOMotorDatabase = Depends(get_database),
    org_id: str = Depends(get_current_org_id)
):
    """
    List all known users and their last heartbeat (Tamper Detection).
    """
    records = await db.extension_health.find({"org_id": org_id}).to_list(length=1000)
    
    health_summary = []
    now = datetime.now(timezone.utc)
    
    for r in records:
        delta = (now - r["last_seen"].replace(tzinfo=timezone.utc)).total_seconds()
        is_active = delta < 900 # 15 minutes
        
        health_summary.append({
            "user_id": r["user_id"],
            "status": "online" if is_active else "offline/tampered",
            "last_seen": r["last_seen"],
            "version": r.get("extension_version", "unknown")
        })
        
    return health_summary
