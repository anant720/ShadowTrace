import logging
import certifi
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config import settings

logger = logging.getLogger("shadowtrace.database")

_client = None
_db = None

async def connect_db():
    global _client, _db
    _client = AsyncIOMotorClient(
        settings.MONGO_URI,
        maxPoolSize=10,
        minPoolSize=2,
        serverSelectionTimeoutMS=5000,
        tlsCAFile=certifi.where()
    )
    _db = _client[settings.MONGO_DB_NAME]
    try:
        await _client.admin.command("ping")
    except Exception as e:
        raise RuntimeError(f"Cannot connect to MongoDB: {e}") from e

    await _db.trusted_domains.create_index([("org_id", 1), ("domain", 1)], unique=True)
    await _db.malicious_domains.create_index([("org_id", 1), ("domain", 1)])
    await _db.reports.create_index([("org_id", 1), ("domain", 1)])
    await _db.reports.create_index([("org_id", 1), ("timestamp", -1)])
    
    await _db.scan_logs.create_index([("org_id", 1), ("domain", 1)])
    await _db.scan_logs.create_index([("org_id", 1), ("timestamp", -1)])
    await _db.scan_logs.create_index([("org_id", 1), ("domain", 1), ("timestamp", -1)])
    await _db.scan_logs.create_index([("org_id", 1), ("risk_level", 1), ("timestamp", -1)])
    await _db.scan_logs.create_index([("org_id", 1), ("final_risk_score", -1), ("timestamp", -1)])
    
    await _db.risk_history.create_index([("org_id", 1), ("domain", 1), ("timestamp", -1)])
    await _db.anomalies.create_index([("org_id", 1), ("detected_at", -1)])
    await _db.anomalies.create_index([("org_id", 1), ("acknowledged", 1), ("detected_at", -1)])
    
    await _db.organizations.create_index("slug", unique=True)
    await _db.admin_users.create_index("username", unique=True)
    await _db.admin_users.create_index("email", unique=True)
    await _db.admin_users.create_index("org_id")
    
    await _db.memberships.create_index([("user_id", 1), ("org_id", 1)], unique=True)
    await _db.memberships.create_index("user_id")
    
    await _db.invitations.create_index([("email", 1), ("org_id", 1)], unique=True)
    await _db.invitations.create_index("token", unique=True)

async def close_db():
    global _client, _db
    if _client:
        _client.close()
        _client = None
        _db = None

def get_db() -> AsyncIOMotorDatabase:
    if _db is None:
        raise RuntimeError("Database not initialized")
    return _db
