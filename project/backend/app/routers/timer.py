from fastapi import APIRouter
from datetime import datetime, timezone
from typing import Optional

from ..db import db

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
    }


