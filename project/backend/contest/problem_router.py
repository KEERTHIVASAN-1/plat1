from fastapi import APIRouter, HTTPException
from models import Problem
from database import db

router = APIRouter()

@router.get("/problems")
def list_problems():
    items = list(db.problems.find({}, {"_id": 0}))
    return items

@router.get("/problems/{pid}")
def get_problem(pid: str):
    p = db.problems.find_one({"id": pid}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404)
    return p

@router.post("/problems")
def add_problem(body: Problem):
    if db.problems.find_one({"id": body.id}):
        raise HTTPException(status_code=409)
    db.problems.insert_one(body.model_dump())
    return body.model_dump()

@router.put("/problems/{pid}")
def update_problem(pid: str, body: Problem):
    if pid != body.id:
        raise HTTPException(status_code=400)
    if not db.problems.find_one({"id": pid}):
        raise HTTPException(status_code=404)
    db.problems.replace_one({"id": pid}, body.model_dump())
    return body.model_dump()

@router.delete("/problems/{pid}")
def delete_problem(pid: str):
    res = db.problems.delete_one({"id": pid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404)
    return {"deleted": True, "id": pid}

