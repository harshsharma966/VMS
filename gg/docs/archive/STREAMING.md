# Live Stream Architecture — Drisyam VMS

## Overview

Live streaming uses **Shinobi VMS** (Docker) as the engine. Shinobi pulls the RTSP feed
from each camera and transcodes it to HLS. The browser plays the HLS playlist directly
from Shinobi using `hls.js`.

```
Camera (RTSP) ──► Shinobi/FFmpeg ──► HLS segments (RAM) ──► Browser (hls.js)
                       ▲
                  Our backend triggers start/stop
```

---

## Full Request Flow (step by step)

### 1. User opens LiveView page
`LiveView.jsx` renders. On mount it calls `releaseAllStreams()` on unmount cleanup.

### 2. Camera tile renders → `DirectStreamPlayer` mounts
`DirectStreamPlayer.jsx` receives `monitorId` as a prop.

### 3. `getStreamUrls(monitorId)` called
`streamCache.js` → checks in-memory URL cache → if miss, calls backend:

```
GET /api/stream/start/:monitorId
Authorization: Bearer <JWT>
```

Cache prevents duplicate calls when multiple tabs show the same camera.

### 4. Backend `stream.controller.js` → `startStream`
- Looks up `camera` + `user` from DB (needs `user.apiKey` + `user.groupKey`)
- Calls `streamService.startStream(camera, user)`

### 5. `stream.service.js` → `startStream`
- Calls `shinobiService.startMonitor(apiKey, groupKey, monitorId)`
  → `GET http://localhost:8443/{apiKey}/monitor/{groupKey}/{monitorId}/start`
- Builds HLS URL: `http://localhost:8443/{apiKey}/hls/{groupKey}/{monitorId}/s.m3u8`
- Returns `{ hlsUrl, provider: 'shinobi' }`

### 6. Backend responds with HLS URL
```json
{
  "ok": true,
  "monitorId": "07687cfbda87457197a751a0",
  "hlsUrl": "http://localhost:8443/f07483f.../hls/6b17427.../07687cfb.../s.m3u8",
  "provider": "shinobi"
}
```

### 7. `streamCache.js` caches the URL (session-scoped)
Subsequent calls for the same `monitorId` return from cache immediately (no backend call).

### 8. `DirectStreamPlayer.jsx` loads the HLS URL
- Native HLS (Safari): sets `video.src` directly
- All other browsers: uses `hls.js`, calls `hls.loadSource(hlsUrl)` + `hls.attachMedia(video)`

### 9. `hls.js` polls `s.m3u8` and plays segments
HLS.js retries the manifest up to **30 times** (1 s delay each) to handle the ~5–10 s
Shinobi startup delay before the first segments appear.

### 10. On component unmount
`releaseStream(monitorId)` clears the cache entry.
`releaseAllStreams()` is called when the user leaves LiveView.

---

## Key Files

| File | Role |
|---|---|
| `smart-cam-app/src/pages/LiveView.jsx` | Page shell, camera list, grid/single layout |
| `smart-cam-app/src/components/DirectStreamPlayer.jsx` | HLS video player (hls.js + native) |
| `smart-cam-app/src/services/streamCache.js` | URL cache, dedup concurrent calls |
| `smart-cam-backend/src/routes/stream.routes.js` | `GET /api/stream/start/:monitorId` etc. |
| `smart-cam-backend/src/controllers/stream.controller.js` | Validates camera ownership, calls service |
| `smart-cam-backend/src/services/stream.service.js` | Calls Shinobi API, builds HLS URL |
| `smart-cam-backend/src/services/shinobi.service.js` | Shinobi HTTP API wrapper + FFmpeg config |

---

## Shinobi Internals

