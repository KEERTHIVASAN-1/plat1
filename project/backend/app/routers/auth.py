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
    e = input.email.lower()

    # Admin-only login
    if e == "k32304983@gmail.com":
        if input.password != "chikko__7":
            raise HTTPException(http_status.HTTP_401_UNAUTHORIZED, "Invalid credentials")
        admin = await db.users.find_one({"email": e})
        if not admin:
            uid = str(uuid.uuid4())
            admin = {
                "id": uid,
                "name": "Admin",
                "email": e,
                "role": "admin",
                "round1Score": 0,
                "round2Score": 0,
            }
            await db.users.insert_one(admin)
        token = create_token({"id": admin["id"], "role": "admin"})
        out = UserOut(
            id=admin["id"], name=admin.get("name", "Admin"), email=e, role="admin",
            round1Completed=admin.get("round1Completed", False), round2Eligible=True,
            round1Score=admin.get("round1Score", 0), round2Score=admin.get("round2Score", 0)
        )
        return TokenResponse(access_token=token, user=out)

    # Special contestant fallback
    if e == "keerthivasan.eg26@gmail.com":
        if input.password != "loveyoudi":
            raise HTTPException(http_status.HTTP_401_UNAUTHORIZED, "Invalid credentials")
        u = await db.users.find_one({"email": e})
        if not u:
            uid = str(uuid.uuid4())
            u = {
                "id": uid,
                "name": "Contestant",
                "email": e,
                "role": "contestant",
                "round1Score": 0,
                "round2Score": 0,
            }
            await db.users.insert_one(u)
        token = create_token({"id": u["id"], "role": "contestant"})
        out = UserOut(
            id=u["id"], name=u.get("name", "Contestant"), email=e, role="contestant",
            round1Completed=u.get("round1Completed", False), round2Eligible=u.get("round2Eligible", False),
            round1Score=u.get("round1Score", 0), round2Score=u.get("round2Score", 0)
        )
        return TokenResponse(access_token=token, user=out)

    # Participants-gated login
    participant = await db.participants.find_one({"email": e})
    if not participant:
        raise HTTPException(http_status.HTTP_401_UNAUTHORIZED, "Invalid credentials")
    ppass = participant.get("password")
    if not ppass or ppass != input.password:
        raise HTTPException(http_status.HTTP_401_UNAUTHORIZED, "Invalid credentials")

    u = await db.users.find_one({"email": e})
    if not u:
        uid = str(uuid.uuid4())
        u = {
            "id": uid,
            "name": participant.get("name") or "Contestant",
            "email": e,
            "role": "contestant",
            "round1Score": participant.get("round1TestcasesPassed", 0),
            "round2Score": participant.get("round2TestcasesPassed", 0),
        }
        await db.users.insert_one(u)
    token = create_token({"id": u["id"], "role": u.get("role", "contestant")})
    out = UserOut(
        id=u["id"], name=u.get("name"), email=e, role=u.get("role", "contestant"),
        round1Completed=u.get("round1Completed", False), round2Eligible=u.get("round2Eligible", False),
        round1Score=u.get("round1Score", 0), round2Score=u.get("round2Score", 0)
    )
    return TokenResponse(access_token=token, user=out)
