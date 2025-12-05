from fastapi import APIRouter, HTTPException, Header
from typing import Optional
from pydantic import BaseModel
from database import db
from utils import hash_password, verify_password, create_token

router = APIRouter(prefix="/auth")

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/register")
def register(payload: Optional[RegisterRequest] = None, name: Optional[str] = None, email: Optional[str] = None, password: Optional[str] = None):
    if payload:
        name = payload.name
        email = payload.email
        password = payload.password
    if db.users.find_one({"email": email.lower()}):
        raise HTTPException(status_code=409, detail="Email already registered")
    import uuid
    uid = "u" + str(uuid.uuid4())
    user = {
        "id": uid,
        "name": name,
        "email": email.lower(),
        "password": hash_password(password),
        "role": "contestant",
        "round1Score": 0,
        "round2Score": 0,
    }
    db.users.insert_one(user)
    token = create_token({"id": uid, "role": "contestant"})
    sanitized = {k: v for k, v in user.items() if k not in ("password", "_id")}
    return {"access_token": token, "user": sanitized}

@router.post("/login")
def login(payload: Optional[LoginRequest] = None, email: Optional[str] = None, password: Optional[str] = None):
    try:
        if payload:
            email = payload.email
            password = payload.password
        if not email or not password:
            raise HTTPException(status_code=400, detail="Missing email or password")
        user = db.users.find_one({"email": email.lower()})
        if not user or not verify_password(password, user.get("password", "")):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        token = create_token({"id": user["id"], "role": user.get("role", "contestant")})
        sanitized = {k: v for k, v in user.items() if k not in ("password", "_id")}
        return {"access_token": token, "user": sanitized}
    except HTTPException:
        raise
    except Exception as e:
        # avoid 500s leaking, return consistent 401 for client
        raise HTTPException(status_code=401, detail="Invalid credentials")

@router.get("/whoami")
def whoami(authorization: Optional[str] = Header(None)):
    import jwt, os
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret")
    if not authorization:
        return {"id": "anonymous"}
    token = authorization.replace("Bearer ", "")
    try:
        data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except Exception:
        raise HTTPException(status_code=401)
    u = db.users.find_one({"id": data.get("id")}, {"_id": 0, "password": 0})
    return u or {"id": data.get("id")}

@router.post("/admin/create")
def create_admin(name: str, email: str, password: str):
    if db.users.find_one({"email": email.lower()}):
        raise HTTPException(status_code=409)
    import uuid
    uid = "a" + str(uuid.uuid4())
    user = {
        "id": uid,
        "name": name,
        "email": email.lower(),
        "password": hash_password(password),
        "role": "admin",
        "round1Score": 0,
        "round2Score": 0,
    }
    db.users.insert_one(user)
    token = create_token({"id": uid, "role": "admin"})
    sanitized = {k: v for k, v in user.items() if k not in ("password", "_id")}
    return {"access_token": token, "user": sanitized}
