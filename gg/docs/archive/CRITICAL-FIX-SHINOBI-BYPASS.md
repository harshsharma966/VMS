# Critical Fix: Bypass Overloaded Shinobi - 2026-02-20 14:25

## 🚨 Problem Summary

**Shinobi VMS is completely overloaded and timing out**:
- 27 cameras recording simultaneously
- CPU: 200% on singleCamera.js (maxing out 2 cores)
- API calls taking 45+ seconds → timing out
- Live streams showing BLACK SCREENS

### Evidence
```
2026-02-20 14:22:26 [error]: Shinobi getCameras failed {"error":"timeout of 45000ms exceeded"}
2026-02-20 14:21:51 [error]: Shinobi addCamera failed {"error":"timeout of 45000ms exceeded"}
```

**Even after increasing timeout from 15s→45s, Shinobi still times out!**

---

## ✅ Solution: Bypass Shinobi Completely

Instead of relying on overloaded Shinobi for live streaming, we now use the **backend's direct streaming service**:

### How It Works

```
Camera (RTSP)
    ↓
Backend FFmpeg (creates HLS stream)
    ↓
DirectStreamPlayer (HLS.js)
    ↓
Browser (smooth video)
```

**Key Benefits**:
- ✅ Bypasses overloaded Shinobi
- ✅ Proper VIDEO streaming (not images)
- ✅ Direct FFmpeg transcoding (efficient)
- ✅ HLS.js player (cross-browser support)
- ✅ Lower latency
- ✅ No Shinobi API dependency

---

## 📝 Changes Made

### 1. Created DirectStreamPlayer Component
**File**: [DirectStreamPlayer.jsx](smart-cam-app/src/components/DirectStreamPlayer.jsx) *(NEW)*

- Uses `shinobiService.getDirectStreamUrl(monitorId)`
- Calls backend `/stream/start/{monitorId}` to start FFmpeg HLS stream
- Uses HLS.js for video playback
- Auto-stops stream on component unmount

### 2. Updated LiveView to Use DirectStreamPlayer
**File**: [LiveView.jsx](smart-cam-app/src/pages/LiveView.jsx)

```javascript
// Before:
import ShinobiEmbedPlayer from '@/components/ShinobiEmbedPlayer';
<ShinobiEmbedPlayer monitorId={camera?.monitorId} className="w-full h-full" />

// After:
import DirectStreamPlayer from '@/components/DirectStreamPlayer';
<DirectStreamPlayer monitorId={camera?.monitorId} className="w-full h-full" />
```

**Lines changed**:
- Line 7: Import statement
- Line 28: Comment updated
- Line 34: Grid tile player
- Line 653: Single camera player

