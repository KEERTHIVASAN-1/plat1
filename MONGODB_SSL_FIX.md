# MongoDB Atlas SSL/TLS Fix - Complete

## ✅ All Fixes Applied

### 1. **Dockerfile** - Fixed ✅
**File:** `project/backend/Dockerfile`

**Changes:**
- Installs `ca-certificates` package
- Runs `update-ca-certificates` to update certificate store
- Removed unnecessary packages
- Simplified to exact specification

**Current Content:**
```dockerfile
FROM python:3.10-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates && \
    update-ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app

ENV PYTHONUNBUFFERED=1

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "3001", "--workers", "4"]
```

---

### 2. **database.py** - Fixed ✅
**File:** `project/backend/database.py`

**Changes:**
- Now uses `certifi` package instead of hardcoded CA file path
- Enables TLS with `tlsCAFile=certifi.where()`
- Simplified to exact specification

**Current Content:**
```python
import os
import certifi
from pymongo import MongoClient

MONGO_URL = os.getenv("MONGO_URL")
DB_NAME = os.getenv("DB_NAME")

client = MongoClient(
    MONGO_URL,
    tls=True,
    tlsCAFile=certifi.where()
)

db = client[DB_NAME]
```

---

### 3. **requirements.txt** - Updated ✅
**File:** `project/backend/requirements.txt`

**Changes:**
- Added `certifi` package to requirements

---

### 4. **docker-compose.yml** - Verified ✅
**File:** `docker-compose.yml`

**Status:**
- ✅ `MONGO_URL` is correctly set
- ✅ `DB_NAME` is correctly set to "contestdb"
- ✅ All environment variables are properly configured

---

## 🚀 DEPLOYMENT COMMANDS

Run these commands exactly as shown:

```bash
# Stop and remove all containers and volumes
docker compose down

# Rebuild the backend image without cache (ensures fresh build)
docker compose build --no-cache backend

# Start all services
docker compose up -d
```

---

## ✅ VERIFICATION STEPS

### 1. Check MongoDB Connection
```bash
docker exec -it plat1-backend-1 python -c "from database import db; print(db.list_collection_names())"
```

**Expected Result:**
- Should print a list of collection names like: `['problems', 'users', 'submissions', ...]`
- **NO SSL handshake errors**
- **NO TLSV1_ALERT_INTERNAL_ERROR**

### 2. Check Backend Logs
```bash
docker logs plat1-backend-1
```

**What to Look For:**
- ✅ No `SSL handshake failed` errors
- ✅ No `TLSV1_ALERT_INTERNAL_ERROR` errors
- ✅ No `ServerSelectionTimeoutError` errors
- ✅ Backend starts successfully

### 3. Test Health Endpoint
```bash
curl http://localhost:3001/health
```

**Expected Response:**
```json
{"ok": true}
```

### 4. Test Problems Endpoint
```bash
curl http://localhost:3001/problems
```

**Expected Response:**
- JSON array (empty `[]` if no problems, or list of problems)

### 5. Test MongoDB from Inside Container
```bash
docker exec -it plat1-backend-1 python -c "
from database import db
import pymongo
try:
    result = db.command('ping')
    print('✅ MongoDB ping successful:', result)
    collections = db.list_collection_names()
    print('✅ Collections:', collections)
except Exception as e:
    print('❌ Error:', e)
"
```

---

## 🔍 WHAT WAS FIXED

### Problem:
```
SSL handshake failed: TLSV1_ALERT_INTERNAL_ERROR
pymongo.errors.ServerSelectionTimeoutError
```

### Root Causes:
1. ❌ Docker container didn't have CA certificates installed
2. ❌ pymongo wasn't using the correct TLS CA file
3. ❌ Using hardcoded `/etc/ssl/certs/ca-certificates.crt` path (not reliable)

### Solution:
1. ✅ Installed `ca-certificates` in Dockerfile
2. ✅ Updated certificate store with `update-ca-certificates`
3. ✅ Using `certifi` package which provides up-to-date CA certificates
4. ✅ Using `certifi.where()` which always points to the correct CA bundle

---

## 📋 VALIDATION CHECKLIST

After running the commands above, verify:

- [ ] ✅ Docker builds successfully without errors
- [ ] ✅ Backend container starts without errors
- [ ] ✅ MongoDB connection works (no SSL errors in logs)
- [ ] ✅ `db.list_collection_names()` returns collections
- [ ] ✅ Health endpoint returns `{"ok": true}`
- [ ] ✅ No `TLSV1_ALERT_INTERNAL_ERROR` in logs
- [ ] ✅ No `ServerSelectionTimeoutError` in logs
- [ ] ✅ Submissions can save to database
- [ ] ✅ Worker can connect to database

---

## 🐛 TROUBLESHOOTING

### If MongoDB connection still fails:

1. **Check container name:**
   ```bash
   docker ps
   ```
   Use the actual container name from output (might not be `plat1-backend-1`)

2. **Check environment variables:**
   ```bash
   docker exec -it plat1-backend-1 env | grep MONGO
   ```

3. **Verify certifi is installed:**
   ```bash
   docker exec -it plat1-backend-1 python -c "import certifi; print(certifi.where())"
   ```

4. **Test connection manually:**
   ```bash
   docker exec -it plat1-backend-1 python -c "
   import os
   import certifi
   from pymongo import MongoClient
   MONGO_URL = os.getenv('MONGO_URL')
   client = MongoClient(MONGO_URL, tls=True, tlsCAFile=certifi.where())
   print(client.admin.command('ping'))
   "
   ```

5. **Check MongoDB Atlas Network Access:**
   - Ensure your Docker host IP is whitelisted in MongoDB Atlas
   - Or use `0.0.0.0/0` for development (not recommended for production)

---

## ✅ EXPECTED OUTCOME

After applying these fixes:

1. ✅ **No more SSL handshake errors**
2. ✅ **MongoDB Atlas connection works with TLS**
3. ✅ **All database operations succeed**
4. ✅ **Worker can save submissions to database**
5. ✅ **Backend is fully functional**

---

**All fixes have been applied. Ready for testing! 🚀**




