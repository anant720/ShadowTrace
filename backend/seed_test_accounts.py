"""
ShadowTrace — Test Account Seeder
Creates 2 test org accounts directly in MongoDB:
  1. Pro Plan    → $15/mo  → pro@shadowtrace.test   / TestPro2025!
  2. Guardian    → $199/mo → guardian@shadowtrace.test / TestGuardian2025!
"""

import asyncio
import os
import sys
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from bson import ObjectId

# ── Load .env ────────────────────────────────────────────────────────
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

MONGO_URI    = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB     = os.getenv("MONGO_DB_NAME", "shadowtrace")

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── Account definitions ──────────────────────────────────────────────
ACCOUNTS = [
    {
        "org_name":  "Pro Test Org",
        "org_slug":  "pro-test",
        "tier":      "pro",
        "price_label": "$15/mo",
        "email":     "pro@shadowtrace.test",
        "password":  "TestPro2025!",
        "role":      "admin",
    },
    {
        "org_name":  "Guardian Test Org",
        "org_slug":  "guardian-test",
        "tier":      "guardian",
        "price_label": "$199/mo",
        "email":     "guardian@shadowtrace.test",
        "password":  "TestGuardian2025!",
        "role":      "admin",
    },
]

async def seed():
    client = AsyncIOMotorClient(MONGO_URI)
    db     = client[MONGO_DB]
    now    = datetime.now(timezone.utc)

    for acc in ACCOUNTS:
        # ── 1. Upsert organisation ───────────────────────────────────
        existing_org = await db.organizations.find_one({"slug": acc["org_slug"]})
        if existing_org:
            org_id = str(existing_org["_id"])
            print(f"[SKIP] Org '{acc['org_name']}' already exists → {org_id}")
        else:
            org_doc = {
                "name": acc["org_name"],
                "slug": acc["org_slug"],
                "subscription_tier": acc["tier"],
                "integrity_secret": f"shadowtrace_{acc['org_slug']}_integrity_key_2025",
                "created_at": now,
                "updated_at": now,
                "seats": -1,
                "active": True,
            }
            result = await db.organizations.insert_one(org_doc)
            org_id = str(result.inserted_id)
            print(f"[OK]   Created org '{acc['org_name']}' ({acc['price_label']}) → {org_id}")

        # ── 2. Upsert admin user ─────────────────────────────────────
        existing_user = await db.admin_users.find_one({"email": acc["email"]})
        if existing_user:
            # Patch: ensure password_hash field exists (old docs used hashed_password)
            if "password_hash" not in existing_user:
                new_hash = pwd_ctx.hash(acc["password"])
                await db.admin_users.update_one(
                    {"email": acc["email"]},
                    {"$set": {"password_hash": new_hash}, "$unset": {"hashed_password": ""}}
                )
                print(f"[FIX]  Patched password_hash for '{acc['email']}'")
            else:
                print(f"[SKIP] User '{acc['email']}' already exists and is correct")
        else:
            user_doc = {
                "email":         acc["email"],
                "username":      acc["email"].split("@")[0],  # login username
                "password_hash": pwd_ctx.hash(acc["password"]),  # field auth.py expects
                "role":          acc["role"],
                "org_id":        org_id,
                "is_active":     True,
                "created_at":    now,
            }
            await db.admin_users.insert_one(user_doc)
            print(f"[OK]   Created user '{acc['email']}' / '{acc['password']}'")

        print()

    print("=" * 55)
    print("Test accounts ready:")
    for acc in ACCOUNTS:
        print(f"  Tier: {acc['tier']:10s} ({acc['price_label']})")
        print(f"  Email:    {acc['email']}")
        print(f"  Password: {acc['password']}")
        print()

    client.close()

if __name__ == "__main__":
    asyncio.run(seed())
