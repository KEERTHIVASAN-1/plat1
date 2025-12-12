# backend/app/routers/problems.py
from fastapi import APIRouter, HTTPException
from backend.app.db import db

router = APIRouter(prefix="/api", tags=["problems"])

@router.get("/problems")
async def list_problems():
    return await db.problems.find({}, {"_id": 0}).to_list(1000)

@router.get("/problems/{id}")
async def get_problem(id: str):
    p = await db.problems.find_one({"id": id}, {"_id": 0})
    if not p:
        raise HTTPException(404)
    return p
