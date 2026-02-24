"""
ShadowTrace — Fleet Policy Router
Handles centralized security policy distribution for enterprise fleets.
"""

import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from datetime import datetime, timezone

from app.dependencies import get_database, get_current_org_id, require_admin
from app.models.schemas import FleetPolicy, PolicyUpdate
from app.config.tier_config import get_tier_config

logger = logging.getLogger("shadowtrace.routers.policies")
router = APIRouter(prefix="/policies", tags=["Fleet Policies"])

@router.get("/", response_model=FleetPolicy)
async def get_org_policy(
    db: AsyncIOMotorDatabase = Depends(get_database),
    org_id: str = Depends(get_current_org_id)
):
    """
    Retrieve the active security policy for the current organization.
    """
    policy = await db.fleet_policies.find_one({"org_id": org_id})
    if not policy:
        # Create default policy
        policy = {
            "org_id": org_id,
            "blocked_domains": [],
            "restricted_keywords": [],
            "dlp_rules": [],
            "updated_at": datetime.now(timezone.utc)
        }
        await db.fleet_policies.insert_one(policy)
        
    return policy

@router.patch("/", response_model=FleetPolicy)
async def update_org_policy(
    update: PolicyUpdate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    org_id: str = Depends(get_current_org_id),
    admin = Depends(require_admin)
):
    """
    Update the security policy (Enterprise/Guardian only).
    """
    # Verify tier
    org = await db.organizations.find_one({"_id": ObjectId(org_id)})
    tier = org.get("subscription_tier", "community") if org else "community"
    tier_config = get_tier_config(tier)
    
    if not tier_config["features"].get("fleet_policy_engine"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Fleet Policy Engine is an Enterprise+ (Guardian) feature."
        )

    update_data = {k: v for k, v in update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)

    await db.fleet_policies.update_one(
        {"org_id": org_id},
        {"$set": update_data},
        upsert=True
    )
    
    return await db.fleet_policies.find_one({"org_id": org_id})

@router.get("/sync")
async def sync_policy_for_extension(
    db: AsyncIOMotorDatabase = Depends(get_database),
    org_id: str = Depends(get_current_org_id)
):
    """
    Lightweight endpoint for extension background scripts to poll for policy updates.
    """
    policy = await db.fleet_policies.find_one({"org_id": org_id})
    if not policy:
        return {"policy_id": "default", "dlp_rules": [], "blocked_domains": []}
        
    return {
        "policy_id": str(policy["_id"]),
        "blocked_domains": policy.get("blocked_domains", []),
        "dlp_rules": policy.get("dlp_rules", []),
        "updated_at": policy.get("updated_at")
    }