### Where HLS segments live (RAM disk)
```
/dev/shm/streams/{groupKey}/{monitorId}/
  s.m3u8       ← HLS playlist (updated every ~2 s)
  s01.ts       ← Segment 1
  s02.ts       ← Segment 2 …
  cmd.txt      ← JSON: FFmpeg command Shinobi is running
  icon.jpg     ← Snapshot (if snap enabled)
```

### Shinobi API endpoints used
| Endpoint | Purpose |
|---|---|
| `GET /{apiKey}/monitor/{groupKey}` | List all monitors |
| `GET /{apiKey}/monitor/{groupKey}/{mid}` | Get one monitor |
| `POST /{apiKey}/configureMonitor/{groupKey}/{mid}` | Create/update monitor config |
| `GET /{apiKey}/monitor/{groupKey}/{mid}/start` | Start monitor (HLS mode) |
| `GET /{apiKey}/monitor/{groupKey}/{mid}/stop` | Stop monitor |
| `GET /{apiKey}/monitor/{groupKey}/{mid}/delete` | Delete monitor |
| `GET /{apiKey}/hls/{groupKey}/{mid}/s.m3u8` | HLS playlist (served by Shinobi) |

### Credentials (from `.env`)
```
SHINOBI_URL=http://localhost:8443
SHINOBI_API_KEY=f07483f48995f5ada7e2033d6c7b34a4     ← auth (user's API key)
SHINOBI_GROUP_KEY=6b17427adfc70df0b5415ffd73a1e243   ← ke (user's group key)
SHINOBI_SUPER_API_KEY=drishyam-super-token-123
```
All users share the **same** single Shinobi account (single-tenant setup).
`apiKey` and `groupKey` are stored on each `User` row in the app DB.

---

## FFmpeg Config (inside Shinobi)

Set in `shinobi.service.js` → `_buildShinobiConfig()` → `details` JSON field.

### Live stream (HLS transcode)
```
Input:   -rtsp_transport tcp -stimeout 3000000 -fflags nobuffer -flags low_delay
Codec:   -c:v libx264 (transcode H.264 for browser compatibility)
Output:  HLS, 2 s segments, 5-segment rolling window
Flags:   -preset ultrafast -tune zerolatency -g 50 -keyint_min 50 -sc_threshold 0
```

### Recording (MP4 to disk)
```
Codec:   -c:v copy  (remux only — no re-encode, ~50% CPU saving)
Flags:   -movflags frag_keyframe+empty_moov+default_base_moof+faststart
         → fragmented MP4 (fMP4): playable even if FFmpeg crashes mid-recording
```

---

## Critical Rules & Known Pitfalls

### ❌ DO NOT add `-reconnect` flags to `cust_input`
```
# BROKEN — causes FFmpeg 4.1.6 (Shinobi's Docker version) to exit immediately:
-reconnect 1 -reconnect_at_eof 0 -reconnect_streamed 1 -reconnect_delay_max 2

# These are HTTP-only flags, not RTSP flags. FFmpeg exits with:
# "Option reconnect not found"
# Result: zombie [ffmpeg] <defunct> process, no HLS segments ever generated.
```
`cust_input` must only contain RTSP-compatible flags.

### ❌ DO NOT call `hls.startLoad()` on NETWORK_ERROR
HLS.js retries automatically up to `manifestLoadingMaxRetry`. Calling `startLoad()` on
a fatal NETWORK_ERROR resets the retry counter → infinite loop → stream appears to buffer
forever with no error shown. Let HLS.js exhaust retries naturally, then show the error UI.

### ❌ Changing Shinobi monitor config does NOT take effect immediately
`configureMonitor` API updates Shinobi's MySQL DB. The new config only applies when the
monitor is **stopped and restarted**. cmd.txt is regenerated at start time from the DB.

To apply config changes:
```bash
# Via Shinobi API
curl http://localhost:8443/{apiKey}/monitor/{groupKey}/{mid}/stop
sleep 2
curl http://localhost:8443/{apiKey}/monitor/{groupKey}/{mid}/start

# To verify new config was applied:
docker exec shinobi cat /dev/shm/streams/{groupKey}/{mid}/cmd.txt | python3 -m json.tool | grep cust
```

