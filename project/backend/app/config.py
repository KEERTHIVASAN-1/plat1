import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.getenv("MONGO_URL")
DB_NAME = os.getenv("DB_NAME", "contestdb")
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret")
PISTON_URL = os.getenv("PISTON_URL", "http://localhost:2000/api/v2/execute")
PISTON_TIMEOUT_MS = int(os.getenv("PISTON_TIMEOUT_MS", "20000"))
_default_origins = "http://localhost:5173,http://127.0.0.1:5173"
CORS_ORIGINS = os.getenv("CORS_ORIGINS", _default_origins).split(",")
