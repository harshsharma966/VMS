# 04 — Architecture Deep-Dive

## Live Streaming Architecture

### How a Camera Stream Reaches the Browser

```
Camera (RTSP H.264)
  └─► Shinobi FFmpeg process (per camera)
        ├─► HLS segments (.ts) → RAM disk /dev/shm/streams/{groupKey}/{monitorId}/
        │      s0.ts, s1.ts, s2.ts ...  (2-second segments)
        │      s.m3u8  (playlist file updated every 2s)
        └─► Shinobi HTTP: GET /shinobi/{apiKey}/hls/{groupKey}/{monitorId}/s.m3u8
                └─► Nginx /shinobi/ proxy
                        └─► Browser HLS.js player
```

### Why H.264 copy mode matters

Before: cameras were HEVC (H.265) → required FFmpeg to transcode to H.264 for browsers → 16 cameras × ~100% CPU = server crash.

After: NVR configured to output H.264 → `vcodec: copy` in Shinobi → zero transcoding → server load **0.3**.

**Never change NVR codec back to HEVC** without updating `stream_vcodec` in `shinobi.service.js`.

---

## Recording Architecture

```
Shinobi FFmpeg (vcodec: copy)
  └─► Fragmented MP4 every 15 minutes
        → /home/Shinobi/videos/{groupKey}/{monitorId}/YYYY-MM-DDTHH-MM-SS.mp4
              └─► recordingSync.service.js (every 5 minutes)
                      └─► Downloads from Shinobi HTTP API
                              └─► Uploads to S3: recordings/{userId}/{group}/{camera}/{date}/{file}
                                      └─► Saves path in backend MySQL DB
```

### Why `time_limit: '15'` is critical

`time_limit` must be inside the Shinobi `details` JSON (not a top-level field). If missing:
- Shinobi records one continuous file that **never closes**
- S3 sync only uploads **closed** files
- Result: nothing uploads to S3

This is set in `_buildShinobiConfig()` inside `details`.

### Why Fragmented MP4 (fMP4)?

`cust_record: '-movflags frag_keyframe+empty_moov+default_base_moof+faststart'`

Regular MP4 writes the `moov` atom (index) at the end. If FFmpeg crashes mid-recording, the file is unplayable. fMP4 writes self-contained fragments every keyframe (~2-4s), so even a crashed recording is partially playable.

---

## Camera Configuration Flow

When you add a camera or call `/reconfigure`:

```
cameraGroup.controller.js → reconfigureGroup()
    └─► for each camera:
            1. shinobiService.configureMonitor()   # PUT camera config to Shinobi API
            2. shinobiService.startMonitor()       # GET /record  (starts FFmpeg)
```

**Important:** Always use `/record` endpoint, NOT `/start`.
- `/start` = HLS only, no MP4 recording
- `/record` = MP4 recording + HLS stream

---

## Auth Architecture

- JWT access token: 15-minute expiry, stored in `localStorage` as `auth_token`
- JWT refresh token: 7-day expiry
- `<video>` and `<img>` tags cannot send custom headers → pass token as `?token=` query param
- `authenticate.js` middleware checks `req.headers.authorization` first, then `req.query.token`

---

## S3 Key Structure

```
recordings/{userId}/{groupName}/{cameraName}/{YYYY-MM-DD}/{filename}
```

Example:
```
recordings/3/office-12/camera-01/2026-03-25/2026-03-25T10-00-00.mp4
```

- Date is at depth [4] — **cannot use S3 prefix to filter by date**
- Must list all keys and filter post-list

---

## Watchdog

`recordingSync.service.js` runs two loops:

| Loop | Interval | What it does |
|---|---|---|
| S3 Sync | Every 5 minutes | Downloads closed MP4s from Shinobi → uploads to S3 |
| Monitor Watchdog | Every 2 minutes | Checks all cameras in Shinobi; if not recording, restarts them |

Watchdog logic:
- If `status !== 'Recording'` → call `startMonitor()` (with 45s cooldown per camera)
- Skips cameras with `mode=stop` (manually disabled by admin)

---

## Thumbnail System

```
GET /api/groups/:id/recordings/thumbnail?key=recordings/...
    └─► Check Redis cache (7-day TTL, key: thumbnail:v1:{s3Key})
            └─► Cache miss: presigned S3 URL → FFmpeg extracts first frame
                    └─► Return JPEG + cache in Redis
```

- Semaphore limits 6 concurrent FFmpeg processes (`src/utils/semaphore.js`)
- Browser caches thumbnails 24h via `Cache-Control: public, max-age=86400`

---

## Redis Caching

| Cache key | TTL | Content |
|---|---|---|
| `thumbnail:v1:{s3key}` | 7 days | JPEG bytes of first frame |
| `recordings:{userId}:{groupName}:{date}` | 2 minutes | Recording list |

Redis is **optional** — the backend starts fine without it (graceful fallback in `src/config/redis.js`).
