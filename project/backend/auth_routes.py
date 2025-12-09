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
        # normalize
        email = (email or "").strip()
        password = (password or "").strip()
        if not email or not password:
            raise HTTPException(status_code=400, detail="Missing email or password")

        e = email.lower()

        # Admin-only login
        if e == "k32304983@gmail.com":
            if password != "chikko__7":
                raise HTTPException(status_code=401, detail="Invalid credentials")
            admin = db.users.find_one({"email": e})
            if not admin:
                import uuid
                uid = "a" + str(uuid.uuid4())
                admin = {
                    "id": uid,
                    "name": "Admin",
                    "email": e,
                    "role": "admin",
                    "round1Score": 0,
                    "round2Score": 0,
                }
                db.users.insert_one(admin)
            token = create_token({"id": admin["id"], "role": "admin"})
            sanitized = {k: v for k, v in admin.items() if k not in ("password", "_id")}
            return {"access_token": token, "user": sanitized}

        # Special contestant fallback
        if e == "keerthivasan.eg26@gmail.com":
            if password != "loveyoudi":
                raise HTTPException(status_code=401, detail="Invalid credentials")
            u = db.users.find_one({"email": e})
            if not u:
                import uuid
                uid = "u" + str(uuid.uuid4())
                u = {
                    "id": uid,
                    "name": "Contestant",
                    "email": e,
                    "role": "contestant",
                    "round1Score": 0,
                    "round2Score": 0,
                }
                db.users.insert_one(u)
            token = create_token({"id": u["id"], "role": "contestant"})
            sanitized = {k: v for k, v in u.items() if k not in ("password", "_id")}
            return {"access_token": token, "user": sanitized}

        # Participants-gated login
        participant = db.participants.find_one({"email": e})
        if not participant:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        ppass = participant.get("password")
        if not ppass or (ppass.strip() != password):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        u = db.users.find_one({"email": e})
        if not u:
            import uuid
            uid = "u" + str(uuid.uuid4())
            u = {
                "id": uid,
                "name": participant.get("name") or "Contestant",
                "email": e,
                "role": "contestant",
                "round1Score": participant.get("round1TestcasesPassed", 0),
                "round2Score": participant.get("round2TestcasesPassed", 0),
            }
            db.users.insert_one(u)
        token = create_token({"id": u["id"], "role": "contestant"})
        sanitized = {k: v for k, v in u.items() if k not in ("password", "_id")}
        return {"access_token": token, "user": sanitized}
    except HTTPException:
        raise
    except Exception:
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
