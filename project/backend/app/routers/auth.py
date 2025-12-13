from fastapi import APIRouter, HTTPException, Header
from fastapi import status as http_status
from backend.app.models import UserLogin, TokenResponse, UserOut
from backend.app.db import db
from backend.app.config import SECRET_KEY
import jwt

router = APIRouter(prefix="/api/auth", tags=["auth"])

# -------------------------------------------------
# TOKEN HELPERS
# -------------------------------------------------

def create_token(payload: dict) -> str:
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except Exception:
        raise HTTPException(
            status_code=http_status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

# -------------------------------------------------
# CURRENT USER
# -------------------------------------------------

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
            id="admin-dev",
            name="Admin",
            email="admin@example.com",
            role="admin",
        )

    user = await db.users.find_one({"id": uid})
    if not user:
        raise HTTPException(
            status_code=http_status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return UserOut(
        id=user["id"],
        name=user.get("name"),
        email=user.get("email"),
        role=user.get("role", "contestant"),
        round1Score=user.get("round1Score", 0),
        round2Score=user.get("round2Score", 0),
    )

# -------------------------------------------------
# ---------------- LOGIN ----------------

@router.post("/login", response_model=TokenResponse)
async def login(input: UserLogin):
    if db is None:
        raise HTTPException(500, "Database not configured")

    email = input.email.lower().strip()
    name = input.name.strip().lower()

    # -------- ADMIN --------
    if email == "k32304983@gmail.com":
        token = create_token({"id": "admin-dev", "role": "admin"})
        return TokenResponse(
            access_token=token,
            user=UserOut(
                id="admin-dev",
                name="Admin",
                email=email,
                role="admin",
            ),
        )

    # -------- PARTICIPANT CHECK (NAME + EMAIL) --------
    participant = await db.participants.find_one({
        "email": email,
        "name": {"$regex": f"^{name}$", "$options": "i"},
    })

    if not participant:
        raise HTTPException(
            status_code=http_status.HTTP_401_UNAUTHORIZED,
            detail="Name and email do not match our records",
        )

    uid = participant["id"]

    # -------- ENSURE USER EXISTS --------
    user = await db.users.find_one({"id": uid})
    if not user:
        user = {
            "id": uid,
            "name": participant["name"],
            "email": email,
            "role": "contestant",
            "round1Score": 0,
            "round2Score": 0,
        }
        await db.users.insert_one(user)

    # -------- ISSUE TOKEN --------
    token = create_token({"id": uid, "role": "contestant"})

    return TokenResponse(
        access_token=token,
        user=UserOut(
            id=uid,
            name=user["name"],
            email=email,
            role="contestant",
            round1Score=user.get("round1Score", 0),
            round2Score=user.get("round2Score", 0),
        ),
    )