### ⚠️ `reconfigureGroup` API → Shinobi may not update DB correctly
The backend `POST /api/groups/:id/reconfigure` calls Shinobi's `configureMonitor` API.
If Shinobi returns `ok: false` (silently caught by `tryShinobi`), the DB is NOT updated.
**Always verify** by querying the Shinobi DB directly:
```bash
docker exec shinobi bash -c "mysql -h127.0.0.1 -umajesticflame -p'' ccio \
  -e 'SELECT details FROM Monitors WHERE mid=\"{mid}\";' 2>/dev/null"
```
If the API method fails, update the Shinobi DB directly with Python (see fix script below).

### ⚠️ Multiple backend processes accumulate
Running `npm run dev` (nodemon) multiple times leaves zombie nodemon + node processes.
If the backend stops responding unexpectedly, check for multiple processes on port 5000:
```bash
ps aux | grep "node src/server\|nodemon"
fuser 5000/tcp
```
Kill all and restart cleanly with `node src/server.js`.

---

## `hls.js` Settings (`DirectStreamPlayer.jsx`)

```js
{
  manifestLoadingTimeOut:    10000,   // 10 s per manifest fetch attempt
  manifestLoadingMaxRetry:   30,      // retry for up to ~30 s before giving up
  manifestLoadingRetryDelay: 1000,    // 1 s between retries
  levelLoadingTimeOut:       10000,
  levelLoadingMaxRetry:      10,
  fragLoadingTimeOut:        20000,
  fragLoadingMaxRetry:       6,
  lowLatencyMode:            false,   // must be false for standard HLS
  backBufferLength:          60,
  maxBufferLength:           20,
}
```

`manifestLoadingMaxRetry: 30` gives Shinobi ~30 s to start FFmpeg and generate the first
HLS segment before HLS.js gives up and shows the "Stream Unavailable" error.

---

## Debugging Checklist

If a camera stream is not loading:

1. **Check Shinobi is running**
   ```bash
   docker ps | grep shinobi
   curl http://localhost:8443/
   ```

2. **Check HLS segments exist**
   ```bash
   docker exec shinobi ls /dev/shm/streams/{groupKey}/{monitorId}/
   # Should see: s.m3u8, s01.ts, s02.ts …
   # Only cmd.txt + icon.jpg = FFmpeg failed to start
   ```

3. **Check cmd.txt for bad FFmpeg flags**
   ```bash
   docker exec shinobi cat /dev/shm/streams/{groupKey}/{monitorId}/cmd.txt | python3 -m json.tool | grep -A1 '"cmd"'
   # Look for "-reconnect" → BROKEN, must be removed
   ```

4. **Check for FFmpeg zombie processes**
   ```bash
   docker exec shinobi ps aux | grep ffmpeg
   # [ffmpeg] <defunct> = FFmpeg exited immediately (bad flags or camera unreachable)
   ```

5. **Test FFmpeg manually inside Docker**
   ```bash
   docker exec -it shinobi bash
   ffmpeg -rtsp_transport tcp -stimeout 3000000 \
     -i "rtsp://admin:pass@IP:554/Streaming/Channels/101" \
     -t 5 -f null -
   # Should show video stream info. If "Option reconnect not found" → wrong flags.
   ```

6. **Test the HLS URL directly**
   ```bash
   curl "http://localhost:8443/{apiKey}/hls/{groupKey}/{monitorId}/s.m3u8"
   # Should return #EXTM3U playlist
   # "File Not Found" = Shinobi returned 200 OK but FFmpeg didn't create the file
   ```

7. **Force restart the monitor**
   ```bash
   curl "http://localhost:8443/{apiKey}/monitor/{groupKey}/{monitorId}/stop"
   sleep 3
   curl "http://localhost:8443/{apiKey}/monitor/{groupKey}/{monitorId}/start"
   sleep 8
   # Then recheck step 2
   ```

