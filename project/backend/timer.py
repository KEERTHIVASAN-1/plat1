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
def configure_round(roundId: str, start: Optional[str] = None, end: Optional[str] = None, locked: Optional[bool] = None):
    r = db.rounds.find_one({"id": roundId})
    if not r:
        r = {"id": roundId}
    if start is not None:
        r["startTime"] = start
    if end is not None:
        r["endTime"] = end
    if locked is not None:
        r["isLocked"] = bool(locked)
    r.setdefault("status", "scheduled")
    db.rounds.update_one({"id": roundId}, {"$set": r}, upsert=True)
    return r

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
    db.rounds.update_one({"id": roundId}, {"$set": r}, upsert=True)
    return r

@router.post("/end")
def end_round(roundId: str):
    r = db.rounds.find_one({"id": roundId})
    if not r:
        raise HTTPException(status_code=404)
    r["endTime"] = now_iso()
    r["status"] = "ended"
    r["isLocked"] = True
    db.rounds.update_one({"id": roundId}, {"$set": r})
    return r

@router.get("/window")
def get_window(roundId: str):
    r = db.rounds.find_one({"id": roundId}, {"_id": 0})
    if not r:
        # Return a sensible default instead of 404 so the UI always has data.
        return {
            "id": roundId,
            "startTime": None,
            "endTime": None,
            "status": "scheduled",
            "isLocked": True,
            "duration": 0,
        }

    r.setdefault("status", "scheduled")
    r.setdefault("isLocked", False)

    return {
        "id": r["id"],
        "startTime": r.get("startTime"),
        "endTime": r.get("endTime"),
        "status": r["status"],
        "isLocked": r["isLocked"],
        "duration": r.get("duration", 0),
    }
