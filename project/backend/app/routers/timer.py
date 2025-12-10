from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
from typing import Optional

from ..db import db

router = APIRouter(prefix="/api/timer", tags=["timer"])


def default_round(round_id: str):
    return {
        "id": round_id,
        "startTime": None,
        "endTime": None,
        "status": "scheduled",
        "isLocked": True,
        "duration": 0,
        "elapsed": 0,
        "scheduledStart": None,
    }


@router.get("/window")
async def get_window(roundId: str):
    """
    Mirror the legacy /timer/window endpoint so the frontend can
    always obtain timing metadata, even if the round document has
    not been created yet.
    """
    if not db:
        return default_round(roundId)

    doc = await db.rounds.find_one({"id": roundId}, {"_id": 0})
    if not doc:
        return default_round(roundId)

    return {
        "id": doc.get("id", roundId),
        "startTime": doc.get("startTime"),
        "endTime": doc.get("endTime"),
        "status": doc.get("status", "scheduled"),
        "isLocked": doc.get("isLocked", False),
        "duration": doc.get("duration", 0),
        "elapsed": doc.get("elapsed", 0),
        "scheduledStart": doc.get("scheduledStart"),
    }


@router.post("/configure")
async def configure(roundId: str, duration: Optional[int] = None, scheduledStart: Optional[str] = None):
    if not db:
        raise HTTPException(500, "Database not configured")
    doc = await db.rounds.find_one({"id": roundId}) or {"id": roundId}
    if duration is not None:
        doc["duration"] = int(duration)
    if scheduledStart is not None:
        # Expect ISO string; store as-is
        doc["scheduledStart"] = scheduledStart
    doc.setdefault("status", "scheduled")
    doc.setdefault("isLocked", True)
    doc.setdefault("elapsed", 0)
    await db.rounds.update_one({"id": roundId}, {"$set": doc}, upsert=True)
    return {"ok": True, **{k: doc.get(k) for k in ("id", "duration", "scheduledStart", "status")}}


@router.post("/start")
async def start(roundId: str):
    if not db:
        raise HTTPException(500, "Database not configured")
    now = datetime.now(timezone.utc).isoformat()
    doc = await db.rounds.find_one({"id": roundId}) or {"id": roundId}
    doc["startTime"] = now
    doc["status"] = "active"
    doc["isLocked"] = False
    doc["elapsed"] = 0
    await db.rounds.update_one({"id": roundId}, {"$set": doc}, upsert=True)
    return {"ok": True, "id": roundId, "status": "active", "startTime": now}


@router.post("/pause")
async def pause(roundId: str):
    if not db:
        raise HTTPException(500, "Database not configured")
    doc = await db.rounds.find_one({"id": roundId})
    if not doc:
        raise HTTPException(404, "Round not found")
    # compute elapsed until now
    elapsed = int(doc.get("elapsed", 0))
    start = doc.get("startTime")
    if start:
        try:
            start_dt = datetime.fromisoformat(start)
            now = datetime.now(timezone.utc)
            elapsed += int((now - start_dt).total_seconds())
        except Exception:
            pass
    doc["elapsed"] = elapsed
    doc["status"] = "paused"
    # keep startTime so we can show last start, but not used for time when paused
    await db.rounds.update_one({"id": roundId}, {"$set": doc}, upsert=True)
    return {"ok": True, "id": roundId, "status": "paused", "elapsed": elapsed}


@router.post("/restart")
async def restart(roundId: str):
    if not db:
        raise HTTPException(500, "Database not configured")
    now = datetime.now(timezone.utc).isoformat()
    doc = await db.rounds.find_one({"id": roundId}) or {"id": roundId}
    doc["startTime"] = now
    doc["status"] = "active"
    doc["isLocked"] = False
    doc["elapsed"] = 0
    await db.rounds.update_one({"id": roundId}, {"$set": doc}, upsert=True)
    return {"ok": True, "id": roundId, "status": "active", "startTime": now, "elapsed": 0}
