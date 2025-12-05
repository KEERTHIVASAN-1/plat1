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
    if durationSeconds and durationSeconds > 0:
        end = datetime.now(timezone.utc).timestamp() + durationSeconds
        r["endTime"] = datetime.fromtimestamp(end, tz=timezone.utc).isoformat()
        r["duration"] = durationSeconds
        r.pop("pausedRemaining", None)
    r["status"] = "active"
    r["isLocked"] = False
    db.rounds.update_one({"id": roundId}, {"$set": r}, upsert=True)
    return r

@router.post("/pause")
def pause_round(roundId: str):
    r = db.rounds.find_one({"id": roundId})
    if not r:
        raise HTTPException(status_code=404)
    now = datetime.now(timezone.utc)
    remaining = 0
    if r.get("endTime"):
        try:
            end_dt = datetime.fromisoformat(r["endTime"])
            remaining = max(0, int((end_dt - now).total_seconds()))
        except Exception:
            remaining = r.get("duration", 0)
    elif r.get("startTime") and r.get("duration"):
        try:
            start_dt = datetime.fromisoformat(r["startTime"])
            elapsed = int((now - start_dt).total_seconds())
            remaining = max(0, int(r.get("duration", 0) - elapsed))
        except Exception:
            remaining = r.get("duration", 0)
    r["pausedRemaining"] = remaining
    r["status"] = "paused"
    r["endTime"] = None
    db.rounds.update_one({"id": roundId}, {"$set": r})
    return r

@router.post("/resume")
def resume_round(roundId: str):
    r = db.rounds.find_one({"id": roundId})
    if not r:
        raise HTTPException(status_code=404)
    rem = int(r.get("pausedRemaining", r.get("duration", 0)))
    r["startTime"] = now_iso()
    if rem and rem > 0:
        end_ts = datetime.now(timezone.utc).timestamp() + rem
        r["endTime"] = datetime.fromtimestamp(end_ts, tz=timezone.utc).isoformat()
        r["duration"] = rem
    r.pop("pausedRemaining", None)
    r["status"] = "active"
    r["isLocked"] = False
    db.rounds.update_one({"id": roundId}, {"$set": r})
    return r

@router.post("/restart")
def restart_round(roundId: str, durationSeconds: Optional[int] = None):
    r = db.rounds.find_one({"id": roundId}) or {"id": roundId}
    dur = int(durationSeconds or r.get("duration", 0))
    r["startTime"] = now_iso()
    if dur and dur > 0:
        end_ts = datetime.now(timezone.utc).timestamp() + dur
        r["endTime"] = datetime.fromtimestamp(end_ts, tz=timezone.utc).isoformat()
        r["duration"] = dur
    r.pop("pausedRemaining", None)
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
        "pausedRemaining": r.get("pausedRemaining", 0),
    }