### 3. Fixed Remaining Timeout Issues
**File**: [recordingSync.service.js:71](smart-cam-backend/src/services/recordingSync.service.js#L71)

- Increased `getShinobiRecordings` timeout: 15s → 45s
- Reduced watchdog frequency: 30s → 2min
- Main Shinobi service timeout already increased to 45s

---

## 🔄 Backend Streaming Service (Already Exists!)

The backend already has a fully functional direct streaming service:

**Service**: [stream.service.js](smart-cam-backend/src/services/stream.service.js)
**Controller**: [stream.controller.js](smart-cam-backend/src/controllers/stream.controller.js)
**Routes**: [stream.routes.js](smart-cam-backend/src/routes/stream.routes.js)

### How It Works

1. **Frontend** calls `GET /stream/start/:monitorId`
2. **Backend** fetches camera RTSP URL from database
3. **FFmpeg** starts transcoding RTSP → HLS
   - Output: `/streams/{monitorId}/stream.m3u8`
   - Segments: `/streams/{monitorId}/segment_000.ts`
4. **Frontend** plays HLS stream via HLS.js
5. **On unmount** calls `GET /stream/stop/:monitorId`

### FFmpeg Command
```bash
ffmpeg -rtsp_transport tcp \
  -analyzeduration 1000000 \
  -probesize 1000000 \
  -i rtsp://user:pass@camera-ip:554/path \
  -c:v copy \          # No re-encoding (fast!)
  -an \                # No audio
  -f hls \             # HLS format
  -hls_time 2 \        # 2-second segments
  -hls_list_size 3 \   # Keep 3 segments
  -hls_flags delete_segments+append_list \
  output.m3u8
```

**Already running**: We found an FFmpeg process already active in `ps aux`:
```
/usr/bin/ffmpeg ... /home/systools/Desktop/drisyam/smart-cam-backend/streams/f8e6e462ff1b42229838c881/stream.m3u8
```

---

## 🎯 Required Actions

### 1. **Restart Backend** (for timeout changes)

```bash
cd /home/systools/Desktop/drisyam/smart-cam-backend

# Find and kill the process
pkill -f "node.*server"

# Or if using PM2
pm2 restart smart-cam-backend

# Restart
npm start
```

### 2. **Refresh Frontend**

```bash
# Clear browser cache and reload
Ctrl+F5 (Linux/Windows)
Cmd+Shift+R (Mac)
```

### 3. **Test Live Streaming**

1. Open Live View page
2. Select any camera
3. Should see "Starting stream…" message
4. Video should load within 5-10 seconds
5. Check browser console for:
   ```
   🎬 Starting direct stream for: {monitorId}
   📡 Direct stream URL: http://localhost:5000/stream/{monitorId}/stream.m3u8
   ✅ HLS manifest loaded successfully
   ```

---

## 📊 Expected Performance

### Before (ShinobiEmbedPlayer):
```
Browser → Shinobi API (timeout) → BLACK SCREEN
         ↓
      45+ seconds
      No video
```

### After (DirectStreamPlayer):
```
Browser → Backend API → FFmpeg → HLS Stream → VIDEO
         ↓           ↓
      1-2s         3-5s startup
      ✅ Smooth video playback
```

---

## 🔍 Troubleshooting

### If streams don't start:

1. **Check backend logs**:
   ```bash
   tail -f logs/combined2.log | grep -i "stream\|ffmpeg"
   ```

2. **Verify FFmpeg is running**:
   ```bash
   ps aux | grep ffmpeg
   ```

3. **Check stream files are created**:
   ```bash
   ls -lh streams/*/stream.m3u8
   ```

4. **Test stream URL directly**:
   ```bash
   curl -I http://localhost:5000/stream/{monitorId}/stream.m3u8
   ```

### If you see errors in browser console:

- **"Failed to start stream"**: Backend can't connect to camera RTSP URL
  - Check camera credentials in database
  - Verify camera is accessible from backend server

- **"HLS manifest loading failed"**: Stream hasn't started yet
  - FFmpeg takes 3-5 seconds to create first segments
  - Component retries up to 10 times (10 seconds)

- **"Stream Unavailable"**: FFmpeg failed to start
  - Check backend logs for FFmpeg errors
  - Verify camera RTSP URL is correct

---

## 📁 Modified Files

### Backend
1. [shinobi.service.js:11](smart-cam-backend/src/services/shinobi.service.js#L11) - Timeout: 15s → 45s
2. [recordingSync.service.js:36](smart-cam-backend/src/services/recordingSync.service.js#L36) - Watchdog: 30s → 2min
3. [recordingSync.service.js:71](smart-cam-backend/src/services/recordingSync.service.js#L71) - getShinobiRecordings timeout: 15s → 45s

### Frontend
1. [DirectStreamPlayer.jsx](smart-cam-app/src/components/DirectStreamPlayer.jsx) - **NEW** component
2. [LiveView.jsx:7](smart-cam-app/src/pages/LiveView.jsx#L7) - Import DirectStreamPlayer
3. [LiveView.jsx:34](smart-cam-app/src/pages/LiveView.jsx#L34) - Grid tile uses DirectStreamPlayer
4. [LiveView.jsx:653](smart-cam-app/src/pages/LiveView.jsx#L653) - Single view uses DirectStreamPlayer

---

## 🎬 Architecture Alignment

**Specification** (from architecture-diagram.md):
- ✅ "Live Streaming (HLS/WebRTC)"
- ✅ "HLS.js (Video Player)"
- ✅ "8. HLS Stream"

**Implementation**:
- ✅ Using HLS format (industry standard)
- ✅ HLS.js player (cross-browser compatible)
- ✅ Proper VIDEO playback (not images)
- ✅ Low-latency streaming (2-second segments)

---

## 💡 Why This Works Better

| Approach | Shinobi Embed | Direct Stream |
|----------|--------------|---------------|
| **API Calls** | Multiple (get keys, get embed URL) | One (start stream) |
| **Shinobi Load** | High (embed page rendering) | Zero (bypassed) |
| **Timeout Risk** | High (Shinobi overloaded) | None (no Shinobi) |
| **CPU Usage** | Shinobi + FFmpeg | FFmpeg only |
| **Startup Time** | 15-45s+ (with timeouts) | 3-5s (FFmpeg) |
| **Reliability** | Low (Shinobi timing out) | High (direct) |

---

## 🔐 Security Note

The direct streaming service:
- ✅ Requires JWT authentication (same as Shinobi endpoints)
- ✅ Validates user owns the camera via database
- ✅ Uses backend to proxy RTSP (camera credentials never exposed to browser)
- ✅ Auto-stops streams on component unmount (prevents resource leaks)

---

**Status**:
- ✅ Code changes complete
- ⏳ **Backend restart required** to apply timeout fixes
- ⏳ **Browser refresh required** to load DirectStreamPlayer

**Next Steps**:
1. Restart backend
2. Refresh browser (Ctrl+F5)
3. Test live streaming on Live View page
4. Verify video playback works

**Expected Result**: Smooth HLS video streaming without Shinobi timeouts!
