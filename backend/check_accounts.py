import asyncio, os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
load_dotenv(".env")

async def check():
    c = AsyncIOMotorClient(os.getenv("MONGO_URI"))
    db = c[os.getenv("MONGO_DB_NAME", "shadowtrace")]
    for email in ["pro@shadowtrace.test", "guardian@shadowtrace.test"]:
        u = await db.admin_users.find_one({"email": email})
        if u:
            print(f"{email}:")
            print(f"  username:           {u.get('username')}")
            print(f"  has password_hash:  {'password_hash' in u}")
            print(f"  has hashed_password:{'hashed_password' in u}")
    c.close()

asyncio.run(check())
