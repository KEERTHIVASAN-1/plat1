from fastapi import APIRouter, Body, Query, HTTPException
from datetime import datetime, timezone
from typing import Optional

from ..db import db
from pydantic import BaseModel

router = APIRouter(prefix="/timer", tags=["timer"])


def default_round(round_id: str):
    return {
        "id": round_id,
        "startTime": None,
        "endTime": None,
        "status": "scheduled",
        "isLocked": True,
        "duration": 0,
    }


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


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
        "pausedRemaining": doc.get("pausedRemaining", 0),
    }


@router.get("/status")
async def get_status():
    docs = await db.rounds.find({}, {"_id": 0}).to_list(length=100)
    return {"rounds": docs}


class ConfigurePayload(BaseModel):
    roundId: str
    start: Optional[str] = None
    end: Optional[str] = None
    locked: Optional[bool] = None
    durationSeconds: Optional[int] = None

@router.post("/configure")
async def configure_round(
    payload: ConfigurePayload | None = Body(None),
    roundId: str | None = Query(None),
    start: str | None = Query(None),
    end: str | None = Query(None),
    locked: bool | None = Query(None),
    durationSeconds: int | None = Query(None),
):
    roundId = (payload.roundId if payload else None) or roundId
    if not roundId:
        raise HTTPException(status_code=422, detail="roundId is required")
    doc = await db.rounds.find_one({"id": roundId}) or {"id": roundId}
    if (payload and payload.start is not None) or start is not None:
        doc["startTime"] = (payload.start if payload else start)
    if (payload and payload.end is not None) or end is not None:
        doc["endTime"] = (payload.end if payload else end)
    if (payload and payload.locked is not None) or locked is not None:
        doc["isLocked"] = bool((payload.locked if payload else locked))
    if (payload and payload.durationSeconds is not None) or durationSeconds is not None:
        doc["duration"] = int((payload.durationSeconds if payload else durationSeconds) or 0)
    doc.setdefault("status", "scheduled")
    await db.rounds.update_one({"id": roundId}, {"$set": doc}, upsert=True)
    return {
        "id": doc.get("id", roundId),
        "startTime": doc.get("startTime"),
        "endTime": doc.get("endTime"),
        "status": doc.get("status", "scheduled"),
        "isLocked": doc.get("isLocked", False),
        "duration": doc.get("duration", 0),
    }


class StartPayload(BaseModel):
    roundId: str
    durationSeconds: Optional[int] = None

@router.post("/start")
async def start_round(
    payload: StartPayload | None = Body(None),
    roundId: str | None = Query(None),
    durationSeconds: int | None = Query(None),
):
    roundId = (payload.roundId if payload else None) or roundId
    if not roundId:
        raise HTTPException(status_code=422, detail="roundId is required")
    doc = await db.rounds.find_one({"id": roundId}) or {"id": roundId}
    if not doc.get("startTime"):
        doc["startTime"] = now_iso()
    effective_duration = (payload.durationSeconds if payload else durationSeconds)
    if effective_duration and int(effective_duration) > 0:
        # compute end time based on duration
        end_ts = datetime.now(timezone.utc).timestamp() + int(effective_duration)
        doc["endTime"] = datetime.fromtimestamp(end_ts, tz=timezone.utc).isoformat()
        doc["duration"] = int(effective_duration)
    doc.pop("pausedRemaining", None)
    doc["status"] = "active"
    doc["isLocked"] = False
    await db.rounds.update_one({"id": roundId}, {"$set": doc}, upsert=True)
    return {
        "id": doc.get("id", roundId),
        "startTime": doc.get("startTime"),
        "endTime": doc.get("endTime"),
        "status": doc.get("status", "active"),
        "isLocked": doc.get("isLocked", False),
        "duration": doc.get("duration", 0),
    }


class RoundIdPayload(BaseModel):
    roundId: str

class EndPayload(BaseModel):
    roundId: str

