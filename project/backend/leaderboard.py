from fastapi import APIRouter
from database import db

router = APIRouter(prefix="/leaderboard")

@router.get("/round1")
def round1():
    users = list(db.users.find({}, {"_id": 0, "password": 0}))
    users.sort(key=lambda u: (-int(u.get("round1Score", 0)), u.get("name", "")))
    return users

@router.get("/round2")
def round2():
    users = list(db.users.find({}, {"_id": 0, "password": 0}))
    users.sort(key=lambda u: (-int(u.get("round2Score", 0)), u.get("name", "")))
    return users

@router.get("/overall")
def overall():
    users = list(db.users.find({}, {"_id": 0, "password": 0}))
    users.sort(key=lambda u: (-(int(u.get("round1Score", 0)) + int(u.get("round2Score", 0))), u.get("name", "")))
    return users

