"""
ShadowTrace — Retention Service
Prunes scan logs older than the org retention window (365 days for all orgs).
"""

import logging
import asyncio
from datetime import datetime, timedelta, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase

RETENTION_DAYS = 365  # All org users get 1-year retention

logger = logging.getLogger("shadowtrace.services.retention")

async def run_retention_policy(db: AsyncIOMotorDatabase):
    """Periodic task to delete logs older than RETENTION_DAYS for all orgs."""
    logger.info("Starting retention pruning cycle...")
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(days=RETENTION_DAYS)
        result = await db.scan_logs.delete_many({"timestamp": {"$lt": cutoff}})
        if result.deleted_count > 0:
            logger.info(f"Pruned {result.deleted_count} logs older than {RETENTION_DAYS} days")
    except Exception as e:
        logger.error(f"Retention policy failed: {e}")

async def retention_scheduler(db: AsyncIOMotorDatabase):
    """Runs the retention policy every 24 hours."""
    while True:
        await run_retention_policy(db)
        await asyncio.sleep(24 * 3600)