@router.post("/end")
async def end_round(payload: EndPayload | None = Body(None), roundId: str | None = Query(None)):
    roundId = (payload.roundId if payload else None) or roundId
    if not roundId:
        raise HTTPException(status_code=422, detail="roundId is required")
    doc = await db.rounds.find_one({"id": roundId}) or {"id": roundId}
    doc["endTime"] = now_iso()
    doc["status"] = "ended"
    doc["isLocked"] = True
    await db.rounds.update_one({"id": roundId}, {"$set": doc}, upsert=True)
    return {
        "id": doc.get("id", roundId),
        "startTime": doc.get("startTime"),
        "endTime": doc.get("endTime"),
        "status": doc.get("status", "ended"),
        "isLocked": doc.get("isLocked", True),
        "duration": doc.get("duration", 0),
    }


@router.post("/pause")
async def pause_round(payload: RoundIdPayload):
    roundId = payload.roundId
    doc = await db.rounds.find_one({"id": roundId})
    if not doc:
        return {"error": "Round not found"}
    now = datetime.now(timezone.utc)
    remaining = 0
    if doc.get("endTime"):
        try:
            end_dt = datetime.fromisoformat(doc["endTime"])
            remaining = max(0, int((end_dt - now).total_seconds()))
        except Exception:
            remaining = int(doc.get("duration", 0))
    elif doc.get("startTime") and doc.get("duration"):
        try:
            start_dt = datetime.fromisoformat(doc["startTime"])
            elapsed = int((now - start_dt).total_seconds())
            remaining = max(0, int(doc.get("duration", 0) - elapsed))
        except Exception:
            remaining = int(doc.get("duration", 0))
    doc["pausedRemaining"] = remaining
    doc["status"] = "paused"
    doc["endTime"] = None
    await db.rounds.update_one({"id": roundId}, {"$set": doc})
    return {
        "id": doc.get("id", roundId),
        "startTime": doc.get("startTime"),
        "endTime": doc.get("endTime"),
        "status": doc.get("status", "paused"),
        "isLocked": doc.get("isLocked", False),
        "duration": doc.get("duration", 0),
        "pausedRemaining": doc.get("pausedRemaining", 0),
    }


class RestartPayload(BaseModel):
    roundId: str
    durationSeconds: Optional[int] = None

@router.post("/resume")
async def resume_round(payload: RoundIdPayload):
    roundId = payload.roundId
    doc = await db.rounds.find_one({"id": roundId})
    if not doc:
        return {"error": "Round not found"}
    rem = int(doc.get("pausedRemaining", doc.get("duration", 0)))
    doc["startTime"] = now_iso()
    if rem and rem > 0:
        end_ts = datetime.now(timezone.utc).timestamp() + rem
        doc["endTime"] = datetime.fromtimestamp(end_ts, tz=timezone.utc).isoformat()
        doc["duration"] = rem
    doc.pop("pausedRemaining", None)
    doc["status"] = "active"
    doc["isLocked"] = False
    await db.rounds.update_one({"id": roundId}, {"$set": doc})
    return {
        "id": doc.get("id", roundId),
        "startTime": doc.get("startTime"),
        "endTime": doc.get("endTime"),
        "status": doc.get("status", "active"),
        "isLocked": doc.get("isLocked", False),
        "duration": doc.get("duration", 0),
    }


@router.post("/restart")
async def restart_round(payload: RestartPayload):
    roundId = payload.roundId
    doc = await db.rounds.find_one({"id": roundId}) or {"id": roundId}
    dur = int(payload.durationSeconds or doc.get("duration", 0))
    doc["startTime"] = now_iso()
    if dur and dur > 0:
        end_ts = datetime.now(timezone.utc).timestamp() + dur
        doc["endTime"] = datetime.fromtimestamp(end_ts, tz=timezone.utc).isoformat()
        doc["duration"] = dur
    doc.pop("pausedRemaining", None)
    doc["status"] = "active"
    doc["isLocked"] = False
    await db.rounds.update_one({"id": roundId}, {"$set": doc}, upsert=True)
    return {
        "id": doc.get("id", roundId),
        "startTime": doc.get("startTime"),
        "endTime": doc.get("endTime"),
        "status": doc.get("status", "active"),
        "isLocked": doc.get("isLocked", False),
        "duration": doc.get("duration", 0),
    }
