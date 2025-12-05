import os
import jwt
from fastapi import Header, HTTPException
from models import UserOut
from database import db

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret")

def get_current_user(authorization: str | None = Header(None)) -> UserOut:
    if not authorization:
        return UserOut(id="anonymous")
    token = authorization.replace("Bearer ", "")
    try:
        data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except Exception:
        raise HTTPException(status_code=401)
    uid = data.get("id")
    user = db.users.find_one({"id": uid})
    if not user:
        return UserOut(id=uid)
    return UserOut(
        id=user.get("id"),
        name=user.get("name"),
        email=user.get("email"),
        role=user.get("role"),
        round1Score=user.get("round1Score", 0),
        round2Score=user.get("round2Score", 0),
    )
