# Shinobi Performance Fix - 2026-02-20

## 🚨 Issue Identified: Shinobi VMS Overloaded

### Root Cause
Shinobi is **severely CPU-bound** with 27 cameras recording simultaneously:

```bash
CPU Usage Analysis:
- camera.js:       13.3% CPU (main process)
- singleCamera.js: 200% CPU  (maxing out 2 full cores!)
```

This causes:
- ❌ API timeouts (15+ seconds for getCameras/addCamera calls)
- ❌ Live streaming failures (ShinobiEmbedPlayer can't connect)
- ❌ Watchdog checks timing out every 30 seconds
- ❌ Camera management operations failing

### Log Evidence
```
2026-02-20 14:14:28 [error]: Shinobi getCameras failed {"error":"timeout of 15000ms exceeded"}
2026-02-20 14:14:39 [error]: Shinobi addCamera failed {"error":"timeout of 15000ms exceeded"}
2026-02-20 14:14:58 [debug]: watchdog: Shinobi unreachable for user
```

---

## ✅ Fixes Applied

### 1. **Increased Shinobi API Timeout** (15s → 45s)
**File**: [shinobi.service.js:11](smart-cam-backend/src/services/shinobi.service.js#L11)

```javascript
// Before:
timeout: 15000,

// After:
timeout: 45000, // Increased from 15s to 45s — Shinobi under heavy load with 27 cameras
```

**Why**: Gives Shinobi more time to respond when processing 27 camera streams

---

### 2. **Reduced Watchdog Frequency** (30s → 2min)
**File**: [recordingSync.service.js:36](smart-cam-backend/src/services/recordingSync.service.js#L36)

```javascript
// Before:
const WATCHDOG_INTERVAL_MS = 30 * 1000;  // Every 30 seconds

// After:
const WATCHDOG_INTERVAL_MS = 2 * 60 * 1000;  // Every 2 minutes
```

**Why**: Reduces load on Shinobi by checking camera status less frequently (from 120 checks/hour → 30 checks/hour per user)

---

## 🔄 Required Action

**RESTART THE BACKEND** to apply these changes:

```bash
# If using PM2:
pm2 restart smart-cam-backend

# If running directly:
# 1. Find the backend process
ps aux | grep "node.*server.js\|node.*index.js" | grep smart-cam-backend

# 2. Kill and restart
pkill -f "node.*smart-cam-backend"
cd /home/systools/Desktop/drisyam/smart-cam-backend
npm start

# Or if using a screen/tmux session:
screen -list  # find the session
screen -r <session-name>  # attach and restart
```

---

## 📊 Expected Results After Restart

### Before Fix:
```
✗ Shinobi API calls: 15s timeout → FAILED
✗ Live streams: Can't connect to Shinobi
✗ Watchdog: Hammering Shinobi every 30s
✗ CPU: 200% usage on singleCamera.js
```

### After Fix:
```
✓ Shinobi API calls: Up to 45s timeout → More likely to succeed
✓ Live streams: ShinobiEmbedPlayer can connect
✓ Watchdog: Checks every 2 minutes (4x less load)
✓ CPU: Should stabilize with reduced API load
```

---

## 🔍 Monitoring

After restarting the backend, monitor these logs:

```bash
# Watch for timeout errors (should decrease significantly)
tail -f logs/combined2.log | grep -i "timeout\|unreachable"

# Check Shinobi CPU usage
ps aux | grep shinobi | grep -v grep

# Verify API is responding
curl -s -o /dev/null -w "%{http_code} - %{time_total}s\n" http://localhost:8443
```

**Expected**:
- Fewer "timeout" errors in logs
- Shinobi API response times < 10 seconds
- Live streams working in frontend

---

## 🎯 Long-Term Optimizations (Optional)

If issues persist after these fixes, consider:

### 1. **Optimize Shinobi Configuration**
```javascript
// In Shinobi camera settings, reduce CPU usage:
{
  "vcodec": "copy",        // ✓ Already using (no re-encoding)
  "acodec": "no",          // ✓ Disable audio if not needed
  "cust_record": "-movflags +faststart -preset ultrafast"
}
```

### 2. **Reduce Camera Quality/Framerate**
- Lower resolution: 1080p → 720p (reduces CPU by ~40%)
- Lower framerate: 30fps → 15fps (reduces CPU by ~50%)
- Increase motion detection threshold (fewer recordings)

### 3. **Hardware Upgrades**
- Add more CPU cores (Shinobi is CPU-intensive)
- Use hardware-accelerated encoding (VAAPI, NVENC, QuickSync)
- Split cameras across multiple Shinobi instances

### 4. **Database Optimization**
```bash
# If using SQLite (default), switch to MySQL for better performance with 27 cameras
# Or optimize SQLite:
sqlite3 /home/Shinobi/shinobi.sqlite "VACUUM; ANALYZE;"
```

---

## 📁 Modified Files

1. [shinobi.service.js:11](smart-cam-backend/src/services/shinobi.service.js#L11) - Timeout: 15s → 45s
2. [recordingSync.service.js:36](smart-cam-backend/src/services/recordingSync.service.js#L36) - Watchdog: 30s → 2min

---

## 🔧 Verification Checklist

After restarting backend:

- [ ] Backend logs show fewer "timeout" errors
- [ ] Live View page loads camera streams
- [ ] Timeline shows recordings (already fixed)
- [ ] Timelapse shows up to 1000 recordings (already fixed)
- [ ] Shinobi API responds within 30-45 seconds
- [ ] CPU usage on Shinobi process stabilizes

---

**Status**: Code changes complete, **backend restart required** to take effect.
