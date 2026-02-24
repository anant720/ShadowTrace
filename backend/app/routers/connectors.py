"""
ShadowTrace — SIEM/XDR Connector Registry
Infrastructure to pipe forensic telemetry to enterprise security stacks.
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field

from app.dependencies import get_database, get_current_org_id, require_admin

logger = logging.getLogger("shadowtrace.routers.connectors")
router = APIRouter(prefix="/connectors", tags=["SIEM/XDR Connectors"])

class ConnectorConfig(BaseModel):
    id: Optional[str] = None
    type: str # splunk, sentinel, crowdstrike, webhook
    enabled: bool = False
    config: dict = Field(default_factory=dict) # API Keys, Endpoints, etc.

@router.get("/")
async def list_connectors(
    db: AsyncIOMotorDatabase = Depends(get_database),
    org_id: str = Depends(get_current_org_id)
):
    """
    List configured SIEM/XDR connectors for the organization.
    """
    connectors = await db.connectors.find({"org_id": org_id}).to_list(length=100)
    return {"status": "success", "data": connectors}

@router.post("/")
async def create_connector(
    config: ConnectorConfig,
    db: AsyncIOMotorDatabase = Depends(get_database),
    org_id: str = Depends(get_current_org_id),
    admin = Depends(require_admin)
):
    """
    Provision a new SIEM/XDR connector (Enterprise+ only logic handled by middleware/tier-check).
    """
    # [TODO] Tier check for SIEM Connectors
    new_connector = config.dict()
    new_connector["org_id"] = org_id
    
    result = await db.connectors.insert_one(new_connector)
    return {"status": "success", "id": str(result.inserted_id)}

async def pipe_to_siem(org_id: str, event_data: dict, db: AsyncIOMotorDatabase):
    """
    Internal utility to ship events to active connectors.
    """
    active_connectors = await db.connectors.find({"org_id": org_id, "enabled": True}).to_list(length=10)
    for c in active_connectors:
        logger.info(f"Piping event for Org {org_id} to {c['type']} connector...")
        # [TODO] Implement actual vendor-specific payloads
