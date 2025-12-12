import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load .env file
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# FastAPI app
app = FastAPI(title="Contest Backend")

# CORS
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------
# Import Routers (backend.app)
# --------------------------
from backend.app.routers.status import router as api_status_router
from backend.app.routers.auth import router as api_auth_router
from backend.app.routers.contest import router as api_contest_router
from backend.app.routers.admin import router as api_admin_router
from backend.app.routers.timer import router as api_timer_router
from backend.app.routers.problems import router as api_problems_router
from backend.app.routers.compat import router as api_compat_router

app.include_router(api_status_router)
app.include_router(api_auth_router)
app.include_router(api_contest_router)
app.include_router(api_admin_router)
app.include_router(api_timer_router)
app.include_router(api_problems_router)
app.include_router(api_compat_router)


# --------------------------
# Seed Users
# --------------------------
try:
    from seed_users import seed as seed_users
    seed_users()
except Exception as _e:
    print(">>> Seed users init error:", _e)

@app.get("/health")
def health():
    return {"ok": True}

@app.get("/")
def root():
    return {"status": "ok"}
