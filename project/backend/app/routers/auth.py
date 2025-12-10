# routers/auth.py
from fastapi import APIRouter, HTTPException
from fastapi import status as http_status
from ..models import UserCreate, UserLogin, TokenResponse, UserOut
from ..db import db
from ..config import SECRET_KEY  # secret pulled via config import below
import bcrypt
import jwt
import uuid
from datetime import datetime, timezone

router = APIRouter(prefix="/api/auth", tags=["auth"])

def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()

def verify_password(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), h.encode())
    except Exception:
        return False

def create_token(payload: dict) -> str:
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

@router.post("/register", response_model=TokenResponse)
async def register(input: UserCreate):
    if not db:
        raise HTTPException(500, "Database not configured")
    existing = await db.users.find_one({"email": input.email.lower()})
    if existing:
        raise HTTPException(http_status.HTTP_400_BAD_REQUEST, "Email already registered")
    uid = str(uuid.uuid4())
    user = {
        "id": uid,
        "name": input.name,
        "email": input.email.lower(),
        "password": hash_password(input.password),
        "role": "contestant",
        "round1Completed": False,
        "round2Eligible": False,
        "round1Score": 0,
        "round2Score": 0,
        "createdAt": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    # create participant metadata
    await db.participants.insert_one({
        "id": uid,
        "name": input.name,
        "email": input.email.lower(),
        "round1Attendance": False,
        "round2Attendance": False,
        "round1TestcasesPassed": 0,
        "round1TotalTestcases": 0,
        "round2TestcasesPassed": 0,
        "round2TotalTestcases": 0,
        "round1Timestamp": None,
        "round2Timestamp": None,
        "round2Eligible": False,
    })
    token = create_token({"id": uid, "role": "contestant"})
    user_out = UserOut(id=uid, name=input.name, email=input.email.lower(), role="contestant")
    return TokenResponse(access_token=token, user=user_out)

@router.post("/login", response_model=TokenResponse)
async def login(input: UserLogin):
    if not db:
        raise HTTPException(500, "Database not configured")
    user = await db.users.find_one({"email": input.email.lower()})
    if not user or not verify_password(input.password, user["password"]):
        raise HTTPException(http_status.HTTP_401_UNAUTHORIZED, "Invalid credentials")
    token = create_token({"id": user["id"], "role": user.get("role", "contestant")})
    out = UserOut(
        id=user["id"],
        name=user.get("name"),
        email=user.get("email"),
        role=user.get("role", "contestant"),
        round1Completed=user.get("round1Completed", False),
        round2Eligible=user.get("round2Eligible", False),
        round1Score=user.get("round1Score", 0),
        round2Score=user.get("round2Score", 0),
    )
    return TokenResponse(access_token=token, user=out)
