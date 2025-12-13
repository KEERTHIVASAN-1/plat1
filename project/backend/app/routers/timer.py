from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
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


# in-memory fallback when DB is unavailable
MEM_ROUNDS: dict[str, dict] = {}


def mem_get(round_id: str) -> dict:
    if round_id not in MEM_ROUNDS:
        MEM_ROUNDS[round_id] = default_round(round_id)
    return MEM_ROUNDS[round_id]


@router.get("/window")
async def get_window(roundId: str):
    try:
        if db is None:
            return mem_get(roundId)

        doc = await db.rounds.find_one({"id": roundId}, {"_id": 0})
        if doc is None:
            return mem_get(roundId)

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
    except Exception:
        return mem_get(roundId)


@router.post("/configure")
async def configure(roundId: str, duration: Optional[int] = None, scheduledStart: Optional[str] = None):
    try:
        if db is None:
            doc = mem_get(roundId)
        else:
            doc = await db.rounds.find_one({"id": roundId}) or {"id": roundId}

        if duration is not None:
            doc["duration"] = int(duration)
        if scheduledStart is not None:
            doc["scheduledStart"] = scheduledStart

        doc.setdefault("status", "scheduled")
        doc.setdefault("isLocked", True)
        doc.setdefault("elapsed", 0)

        if db is not None:
            await db.rounds.update_one({"id": roundId}, {"$set": doc}, upsert=True)

        return JSONResponse(
            {"ok": True, **{k: doc.get(k) for k in ("id", "duration", "scheduledStart", "status")}},
            status_code=200,
        )
    except Exception:
        d = mem_get(roundId)
        if duration is not None:
            d["duration"] = int(duration)
        if scheduledStart is not None:
            d["scheduledStart"] = scheduledStart
        d.setdefault("status", "scheduled")
        d.setdefault("isLocked", True)
        d.setdefault("elapsed", 0)
        return JSONResponse(
            {"ok": True, **{k: d.get(k) for k in ("id", "duration", "scheduledStart", "status")}},
            status_code=200,
        )


@router.post("/start")
async def start(roundId: str, durationSeconds: Optional[int] = None):
    now = datetime.now(timezone.utc).isoformat()
    try:
        if db is None:
            doc = mem_get(roundId)
        else:
            doc = await db.rounds.find_one({"id": roundId}) or {"id": roundId}

        doc["startTime"] = now
        doc["status"] = "active"
        doc["isLocked"] = False
        doc["elapsed"] = 0

        if durationSeconds is not None:
            doc["duration"] = int(durationSeconds)

        if db is not None:
            await db.rounds.update_one({"id": roundId}, {"$set": doc}, upsert=True)

        return JSONResponse({"ok": True, "id": roundId, "status": "active", "startTime": now}, status_code=200)
    except Exception:
        d = mem_get(roundId)
        d.update({"startTime": now, "status": "active", "isLocked": False, "elapsed": 0})
        return JSONResponse({"ok": True, "id": roundId, "status": "active", "startTime": now}, status_code=200)


@router.post("/pause")
async def pause(roundId: str):
    try:
        doc = mem_get(roundId) if db is None else await db.rounds.find_one({"id": roundId})
        if doc is None:
            raise HTTPException(status_code=404)

        elapsed = int(doc.get("elapsed", 0))
        start = doc.get("startTime")

        if start:
            start_dt = datetime.fromisoformat(start)
            elapsed += int((datetime.now(timezone.utc) - start_dt).total_seconds())

        doc["elapsed"] = elapsed
        doc["status"] = "paused"

        if db is not None:
            await db.rounds.update_one({"id": roundId}, {"$set": doc}, upsert=True)

        return JSONResponse({"ok": True, "id": roundId, "status": "paused", "elapsed": elapsed}, status_code=200)
    except Exception:
        d = mem_get(roundId)
        d["status"] = "paused"
        return JSONResponse({"ok": True, "id": roundId, "status": "paused", "elapsed": d.get("elapsed", 0)}, status_code=200)


@router.post("/restart")
async def restart(roundId: str):
    now = datetime.now(timezone.utc).isoformat()
    try:
        doc = mem_get(roundId) if db is None else await db.rounds.find_one({"id": roundId}) or {"id": roundId}

        doc.update({"startTime": now, "status": "active", "isLocked": False, "elapsed": 0})

        if db is not None:
            await db.rounds.update_one({"id": roundId}, {"$set": doc}, upsert=True)

        return JSONResponse({"ok": True, "id": roundId, "status": "active", "startTime": now, "elapsed": 0}, status_code=200)
    except Exception:
        d = mem_get(roundId)
        d.update({"startTime": now, "status": "active", "isLocked": False, "elapsed": 0})
        return JSONResponse({"ok": True, "id": roundId, "status": "active", "startTime": now, "elapsed": 0}, status_code=200)


@router.post("/end")
async def end(roundId: str):
    now = datetime.now(timezone.utc).isoformat()
    try:
        doc = mem_get(roundId) if db is None else await db.rounds.find_one({"id": roundId})
        if doc is None:
            raise HTTPException(status_code=404)

        doc.update({"endTime": now, "status": "completed", "isLocked": True})

        if db is not None:
            await db.rounds.update_one({"id": roundId}, {"$set": doc}, upsert=True)

        return JSONResponse({"ok": True, "id": roundId, "status": "completed", "endTime": now}, status_code=200)
    except Exception:
        d = mem_get(roundId)
        d.update({"endTime": now, "status": "completed", "isLocked": True})
        return JSONResponse({"ok": True, "id": roundId, "status": "completed", "endTime": now}, status_code=200)
