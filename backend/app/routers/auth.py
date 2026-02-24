from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from passlib.context import CryptContext
from app.dependencies import get_database, get_current_admin
from app.utils.jwt_handler import create_access_token
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class LoginRequest(BaseModel):
    username: str
    password: str

@router.post("/login")
async def login(request: LoginRequest, db = Depends(get_database)):
    user = await db.admin_users.find_one({"username": request.username})
    if not user or not pwd_context.verify(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    org_id = user.get("org_id")
    if not org_id:
        raise HTTPException(status_code=403, detail="Account is not assigned to an organization. Contact your administrator.")
    email = user.get("email") or f"{user.get('username','user')}@shadowtrace.local"
    token = create_access_token({
        "sub": user["username"],
        "email": email,
        "role": user["role"],
        "org_id": org_id
    })
    await db.admin_users.update_one({"_id": user["_id"]}, {"$set": {"last_login": datetime.now(timezone.utc)}})
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user["role"],
        "username": user["username"],
        "email": email,
        "org_id": org_id
    }

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_admin)):
    return {
        "username": current_user.get("sub"),
        "role": current_user.get("role"),
        "org_id": current_user.get("org_id")
    }
