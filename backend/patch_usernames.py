import asyncio, os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
load_dotenv(".env")

PATCHES = [
    {"email": "pro@shadowtrace.test",      "username": "pro"},
    {"email": "guardian@shadowtrace.test", "username": "guardian"},
]

async def patch():
    c = AsyncIOMotorClient(os.getenv("MONGO_URI"))
    db = c[os.getenv("MONGO_DB_NAME", "shadowtrace")]
    for p in PATCHES:
        result = await db.admin_users.update_one(
            {"email": p["email"]},
            {"$set": {"username": p["username"]}}
        )
        print(f"[OK] Set username='{p['username']}' for {p['email']} (matched={result.matched_count})")
    c.close()

asyncio.run(patch())
