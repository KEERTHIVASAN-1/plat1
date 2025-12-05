from pydantic import BaseModel
from typing import List, Optional

class Testcase(BaseModel):
    input: str
    output: str

class Problem(BaseModel):
    id: str
    title: str
    description: str
    testcases: List[Testcase]

class SubmitRequest(BaseModel):
    userId: str
    problemId: str
    code: str
    language: str
    round: str

class UserOut(BaseModel):
    id: str
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    round1Score: Optional[int] = 0
    round2Score: Optional[int] = 0
