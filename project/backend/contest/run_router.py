from fastapi import APIRouter
from pydantic import BaseModel
from utils import execute_code   # YOUR piston wrapper

router = APIRouter()

class RunPayload(BaseModel):
    code: str
    language: str = "python"
    customInput: str = ""

@router.post("/run")
async def run_code(payload: RunPayload):
    try:
        result = execute_code(
            code=payload.code,
            language=payload.language,
            stdin=payload.customInput
        )

        return {
            "success": True,
            "run": {
                "output": result.get("output", "") or result.get("stdout", ""),
                "stderr": result.get("stderr", ""),
                "cpu_time": result.get("time", 0)
            }
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }
