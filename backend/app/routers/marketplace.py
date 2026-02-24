"""
ShadowTrace — Intelligence Marketplace
PaaS infrastructure for 3rd party threat intelligence signals.
"""

import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

from app.dependencies import get_database, get_current_org_id

logger = logging.getLogger("shadowtrace.routers.marketplace")
router = APIRouter(prefix="/marketplace", tags=["Intelligence Marketplace"])

class SignalPack(BaseModel):
    id: str
    name: str
    provider: str
    description: str
    price_credits: int

@router.get("/packs", response_model=List[SignalPack])
async def list_available_packs(
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    List third-party signal packs available for subscription.
    """
    return [
        {
            "id": "pack_fin_01",
            "name": "Global Financial Fraud Feed",
            "provider": "FraudGuard AI",
            "description": "Premium DGA list focused on banking and crypto-exchange targets.",
            "price_credits": 500
        },
        {
            "id": "pack_gov_01",
            "name": "State-Sponsored IOC Pack",
            "provider": "ZeroDay Labs",
            "description": "High-fidelity indicators for known APT infrastructure.",
            "price_credits": 1200
        }
    ]

@router.post("/subscribe/{pack_id}")
async def subscribe_to_pack(
    pack_id: str,
    org_id: str = Depends(get_current_org_id),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Enable a third-party intelligence pack for the organization.
    """
    logger.info(f"[MARKETPLACE] Org {org_id} subscribed to pack {pack_id}")
    return {"status": "success", "message": f"Pack {pack_id} activated for your fleet."}
