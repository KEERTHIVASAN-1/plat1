import bcrypt
import jwt
from fastapi import HTTPException, status, Header
from .models import UserOut
from .db import db
from .config import SECRET_KEY

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except Exception:
        return False

def create_token(payload: dict) -> str:
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

async def get_current_user(authorization: str = Header(None)) -> UserOut:
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Authorization header")
    token = authorization.replace("Bearer ", "")
    data = decode_token(token)
    uid = data.get("id")
    role = data.get("role")
    if role == "admin":
        return UserOut(id=uid or "admin-dev", name="Admin", email="admin@example.com", role="admin")
    u = await db.users.find_one({"id": uid})
    if not u:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return UserOut(
        id=u["id"], name=u["name"], email=u["email"], role=u["role"],
        round1Completed=u.get("round1Completed", False), round2Eligible=u.get("round2Eligible", False),
        round1Score=u.get("round1Score", 0), round2Score=u.get("round2Score", 0)
    )

def require_admin(user: UserOut):
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
