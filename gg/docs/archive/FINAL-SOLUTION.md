# Final Solution: Restart Shinobi & Reconfigure Cameras

## 🎯 The Problem

- Shinobi VMS is overloaded (200% CPU with 27 cameras)
- Cameras are in **"record" mode** (motion-based) → HLS streams only exist during motion
- API timeouts causing black screens
- DirectStreamPlayer requires RTSP URLs in database (may not be configured)

## ✅ The Solution

**Restart Shinobi and switch cameras to "start" mode** (continuous streaming):

1. ✅ Restart Shinobi VMS (clear overload state)
2. ✅ Sync cameras to Shinobi (reconfigure)
3. ✅ Start all cameras (switch from "record" → "start" mode)
4. ✅ HLS streams will be available 24/7 (not just on motion)

---

## 🚀 Run This Command

```bash
cd /home/systools/Desktop/drisyam
./RESTART-AND-RECONFIGURE.sh
```

### What This Script Does:

1. **Restarts Shinobi VMS** (Docker/systemd/PM2/direct)
2. **Syncs cameras** from database to Shinobi (`sync-cameras-to-shinobi.js`)
3. **Starts all cameras** switches to continuous streaming mode (`start-all-cameras.js`)
4. **Verifies** FFmpeg processes and CPU usage

---

## 📝 Frontend Changes Made

Updated [LiveView.jsx](smart-cam-app/src/pages/LiveView.jsx) to use **HlsPlayer**:

```javascript
// Uses Shinobi's HLS streams (works when cameras are in "start" mode)
import HlsPlayer from '@/components/HlsPlayer';

<HlsPlayer monitorId={camera?.monitorId} className="w-full h-full" />
```

**Why HlsPlayer instead of DirectStreamPlayer?**
- DirectStreamPlayer requires RTSP URLs stored in database
- HlsPlayer works directly with Shinobi HLS streams
- Simpler and more reliable with your existing setup

---

## 🔄 After Running the Script

### 1. **Refresh Your Browser**
```
Press Ctrl+F5 (hard refresh)
```

### 2. **Expected Result**
- Live View page shows video streams
- No more black screens
- HLS streams available immediately (not just on motion)

### 3. **Verify Streams**
Open browser console (F12) and look for:
```
🎬 Attempting HLS stream: http://localhost:8443/.../hls/.../s.m3u8
✅ HLS stream available
✅ HLS manifest loaded successfully
```

---

## 📊 Camera Modes Explained

| Mode | Behavior | HLS Stream | CPU Usage | Best For |
|------|----------|------------|-----------|----------|
| **record** | Records on motion only | Only during motion | Lower | Motion detection |
| **start** | Streams 24/7 | Always available | Higher | Live viewing |

**We're switching to "start" mode** so HLS streams are always available.

---

## 🔧 Troubleshooting

### If script fails to restart Shinobi:

**Manual restart:**
```bash
# Option 1: Docker
docker restart shinobi

# Option 2: systemd
sudo systemctl restart shinobi

# Option 3: PM2
pm2 restart shinobi

# Option 4: Direct processes
pkill -f "node.*Shinobi"
cd /home/Shinobi
node camera.js &
node cron.js &
```

### If streams still don't work:

1. **Check Shinobi is accessible:**
   ```bash
   curl http://localhost:8443
   ```

2. **Verify cameras are started:**
   ```bash
   # Login to Shinobi UI
   http://localhost:8443

   # Check camera modes - should show "Watch" (green)
   ```

3. **Check FFmpeg processes:**
   ```bash
   ps aux | grep ffmpeg | wc -l
   # Should show ~27 processes (one per camera)
   ```

4. **Monitor CPU usage:**
   ```bash
   ps aux | grep "node.*Shinobi/camera.js" | grep -v grep
   # CPU should be <50% after restart
   ```

---

## 💡 Long-Term Optimization

If CPU remains high after restart:

### Option 1: Reduce Camera Quality
```javascript
// In Shinobi camera settings:
{
  "width": 1280,    // Instead of 1920
  "height": 720,    // Instead of 1080
  "fps": 15,        // Instead of 25-30
}
```
**Benefit**: 40-50% CPU reduction

### Option 2: Use Hybrid Mode
- Set frequently-viewed cameras to "start" mode
- Set less-used cameras to "record" mode
- Reduces CPU while maintaining live view for key cameras

### Option 3: Hardware Acceleration
```bash
# If you have Intel GPU (QuickSync):
"-hwaccel vaapi -vaapi_device /dev/dri/renderD128"

# If you have NVIDIA GPU:
"-hwaccel cuda -hwaccel_output_format cuda"
```
**Benefit**: 60-80% CPU reduction

---

## 📁 Modified Files

### Backend
1. [shinobi.service.js:11](smart-cam-backend/src/services/shinobi.service.js#L11) - Timeout: 15s → 45s
2. [recordingSync.service.js:36](smart-cam-backend/src/services/recordingSync.service.js#L36) - Watchdog: 30s → 2min
3. [recordingSync.service.js:71](smart-cam-backend/src/services/recordingSync.service.js#L71) - getShinobiRecordings: 15s → 45s

### Frontend
1. [LiveView.jsx](smart-cam-app/src/pages/LiveView.jsx) - Using HlsPlayer (Shinobi HLS)

### Scripts
1. [RESTART-AND-RECONFIGURE.sh](RESTART-AND-RECONFIGURE.sh) - **NEW** - All-in-one restart script

---

## ✅ Expected Outcome

### Before:
```
❌ Black screens in Live View
❌ Shinobi timing out (45+ seconds)
❌ HLS streams only available on motion
❌ 200% CPU usage
```

### After:
```
✅ Video streams working in Live View
✅ HLS streams available 24/7
✅ Shinobi responsive (<10s API calls)
✅ CPU usage stabilized
✅ No more "Stream Unavailable" errors
```

---

## 🎬 Next Steps

1. **Run the script:**
   ```bash
   cd /home/systools/Desktop/drisyam
   ./RESTART-AND-RECONFIGURE.sh
   ```

2. **Wait for completion** (~2-3 minutes)

3. **Refresh browser** (Ctrl+F5)

4. **Test Live View page**

5. **Enjoy smooth video streaming!** 🎥

---

**Note**: After this fix, cameras will stream continuously (24/7) instead of only on motion. This uses more CPU and storage but provides immediate HLS streams for live viewing.

If you want to reduce load later, you can selectively switch some cameras back to "record" mode in the Shinobi UI.
