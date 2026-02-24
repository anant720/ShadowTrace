"""
ShadowTrace — Adversarial Simulation Engine
Automated phishing simulation and security training for employees.
"""

import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

from app.dependencies import get_database, get_current_org_id, require_admin

logger = logging.getLogger("shadowtrace.routers.simulation")
router = APIRouter(prefix="/simulation", tags=["Security Training"])

class CampaignCreate(BaseModel):
    name: str
    target_group: str
    template_type: str # "credential_harvest", "malware_delivery", "oauth_consent"
    scheduled_for: str

@router.post("/campaigns")
async def create_simulation_campaign(
    campaign: CampaignCreate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    org_id: str = Depends(get_current_org_id),
    admin = Depends(require_admin)
):
    """
    Create a phishing simulation campaign based on real threats detected by ShadowTrace.
    """
    logger.info(f"[SIMULATION] Starting training campaign '{campaign.name}' for Org {org_id}")
    return {"status": "success", "campaign_id": "sim_" + org_id[:4]}

@router.get("/results/{campaign_id}")
async def get_simulation_results(campaign_id: str):
    return {
        "campaign_id": campaign_id,
        "metrics": {
            "click_rate": "12%",
            "report_rate": "8%",
            "compromise_rate": "2%"
        },
        "recommendation": "Deploy custom training module on DGA identification."
    }
