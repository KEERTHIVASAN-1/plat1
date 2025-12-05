from fastapi import APIRouter
import httpx

from auth_routes import router as auth_router
from timer import router as timer_router
from anti_cheat import router as anti_router
from leaderboard import router as leaderboard_router
from admin_routes import router as admin_router

router = APIRouter()

@router.get("/health")
async def health():
    return {"ok": True}

@router.get("/health/piston")
async def piston_health():
    try:
        async with httpx.AsyncClient() as c:
            # IMPORTANT: inside Docker, piston host is "piston" NOT "localhost"
            r = await c.get("http://piston:2000/api/v2/runtimes")
            return {"piston": "ok", "languages": r.json()}
    except Exception as e:
        return {"piston": "down", "error": str(e)}

# Include all routers
router.include_router(auth_router)
router.include_router(timer_router)
router.include_router(anti_router)
router.include_router(leaderboard_router)
router.include_router(admin_router)
