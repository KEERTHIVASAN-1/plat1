from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
from typing import Optional
from database import db

router = APIRouter(prefix="/timer")

def now_iso():
    return datetime.now(timezone.utc).isoformat()

@router.get("/status")
def get_status():
    rounds = list(db.rounds.find({}, {"_id": 0}))
    return {"rounds": rounds}

@router.post("/configure")
def configure_round(roundId: str, start: Optional[str] = None, end: Optional[str] = None, locked: Optional[bool] = None, duration: Optional[int] = None, scheduledStart: Optional[str] = None):
    r = db.rounds.find_one({"id": roundId}) or {"id": roundId}
    if start is not None:
        r["startTime"] = start
    if end is not None:
        r["endTime"] = end
    if locked is not None:
        r["isLocked"] = bool(locked)
    if duration is not None:
        r["duration"] = int(duration)
    if scheduledStart is not None:
        r["scheduledStart"] = scheduledStart
    r.setdefault("status", "scheduled")
    r.setdefault("elapsed", 0)
    db.rounds.update_one({"id": roundId}, {"$set": r}, upsert=True)
    return {k: r.get(k) for k in ("id", "startTime", "endTime", "status", "isLocked", "duration", "scheduledStart")}

@router.post("/start")
def start_round(roundId: str, durationSeconds: Optional[int] = None):
    r = db.rounds.find_one({"id": roundId}) or {"id": roundId}
    r["startTime"] = now_iso()
    if durationSeconds:
        end = datetime.now(timezone.utc).timestamp() + durationSeconds
        r["endTime"] = datetime.fromtimestamp(end, tz=timezone.utc).isoformat()
        r["duration"] = durationSeconds
    r["status"] = "active"
    r["isLocked"] = False
    r["elapsed"] = 0
    db.rounds.update_one({"id": roundId}, {"$set": r}, upsert=True)
    return {k: r.get(k) for k in ("id", "startTime", "endTime", "status", "isLocked", "duration", "elapsed")}

@router.post("/end")
def end_round(roundId: str):
    r = db.rounds.find_one({"id": roundId})
    if not r:
        raise HTTPException(status_code=404)
    r["endTime"] = now_iso()
    r["status"] = "ended"
    r["isLocked"] = True
    db.rounds.update_one({"id": roundId}, {"$set": r})
    return {k: r.get(k) for k in ("id", "endTime", "status", "isLocked")}

@router.post("/pause")
def pause_round(roundId: str):
    r = db.rounds.find_one({"id": roundId})
    if not r:
        raise HTTPException(status_code=404)
    # accumulate elapsed
    elapsed = int(r.get("elapsed", 0))
    start = r.get("startTime")
    if start:
        try:
            start_dt = datetime.fromisoformat(start)
            now = datetime.now(timezone.utc)
            elapsed += int((now - start_dt).total_seconds())
        except Exception:
            pass
    r["elapsed"] = elapsed
    r["status"] = "paused"
    db.rounds.update_one({"id": roundId}, {"$set": r})
    return {"id": roundId, "status": "paused", "elapsed": elapsed}

@router.post("/restart")
def restart_round(roundId: str):
    r = db.rounds.find_one({"id": roundId}) or {"id": roundId}
    r["startTime"] = now_iso()
    r["status"] = "active"
    r["isLocked"] = False
    r["elapsed"] = 0
    db.rounds.update_one({"id": roundId}, {"$set": r}, upsert=True)
    return {"id": roundId, "status": "active", "startTime": r["startTime"], "elapsed": 0}

@router.get("/window")
def get_window(roundId: str):
    r = db.rounds.find_one({"id": roundId}, {"_id": 0})
    if not r:
        return {
            "id": roundId,
            "startTime": None,
            "endTime": None,
            "status": "scheduled",
            "isLocked": True,
            "duration": 0,
            "elapsed": 0,
            "scheduledStart": None,
        }

    r.setdefault("status", "scheduled")
    r.setdefault("isLocked", False)
    r.setdefault("elapsed", 0)

    # normalize numeric types
    dur = r.get("duration", 0)
    try:
        dur = int(dur)
    except Exception:
        dur = 0
    el = r.get("elapsed", 0)
    try:
        el = int(el)
    except Exception:
        el = 0

    return {
        "id": r.get("id", roundId),
        "startTime": r.get("startTime"),
        "endTime": r.get("endTime"),
        "status": r.get("status", "scheduled"),
        "isLocked": r.get("isLocked", False),
        "duration": dur,
        "elapsed": el,
        "scheduledStart": r.get("scheduledStart"),
    }