8. **Check backend is running**
   ```bash
   curl http://localhost:5000/api/health
   ```

9. **Check frontend is calling the right endpoint**
   - Open browser DevTools → Network tab → filter by `stream`
   - Should see `GET /api/stream/start/{monitorId}` → 200 with `hlsUrl`
   - Then HLS.js fetching `s.m3u8` from Shinobi

10. **Shinobi DB vs running config mismatch**
    If you updated config via `reconfigureGroup` but the stream still uses old flags,
    the monitor was NOT restarted. Stop → start each monitor after any config change.

---

## Config Change Procedure

When you change FFmpeg flags in `shinobi.service.js`:

1. Restart the backend so the new JS code is loaded:
   ```bash
   pkill -f "node src/server.js"; node src/server.js &
   ```

2. Call `POST /api/groups/:groupId/reconfigure` (or use the app UI button).
   This pushes the new config to Shinobi's DB.

3. **Verify** the DB was actually updated:
   ```bash
   docker exec shinobi bash -c "mysql -h127.0.0.1 -umajesticflame -p'' ccio \
     -e 'SELECT details FROM Monitors WHERE ke=\"{groupKey}\" LIMIT 1;' 2>/dev/null" \
     | python3 -c "import sys,json; d=json.loads(sys.stdin.readlines()[1]); print(d.get('cust_input'))"
   ```

4. Stop and start all monitors to apply:
   ```bash
   for MID in $(mysql -u drishyam -pDrishyam@2026 drishyamvms -se "SELECT monitor_id FROM cameras;"); do
     curl -s "http://localhost:8443/{apiKey}/monitor/{groupKey}/$MID/stop" > /dev/null
   done
   sleep 3
   for MID in $(mysql -u drishyam -pDrishyam@2026 drishyamvms -se "SELECT monitor_id FROM cameras;"); do
     curl -s "http://localhost:8443/{apiKey}/monitor/{groupKey}/$MID/start" > /dev/null
   done
   ```

5. Wait ~10 s then check for HLS segments (step 2 above).

---

## What Was Fixed (2026-02-22)

**Problem:** All cameras showing "Connecting to camera…" forever, never playing or showing error.

**Root causes found:**

1. **FFmpeg zombie processes** — `cust_input` contained `-reconnect 1 -reconnect_at_eof 0
   -reconnect_streamed 1 -reconnect_delay_max 2`. These are HTTP-only flags. FFmpeg 4.1.6
   inside Shinobi's Docker exits immediately with "Option reconnect not found". Result: no
   HLS segments, `s.m3u8` never created.
   **Fix:** Removed all `-reconnect*` flags from `cust_input` in `shinobi.service.js`.

2. **HLS.js infinite retry loop** — On fatal NETWORK_ERROR, the error handler called
   `hls.startLoad()`, which resets the retry counter. HLS.js kept retrying indefinitely,
   showing the loading spinner forever instead of the error screen.
   **Fix:** Removed `hls.startLoad()` call. Let HLS.js exhaust its `manifestLoadingMaxRetry`
   naturally, then show "Stream Unavailable".

3. **`streamCache.js` never started the monitor** — Old version called
   `shinobiService.getShinobiHlsUrl()` which only built the URL string without calling
   Shinobi's `/start` endpoint. Shinobi had no FFmpeg process running.
   **Fix:** Changed to call `api.get('/stream/start/${monitorId}')` which goes through the
   backend and calls `shinobiService.startMonitor()`.

4. **Shinobi config update not persisting** — After fixing `cust_input` in code and calling
   `reconfigureGroup`, the Shinobi DB still had the old flags. The API returned `ok: false`
   silently. Direct MySQL update inside the Docker container was required, then monitor
   restart to regenerate `cmd.txt`.
