from fastapi import APIRouter
from database import db
from typing import List, Dict
from difflib import SequenceMatcher

router = APIRouter(prefix="/anti-cheat")

def similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a, b).ratio()

def tokenize(code: str) -> str:
    import re
    return re.sub(r"\s+", " ", re.sub(r"[;{}()\[\],]", " ", code)).strip().lower()

def analyze_submissions(subs: List[Dict]) -> List[Dict]:
    flags = []
    for i in range(len(subs)):
        for j in range(i + 1, len(subs)):
            s1, s2 = subs[i], subs[j]
            if s1.get("language") != s2.get("language"):
                continue
            t1, t2 = tokenize(s1.get("code", "")), tokenize(s2.get("code", ""))
            sim = similarity(t1, t2)
            if sim >= 0.92:
                flags.append({
                    "userA": s1.get("userId"),
                    "userB": s2.get("userId"),
                    "problemId": s1.get("problemId"),
                    "round": s1.get("round"),
                    "similarity": sim,
                })
    return flags

@router.get("/scan")
def scan_recent(limit: int = 200):
    recent = list(db.submissions.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit))
    flags = analyze_submissions(recent)
    if flags:
        db.flags.insert_many([{**f, "type": "similar_code"} for f in flags])
    return {"checked": len(recent), "flags": flags}

@router.get("/flags")
def get_flags():
    items = list(db.flags.find({}, {"_id": 0}).sort("timestamp", -1))
    return items

