import bcrypt
import jwt
import os
import requests

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret")

def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()

def verify_password(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), h.encode())
    except Exception:
        return False

def create_token(payload: dict) -> str:
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def execute_code(code: str, language: str, stdin: str = ""):
    url = os.getenv("PISTON_URL", "http://localhost:2000/api/v2/execute")
    payload = {
        "language": language,
        "version": "*",
        "files": [{"content": code}],
        "stdin": stdin,
    }
    try:
        resp = requests.post(url, json=payload, timeout=int(os.getenv("PISTON_TIMEOUT", "20000")) / 1000.0)
        resp.raise_for_status()
        data = resp.json()
        return data.get("run", {})
    except Exception as e:
        return {"stdout": "", "stderr": str(e), "output": "", "code": 1}
