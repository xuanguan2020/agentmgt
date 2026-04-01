from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime, timedelta
import hashlib
import secrets

router = APIRouter(prefix="/api/auth", tags=["auth"])

DEMO_USERS = {
    "admin": {
        "password": "admin123",
        "email": "admin@agentmgt.local",
        "role": "admin",
        "id": "user_admin_001"
    },
    "user": {
        "password": "user123",
        "email": "user@agentmgt.local",
        "role": "user",
        "id": "user_002"
    }
}

SIMULATED_TOKENS = {}


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    token: str
    user: dict


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    user_data = DEMO_USERS.get(request.username)
    
    if not user_data:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    if request.password != user_data["password"]:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    token = secrets.token_urlsafe(32)
    SIMULATED_TOKENS[token] = {
        "username": request.username,
        "user_id": user_data["id"],
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    
    return TokenResponse(
        token=token,
        user={
            "id": user_data["id"],
            "username": request.username,
            "email": user_data["email"],
            "role": user_data["role"]
        }
    )


@router.post("/logout")
async def logout():
    return {"status": "ok", "message": "Logged out successfully"}


@router.get("/me")
async def get_current_user(token: str):
    token_data = SIMULATED_TOKENS.get(token)
    
    if not token_data:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    if token_data["exp"] < datetime.utcnow():
        del SIMULATED_TOKENS[token]
        raise HTTPException(status_code=401, detail="Token expired")
    
    username = token_data["username"]
    user_data = DEMO_USERS.get(username)
    
    return {
        "id": user_data["id"],
        "username": username,
        "email": user_data["email"],
        "role": user_data["role"]
    }
