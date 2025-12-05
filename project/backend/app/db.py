# db.py
from motor.motor_asyncio import AsyncIOMotorClient
from .config import MONGO_URL, DB_NAME
import logging

logger = logging.getLogger(__name__)

client = None
db = None

if MONGO_URL:
    try:
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        logger.info("Mongo client created")
    except Exception as e:
        logger.error("Mongo connection error: %s", e)
        client = None
        db = None
else:
    logger.warning("MONGO_URL empty; db disabled")
