from fastapi import APIRouter, HTTPException, Header
from fastapi import status as http_status
from backend.app.models import UserCreate, UserLogin, TokenResponse, UserOut
from backend.app.db import db
from backend.app.config import SECRET_KEY
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


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except Exception:
        raise HTTPException(status_code=http_status.HTTP_401_UNAUTHORIZED)


async def get_current_user(authorization: str = Header(None)) -> UserOut:
    if not authorization:
        raise HTTPException(
            status_code=http_status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
        )

    token = authorization.replace("Bearer ", "")
    data = decode_token(token)

    uid = data.get("id")
    role = data.get("role")

    if role == "admin":
        return UserOut(
            id=uid or "admin-dev",
            name="Admin",
            email="admin@example.com",
            role="admin",
        )

    if db is None:
        raise HTTPException(500, "Database not configured")

    u = await db.users.find_one({"id": uid})
    if u is None:
        raise HTTPException(
            status_code=http_status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return UserOut(
        id=u["id"],
        name=u.get("name"),
        email=u.get("email"),
        role=u.get("role", "contestant"),
        round1Completed=u.get("round1Completed", False),
        round2Eligible=u.get("round2Eligible", False),
        round1Score=u.get("round1Score", 0),
        round2Score=u.get("round2Score", 0),
    )


@router.post("/register", response_model=TokenResponse)
async def register(input: UserCreate):
    if db is None:
        raise HTTPException(500, "Database not configured")

    existing = await db.users.find_one({"email": input.email.lower()})
    if existing is not None:
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
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }

    await db.users.insert_one(user)

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
    out = UserOut(id=uid, name=input.name, email=input.email.lower(), role="contestant")
    return TokenResponse(access_token=token, user=out)


@router.post("/login", response_model=TokenResponse)
async def login(input: UserLogin):
    try:
        e = input.email.lower()

        # ---- hardcoded admin shortcut ----
        if e == "k32304983@gmail.com":
            if input.password != "chikko__7":
                raise HTTPException(http_status.HTTP_401_UNAUTHORIZED, "Invalid credentials")
            uid = "admin-dev"
            token = create_token({"id": uid, "role": "admin"})
            out = UserOut(id=uid, name="Admin", email=e, role="admin")
            return TokenResponse(access_token=token, user=out)

        # ---- dev fallback when DB is down ----
        if db is None:
            uid = "dev-user"
            role = "contestant"
            name = "Dev User"
            token = create_token({"id": uid, "role": role})
            out = UserOut(id=uid, name=name, email=e, role=role)
            return TokenResponse(access_token=token, user=out)

        # ---- special contestant shortcut ----
        if e == "keerthivasan.eg26@gmail.com":
            if input.password != "loveyoudi":
                raise HTTPException(http_status.HTTP_401_UNAUTHORIZED, "Invalid credentials")

            u = await db.users.find_one({"email": e})
            if u is None:
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
                id=u["id"],
                name=u.get("name", "Contestant"),
                email=e,
                role="contestant",
                round1Completed=u.get("round1Completed", False),
                round2Eligible=u.get("round2Eligible", False),
                round1Score=u.get("round1Score", 0),
                round2Score=u.get("round2Score", 0),
            )
            return TokenResponse(access_token=token, user=out)

        # ---- normal login flow ----
        participant = await db.participants.find_one({"email": e})
        if participant is None:
            pid = str(uuid.uuid4())
            participant = {
                "id": pid,
                "name": "Contestant",
                "email": e,
                "round1Attendance": False,
                "round2Attendance": False,
                "round1TestcasesPassed": 0,
                "round1TotalTestcases": 0,
                "round2TestcasesPassed": 0,
                "round2TotalTestcases": 0,
                "round1Timestamp": None,
                "round2Timestamp": None,
                "round2Eligible": False,
            }
            await db.participants.insert_one(participant)

        u = await db.users.find_one({"email": e})
        if u is None:
            uid = str(uuid.uuid4())
            u = {
                "id": uid,
                "name": participant.get("name", "Contestant"),
                "email": e,
                "role": "contestant",
                "round1Score": participant.get("round1TestcasesPassed", 0),
                "round2Score": participant.get("round2TestcasesPassed", 0),
            }
            await db.users.insert_one(u)

        token = create_token({"id": u["id"], "role": u.get("role", "contestant")})
        out = UserOut(
            id=u["id"],
            name=u.get("name"),
            email=e,
            role=u.get("role", "contestant"),
            round1Completed=u.get("round1Completed", False),
            round2Eligible=u.get("round2Eligible", False),
            round1Score=u.get("round1Score", 0),
            round2Score=u.get("round2Score", 0),
        )
        return TokenResponse(access_token=token, user=out)

    except Exception:
        uid = "dev-user"
        token = create_token({"id": uid, "role": "contestant"})
        out = UserOut(id=uid, name="Dev User", email=input.email.lower(), role="contestant")
        return TokenResponse(access_token=token, user=out)
