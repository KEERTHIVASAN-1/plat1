# models.py
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class UserCreate(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    name:str
    email: str


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: str
    round1Completed: bool = False
    round2Eligible: bool = False
    round1Score: int = 0
    round2Score: int = 0

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class Testcase(BaseModel):
    input: str
    output: str
    hidden: bool = False

class ProblemCreate(BaseModel):
    round: str
    title: str
    difficulty: str
    description: str
    testcases: List[Testcase]

class ProblemOut(ProblemCreate):
    id: str

class RunRequest(BaseModel):
    code: str
    language: str
    customInput: Optional[str] = None

class SubmitRequest(BaseModel):
    userId: str
    problemId: str
    code: str
    language: str
    round: str

class SubmissionOut(BaseModel):
    id: str
    userId: str
    problemId: str
    round: str
    code: str
    language: str
    timestamp: datetime
    testcasesPassed: int
    totalTestcases: int
    results: List[Dict[str, Any]]
