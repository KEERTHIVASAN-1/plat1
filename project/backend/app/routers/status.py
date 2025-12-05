# routers/status.py
from fastapi import APIRouter
from datetime import datetime, timezone

router = APIRouter(prefix="/api/status", tags=["status"])

@router.get("/")
async def health():
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}
