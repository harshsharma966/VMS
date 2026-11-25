# Drisyam VMS — Complete System Architecture & Data Flow

> **Stack**: Node.js/Express (port 5000) · React/Vite (port 5173) · Shinobi VMS (port 8443) · NetForChoice S3 · Redis · MySQL

---

## 1. Workspace Layout

```
drisyam/
├── smart-cam-backend/          Node.js API server (port 5000)
│   ├── src/
│   │   ├── server.js           Entry point
│   │   ├── app.js              Express app factory
│   │   ├── config/             env, database, cors, logger, redis
│   │   ├── models/             Sequelize models (User, Camera, CameraGroup, …)
│   │   ├── routes/             Route definitions
│   │   ├── controllers/        Request handlers
│   │   ├── services/           Business logic (auth, s3, shinobi, stream, sync)
│   │   ├── middleware/         authenticate, authorize, errorHandler, rateLimiter
│   │   └── utils/              semaphore, helpers
│   └── streams/                HLS segments written here at runtime
│
└── smart-cam-app/              React frontend (port 5173)
    └── src/
        ├── main.jsx            Entry point (BrowserRouter + QueryClient + Theme)
        ├── App.jsx             Routes + protected layout
        ├── store/              Zustand stores (authStore)
        ├── services/           api.js, auth.js, cameraGroup.js, recordings.js
        ├── components/         HLSPlayer, DirectStreamPlayer, Sidebar, Topbar …
        └── pages/              LiveView, Timeline, Devices, Cameras, Dashboard …
```

---

## 2. Boot Sequence

### Backend (`server.js`)
```
1. Load .env  →  Joi validates required vars (fail-fast on missing)
2. Sequelize.authenticate()  →  confirms DB connection
3. Sequelize.sync()  →  (dev only) auto-migrate models
4. Express listen :5000
5. recordingSync.start()  →  starts two background timers:
       • S3 sync loop    — every 5 min
       • Monitor watchdog — every 2 min
6. SIGTERM/SIGINT  →  graceful shutdown (close server → stop sync → close DB)
```

### Express App (`app.js`)
```
Helmet (security headers)
↓
CORS (origins from CORS_ORIGINS env)
↓
Body parser (10 KB limit)
↓
Rate limiter on /api/*
↓
Static /streams  →  serves HLS .m3u8 / .ts files
↓
Routes:
  /api/auth/*
  /api/groups/*
  /api/stream/*
  /health
↓
Centralized error handler (errorHandler.js)
```

### Frontend (`main.jsx`)
```
BrowserRouter
└── QueryClientProvider (React Query v5)
    └── ThemeProvider (dark / light)
        └── TooltipProvider (Radix UI)
            └── App.jsx  →  route tree
```

---

## 3. Authentication Flow

### 3.1 Login (Call → Receive)

```
Browser                        Frontend                         Backend
  │                               │                                │
  │  Submit email + password       │                                │
  │──────────────────────────────>│                                │
  │                               │  POST /api/auth/login          │
  │                               │  { email, password }           │
  │                               │──────────────────────────────>│
  │                               │                                │ 1. User.findOne(email)
  │                               │                                │ 2. bcrypt.compare(password, hash)
  │                               │                                │ 3. generateAccessToken()  → JWT 2h
  │                               │                                │ 4. generateRefreshToken() → JWT 30d
  │                               │                                │ 5. RefreshToken.create() in DB
  │                               │<──────────────────────────────│
  │                               │  { token, refreshToken, user } │
  │                               │                                │
  │                               │ localStorage.setItem:          │
  │                               │   auth_token = token           │
  │                               │   refresh_token = refreshToken │
  │                               │   user = JSON.stringify(user)  │
  │                               │ Zustand: { user, isAuthenticated: true }
  │<──────────────────────────────│                                │
  │  Redirect to /home             │                                │
```

### 3.2 Every Authenticated Request

```
Frontend api.js (Axios interceptor)
  → reads localStorage.auth_token
  → adds header:  Authorization: Bearer <token>
  → sends request

Backend authenticate.js middleware
  → reads Authorization header  OR  ?token= query param
  → jwt.verify(token, JWT_SECRET)
  → attaches req.user = { id, email, role }
  → next()
```

### 3.3 Token Expiry & Silent Refresh

```
Request fails with 401
↓
Interceptor queues request
↓
POST /api/auth/refresh-token  { refreshToken }
  → Backend: verify refresh token, check DB (not revoked)
  → Revoke old refresh token
  → Issue new access + refresh token pair
  → Store new refresh token in DB
↓
Save new tokens to localStorage
↓
Retry all queued requests with new access token
↓
If refresh also fails → clear localStorage → redirect /login
```

### 3.4 Token in Query Params (Video / Image Tags)

```
<video> and <img> cannot set custom headers.

Frontend builds URL:
  /api/groups/{groupId}/recordings/stream?key={s3key}&token={auth_token}

Backend authenticate.js:
  1. Check Authorization header  → not present
  2. Fallback: check req.query.token
  3. Verify JWT
  4. Proceed
```

---

## 4. Camera Group Lifecycle

### 4.1 Create Group + Auto-Provision Cameras

```
Frontend                              Backend                          Shinobi VMS
  │                                      │                                │
  │  POST /api/groups                    │                                │
  │  { name, host, port, username,       │                                │
  │    password, totalChannels,          │                                │
  │    deviceType }                      │                                │
  │─────────────────────────────────────>│                                │
  │                                      │ 1. CameraGroup.create()        │
  │                                      │    (userId from req.user.id)   │
  │                                      │                                │
  │                                      │ 2. Loop ch = 1 → totalChannels │
  │                                      │    monitorId = UUID            │
  │                                      │    RTSP path by deviceType:    │
  │                                      │      hikvision → /Streaming/   │
  │                                      │                    Channels/ch │
  │                                      │      dahua → /cam/realmonitor  │
  │                                      │──────────────────────────────>│
  │                                      │  POST /{apiKey}/configureMonitor
  │                                      │  /{groupKey}/{monitorId}       │
  │                                      │  { data: JSON.stringify(       │
  │                                      │      _buildShinobiConfig() ) } │
  │                                      │<──────────────────────────────│
  │                                      │  { ok: true }                  │
  │                                      │                                │
  │                                      │ 3. Camera.create() in DB       │
  │                                      │    (for each channel)          │
  │<─────────────────────────────────────│                                │
  │  { group, cameras[] }                │                                │
```

### 4.2 Shinobi Config Built Per Camera

```javascript
_buildShinobiConfig({
  name, host, port, path,
  username, password,       // password: encodeURIComponent(password) ← fixes @ chars
  type, width, height, fps,
  groupKey, monitorId
})

Produces Shinobi monitor JSON:
  mode: "record"                         // records to Shinobi local disk
  type: "rtsp"
  host: "rtsp://{user}:{pass}@{host}:{port}{path}"
  fps: 25
  width: 1920, height: 1080
  vcodec: "copy"                         // passthrough (fast, no re-encode)
  cust_record: "-movflags +faststart"   // moov atom at FRONT for new recordings
```

### 4.3 Sync Camera Status

```
Frontend clicks "Refresh"
↓
POST /api/groups/{groupId}/sync
↓
Backend:
  shinobi.getCameras(apiKey, groupKey)
  → GET /{apiKey}/monitor/{groupKey}
  → returns array of monitors with mode field

  For each DB camera:
    shinobiCamera = find by monitorId
    status = shinobiCamera?.mode === 'start' | 'record' ? 'online' : 'offline'
    Camera.update({ status })

  Return: { groupStatus, cameras: [{ id, name, status, monitorId }] }
↓
Frontend updates UI (green/red dot per camera)
```

---

## 5. Recording Sync (Background Job)

### 5.1 S3 Sync Loop (every 5 minutes)

```
recordingSync.service.js — syncCycle()

For each User:
  For each CameraGroup:
    For each Camera:
      ──────────────────────────────────────────────────────
      1. FETCH from Shinobi:
         GET /{apiKey}/videos/{groupKey}/{monitorId}
         → [ { filename, time, size } ]

      2. FILTER:
         Skip if file is <2 min old (still being written)
         Skip if already in uploadedFiles Set (in-memory)

      3. CHECK S3:
         s3.headObject( recordings/{userId}/{group}/{cam}/{date}/{filename} )
         Skip if already exists (idempotent)

      4. DOWNLOAD from Shinobi:
         GET /{apiKey}/videos/{groupKey}/{monitorId}/{filename}
         → Buffer

      5. UPLOAD to S3:
         s3.putObject( key, buffer, "video/mp4" )
         Retries: up to 3×, exponential backoff (1s, 2s, 4s)
         Files >5 MB → multipart upload (5 MB chunks)

      6. MARK uploaded:
         uploadedFiles.add(filename)
      ──────────────────────────────────────────────────────
```

### 5.2 Monitor Watchdog (every 2 minutes)

```
recordingSync.service.js — watchdogCycle()

For each Camera in DB:
  GET Shinobi status (mode field)
  If mode is NOT 'start' or 'record':
    Check cooldown: skip if restarted <45s ago
    POST /monitor/restart/{monitorId}
    Log: "Restarted crashed monitor: {name}"
  (Errors caught silently, log only)
```

### 5.3 S3 Key Structure

```
recordings / {userId} / {groupName-slug} / {cameraName-slug} / {YYYY-MM-DD} / {filename}
                                                                ↑
                                              Date is at depth index [4].
                                              CANNOT filter by date using S3 prefix.
                                              Must list all keys, then filter post-list.
```

---

## 6. Recording Playback (Timeline Page)

### 6.1 List Recordings

```
Frontend (Timeline.jsx)
  │  GET /api/groups/{groupId}/recordings?date=YYYY-MM-DD
  │─────────────────────────────────────────────────────────>
  │
  Backend (cameraGroup.controller.js — getGroupRecordings)
  │
  │  1. Authenticate + verify group ownership
  │  2. Check Redis:
  │       key = "recordings:{userId}:{groupName}:{date}"
  │       HIT  → return cached list (JSON)
  │       MISS → continue
  │  3. s3.listGroupRecordings(userId, groupName, date)
  │       → ListObjectsV2 with prefix "recordings/{userId}/{groupName}/"
  │       → Filter keys where key.split('/')[4] === date
  │       → Sort by lastModified DESC
  │  4. Paginate (default: page=1, limit=50)
  │  5. Redis.setJSON(key, result, 300)  // 5-min TTL
  │<─────────────────────────────────────────────────────────
  │  { data: [ { key, cameraName, filename, size, lastModified } ],
  │    pagination: { page, limit, total, pages },
  │    cached: false }
```

### 6.2 Load Thumbnail

```
Frontend
  getThumbnailUrl(groupId, key)
  → builds URL (sync, no API call):
    /api/groups/{groupId}/recordings/thumbnail?key={s3key}&token={auth_token}

Browser loads <img src="{url}" loading="lazy">

Backend (getThumbnailForRecording)
  │
  │  1. authenticate (token from ?token=)
  │  2. Verify group ownership + key prefix
  │  3. Check Redis:
  │       key = "thumbnail:v1:{s3key}"
  │       HIT  → res.writeHead(200, JPEG headers) → res.end(buffer)
  │       MISS → continue
  │  4. Acquire semaphore (max 6 concurrent FFmpeg)
  │  5. s3.getPresignedUrl(s3key, 600)  → 10-min presigned URL
  │  6. Spawn FFmpeg:
  │       ffmpeg -ss 0 -i "{presignedUrl}"
  │              -vframes 1 -f image2 -vcodec mjpeg
  │              -  (output to stdout)
  │       (HTTP Range requests → only downloads beginning of file)
  │  7. Collect stdout Buffer
  │  8. redis.setBuffer("thumbnail:v1:{key}", buffer, 604800)  // 7 days
  │  9. res.writeHead(200, {
  │       'Content-Type': 'image/jpeg',
  │       'Cache-Control': 'public, max-age=86400',
  │       'Cross-Origin-Resource-Policy': 'cross-origin'
  │     })
  │     res.end(buffer)
  │  10. Release semaphore
```

### 6.3 Play Recording (Video Stream)

```
User clicks Play
  ↓
Frontend: getStreamUrl(groupId, key)
  → /api/groups/{groupId}/recordings/stream?key={s3key}&token={auth_token}
  → <video src="{url}" controls>

Backend (streamRecording)
  │
  │  1. authenticate + verify group ownership + verify key prefix
  │  2. s3.getStreamUrl(key, 600)  → 10-min presigned URL
  │  3. Spawn FFmpeg:
  │       ffmpeg -i "{presignedUrl}"
  │              -c copy
  │              -movflags frag_keyframe+empty_moov+default_base_moof
  │              -f mp4
  │              -  (output to stdout)
  │     WHY: Shinobi records moov atom at END → browser can't stream.
  │          FFmpeg remuxes to fragmented MP4 (moov at FRONT, self-contained
  │          fragments) → browser plays from first byte.
  │  4. Wait for first stdout chunk (confirm FFmpeg is producing output)
  │  5. Send HTTP 200:
  │       Content-Type: video/mp4
  │       Transfer-Encoding: chunked
  │       Cross-Origin-Resource-Policy: cross-origin
  │       (override Helmet's same-origin default)
  │  6. Pipe FFmpeg stdout → response
  │
  │  ON FAILURE (FFmpeg exits before first chunk):
  │  7. res.redirect(302, presignedUrl)
  │       → Browser downloads directly from S3
  │       → Frontend retries with getPlaybackUrl() (fresh 7-day presigned URL)
```

---

## 7. Live Streaming (LiveView Page)

### 7.1 Start Live Stream

```
Frontend (DirectStreamPlayer / HLSPlayer.jsx)
  │
  │  GET /api/stream/start/{monitorId}
  │──────────────────────────────────>
  │
  Backend (stream.controller.js → stream.service.js)
  │
  │  1. Find Camera in DB (get RTSP credentials)
  │  2. Build RTSP URL:
  │       rtsp://{user}:{encodeURIComponent(pass)}@{host}:{port}{path}
  │  3. mkdir /streams/{monitorId}/
  │  4. Spawn FFmpeg:
  │       ffmpeg -rtsp_transport tcp
  │              -i "{rtspUrl}"
  │              -c:v libx264 -preset ultrafast -crf 23
  │              -maxrate 4000k -bufsize 8000k
  │              -c:a aac -b:a 128k         ← AAC audio (HLS-compatible)
  │              -hls_time 2
  │              -hls_list_size 3
  │              -hls_flags delete_segments+omit_endlist
  │              /streams/{monitorId}/stream.m3u8
  │  5. Store process in activeStreams Map { monitorId → { process, lastAccess } }
  │  6. Set inactivity timer: kill after 5min idle
  │<──────────────────────────────────
  │  { url: "/streams/{monitorId}/stream.m3u8" }
  │
  │  HLS.js loads m3u8:
  │    GET http://localhost:5000/streams/{monitorId}/stream.m3u8
  │    GET http://localhost:5000/streams/{monitorId}/0.ts
  │    GET http://localhost:5000/streams/{monitorId}/1.ts  …
  │  (Express static middleware serves these)
  │
  │  HLS.js config (low-latency tuned):
  │    liveSyncDuration: 4       (4s behind live edge)
  │    liveMaxLatencyDuration: 15
  │    maxLiveSyncPlaybackRate: 1.1
  │    fragLoadingMaxRetry: 6
  │    manifestLoadingMaxRetry: 4
```

### 7.2 Stream Lifecycle

```
activeStreams Map:
  {
    "{monitorId}": {
      process: ChildProcess,  // FFmpeg
      lastAccess: Date,
      timer: NodeTimer        // 5-min inactivity kill
    }
  }

Every request to start/check resets lastAccess.
Timer fires → kill process → remove dir → delete from Map.

isStreamActive(monitorId):
  process exists AND /streams/{monitorId}/stream.m3u8 is non-empty
```

---

## 8. S3 Storage Operations

### 8.1 Upload (Recording Sync)

```
s3.uploadRecording(userId, groupName, cameraName, filename, buffer, contentType, date)
  ↓
buildRecordingKey() → "recordings/{userId}/{group-slug}/{cam-slug}/{date}/{filename}"
  ↓
if buffer.length > 5MB:
  createMultipartUpload()
  uploadPart() × N  (parallel 5MB chunks)
  completeMultipartUpload()
else:
  putObject()
  ↓
Retry on error (up to 3×, exponential backoff: 1s → 2s → 4s)
```

### 8.2 Presigned URL Types

| Use           | Method              | Expiry   | Content-Disposition |
|---------------|---------------------|----------|---------------------|
| Playback      | GetObject           | 7 days   | inline              |
| FFmpeg stream | GetObject           | 10 min   | inline              |
| Download      | GetObject           | 24 hours | attachment          |
| Thumbnail     | GetObject           | 10 min   | — (piped to FFmpeg) |

### 8.3 List Recordings

```
s3.listGroupRecordings(userId, groupName, date)
  ↓
ListObjectsV2({ Bucket, Prefix: "recordings/{userId}/{groupName}/" })
  ↓ (may paginate with ContinuationToken for >1000 objects)
Filter: key.split('/')[4] === date   ← date is at depth index 4
  ↓
Return: [ { key, filename, size, lastModified, cameraName } ]
```

---

## 9. Redis Caching

```
                ┌─────────────────────────────────────────────┐
                │              Redis Cache                     │
                │                                             │
                │  "thumbnail:v1:{s3key}"   →  Buffer  7 days │
                │  "recordings:{uid}:{grp}:{date}" → JSON 5min│
                └─────────────────────────────────────────────┘
                          ↑                  ↑
              getThumbnail()           getGroupRecordings()
```

**Graceful Degradation**: If `REDIS_URL` absent or Redis unreachable:
- `getBuffer/getJSON` return `null` (cache miss)
- `setBuffer/setJSON` silently no-op
- Application continues without cache (slower but functional)

---

## 10. Access Control Model

```
Every request:
  authenticate()  →  req.user = { id, email, role }
  authorize()     →  check req.user.role ∈ ['admin', 'user']

Data isolation:
  CameraGroup.findAll({ where: { userId: req.user.id } })
  Camera.findAll({ where: { userId: req.user.id } })

S3 key ownership check:
  if (!key.startsWith(`recordings/${req.user.id}/`)) → 403

User can only:
  • See their own groups/cameras
  • Stream/thumbnail their own recordings
  • Download their own files
```

---

## 11. Error Handling

### Backend

```
asyncHandler wraps all routes:
  async (req, res, next) => { ... }
  Catches promise rejections → next(error)

errorHandler.js:
  Sequelize UniqueConstraint    → 409 Conflict
  Sequelize ValidationError     → 400 Bad Request
  JWT JsonWebTokenError         → 401 Unauthorized
  JWT TokenExpiredError         → 401 Unauthorized (token expired)
  Custom AppError               → error.statusCode
  Everything else               → 500 Internal Server Error
  All 5xx → log with stack trace
  Response: { error: { message, status, ... } }
```

### Frontend

```
api.js Response Interceptor:
  401  →  attempt silent refresh (see §3.3)
  4xx  →  throw error (component handles)
  5xx  →  throw error (component handles)

HLSPlayer.jsx error handling:
  mediaError   →  hls.recoverMediaError() (up to 4 attempts)
  networkError →  setTimeout(reload, 3000)
  fatal        →  hls.destroy() + reinit
```

---

## 12. Complete API Reference

### Auth Routes (`/api/auth`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /register | — | Create account + Free plan |
| POST | /login | — | Get token pair |
| GET | /me | ✓ | Current user + subscription |
| POST | /refresh-token | — | Rotate tokens |
| POST | /logout | — | Revoke refresh token |
| POST | /forgot-password | — | Send reset email |
| POST | /reset-password | — | Set new password |
| PUT | /profile | ✓ | Update name/email |
| PUT | /change-password | ✓ | Change password |

### Camera Groups (`/api/groups`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | ✓ | List groups + cameras (syncs status) |
| POST | / | ✓ | Create group + provision cameras |
| GET | /:groupId | ✓ | Get single group |
| PUT | /:groupId | ✓ | Update group + add channels |
| DELETE | /:groupId | ✓ | Delete group + cameras |
| POST | /:groupId/sync | ✓ | Force status sync |
| DELETE | /:groupId/cameras/:monitorId | ✓ | Remove camera channel |
| POST | /:groupId/reconfigure | ✓ | Re-apply FFmpeg config |

### Recordings (`/api/groups/:groupId/recordings`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | ✓ | List recordings (paginated + cached) |
| GET | /play | ✓ | Fresh 7-day presigned URL |
| GET | /stream | ✓* | FFmpeg remux → fMP4 stream |
| GET | /thumbnail | ✓* | First-frame JPEG (cached) |
| GET | /download | ✓ | Forced-download signed URL |
| GET | /diagnose | ✓ | 5-step diagnostic |
| GET | /cameras/:monitorId/recordings | ✓ | Single camera recordings |

`✓*` = token accepted via `?token=` query param (for `<video>`/`<img>` tags)

### Live Streaming (`/api/stream`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /start/:monitorId | ✓ | Spawn FFmpeg RTSP→HLS |
| GET | /stop/:monitorId | ✓ | Kill FFmpeg process |
| GET | /status/:monitorId | ✓ | Check if stream active |

---

## 13. Frontend Page → API Call Map

| Page | API Calls |
|------|-----------|
| Login | POST /auth/login |
| Register | POST /auth/register |
| Home / Dashboard | GET /auth/me, GET /groups |
| Devices (Groups) | GET /groups, POST /groups, PUT /groups/:id, DELETE /groups/:id |
| Cameras | GET /groups (all cameras), POST /:groupId/sync |
| LiveView | GET /stream/start/:monitorId, GET /stream/status/:monitorId |
| Timeline | GET /:groupId/recordings?date=…, GET /thumbnail?key=…, GET /stream?key=… |
| Settings | PUT /auth/profile, PUT /auth/change-password |
| Forgot Password | POST /auth/forgot-password |
| Reset Password | POST /auth/reset-password |

---

## 14. Database Models Summary

```
User
  id (UUID)  name  email  password(bcrypt)  role  groupKey  apiKey
  isActive  emailVerified
  → hasMany CameraGroup, Camera, RefreshToken, Subscription, Payment

CameraGroup
  id  userId  name  host  port  httpPort
  username  password  deviceType  totalChannels
  status  location  latitude  longitude  s3Folder
  → hasMany Camera

Camera
  id  userId  groupId  monitorId  name  type
  host  port  path  username  password  channel
  width  height  fps  status  s3Path
  → belongsTo CameraGroup

RefreshToken
  id  token  userId  expiresAt  isRevoked

PasswordReset
  id  token  userId  expiresAt  isUsed

Subscription  →  Plan  (maxCameras, maxStorage, price)
Payment, PaymentWebhook  (Stripe / Razorpay)
```

---

## 15. Key Environment Variables

```bash
# Database
DB_HOST=localhost  DB_PORT=3306  DB_NAME=drisyam  DB_USER=  DB_PASSWORD=

# JWT
JWT_SECRET=<min 32 chars>       JWT_EXPIRES_IN=2h
JWT_REFRESH_SECRET=<min 32 chars>  JWT_REFRESH_EXPIRES_IN=30d

# Shinobi VMS
SHINOBI_URL=http://localhost:8443
SHINOBI_API_KEY=<user api key>
SHINOBI_SUPER_API_KEY=<super admin key>

# S3 Storage (NetForChoice 10PB)
S3_ENDPOINT=https://s3.10pb.com
S3_REGION=ap-south-1
S3_ACCESS_KEY=  S3_SECRET_KEY=
S3_BUCKET=bms-001161

# Redis (optional — graceful fallback)
REDIS_URL=redis://localhost:6379

# CORS / Frontend
CORS_ORIGINS=http://localhost:5173
FRONTEND_URL=http://localhost:5173

# Payment (optional)
STRIPE_SECRET_KEY=  STRIPE_WEBHOOK_SECRET=
RAZORPAY_KEY_ID=  RAZORPAY_KEY_SECRET=  RAZORPAY_WEBHOOK_SECRET=
```

---

## 16. Known Design Decisions & Gotchas

| Topic | Decision |
|-------|----------|
| Moov atom | Shinobi records moov at END → FFmpeg remux to fMP4 for streaming |
| `<video>` auth | Can't send headers → `?token=` query param fallback |
| S3 date filter | Date at key depth [4] → must list all, filter post-list |
| Live audio | Must use AAC (not Opus) for HLS compatibility |
| CORP header | Helmet sets `same-origin`; override with `cross-origin` in `writeHead()` |
| Password with `@` | Must `encodeURIComponent(password)` in RTSP URL |
| FFmpeg concurrency | Semaphore caps thumbnail generation at 6 simultaneous processes |
| Redis down | All ops silently degrade; app continues without cache |
| Shinobi timeout | Set to 45s (heavy loads with 27+ cameras) |
| Token storage | `auth_token` in localStorage (NOT `token`) |





























You can save this as:

DRISYAM_VMS_HYBRID_ARCHITECTURE_SUMMARY.md
Drisyam VMS — Hybrid Scalable Architecture Summary

Deployment Model: Linux Servers (No Kubernetes)
Goal: Ultra-Low Latency Live Streaming (<2 sec) + Recording + Future AI
Codec Support: Mixed (H.264 + H.265)
Strategy: Hybrid (Shinobi + MediaMTX → Gradual Migration)

1️⃣ Architecture Strategy Overview

Drisyam VMS follows a hybrid media architecture designed to:

Support ultra-low latency streaming

Handle mixed codecs (H.264 / H.265)

Scale horizontally

Prepare for future AI processing

Migrate safely away from monolithic VMS dependency

The system is divided into independent planes:

Plane	Responsibility
Control Plane	Auth, DB, subscription, routing logic
Live Media Plane	Ultra-low latency WebRTC streaming
Recording Plane	Continuous video recording
Transcoding Plane	H.265 → H.264 GPU conversion
Storage Plane	S3 object storage
Delivery Plane	CDN-based playback
AI Plane (Future)	Real-time video inference
2️⃣ High-Level System Architecture
                         ┌────────────────────────┐
                         │     React Frontend     │
                         │  WebRTC + HLS Player   │
                         └─────────────┬──────────┘
                                       │
                         ┌─────────────▼──────────┐
                         │   Node Control Plane   │
                         │  Auth / DB / Billing   │
                         │  Camera Routing Logic  │
                         └─────────────┬──────────┘
                                       │
                ┌──────────────────────▼──────────────────────┐
                │                 Media Layer                 │
                └───────────────┬───────────────┬─────────────┘
                                │               │
                        Live Streaming      Recording Tier
                                │               │
                        ┌───────▼──────┐   ┌────▼────────┐
                        │  MediaMTX    │   │   Shinobi    │
                        │  (WebRTC)    │   │  (Recording) │
                        └───────┬──────┘   └────┬────────┘
                                │               │
                                └───────┬───────┘
                                        │
                               S3 Object Storage
                                        │
                                       CDN
                                        │
                                      Users
3️⃣ Hybrid Media Strategy
🟢 MediaMTX — Live Streaming Engine

Handles RTSP ingest

Provides WebRTC (< 2 sec latency)

Provides HLS fallback

Lightweight, Go-based

Horizontally scalable

Used for:

All ultra-low latency streaming

Future AI stream forwarding

Long-term primary media engine

🟡 Shinobi — Recording Engine (Temporary Tier)

Used only for recording

Stable for existing deployments

Gradual migration path

Will be phased out long-term

Used for:

Ongoing recording while migration occurs

4️⃣ Mixed Codec Handling
H.264 Cameras
Camera (H.264)
      ↓
MediaMTX (Passthrough)
      ↓
WebRTC (<1s latency)
      ↓
Browser

No transcoding required

Very scalable

Low CPU usage

H.265 Cameras
Camera (H.265)
      ↓
GPU Transcoder (NVENC)
      ↓
MediaMTX (H.264 output)
      ↓
WebRTC
      ↓
Browser

GPU required

Transcoding isolated from media router

Maintains low latency

5️⃣ Recording Flow
Camera
   ↓
Shinobi (Temporary)
   ↓
Upload to S3
   ↓
CDN
   ↓
Playback

Long-Term Target:

Camera
   ↓
MediaMTX
   ↓
Fragmented MP4
   ↓
S3
   ↓
CDN
6️⃣ Server Layout (Linux Deployment)
🟦 Control Server

Node.js API

MySQL

Redis

NGINX

Billing

No media processing

🟥 Media Node(s)

MediaMTX

16–32 CPU cores

32GB RAM

10Gbps NIC

Handles H.264 passthrough

🟪 GPU Node(s)

NVIDIA GPU (RTX / A2000+)

NVENC enabled

H.265 → H.264 conversion

Independent scaling

7️⃣ AI-Ready Architecture

Future AI integration:

MediaMTX
   ├── WebRTC → Users
   ├── Recording → S3
   └── RTSP Forward → AI Worker (GPU)
                          ↓
                     Detection Metadata
                          ↓
                        Node API
                          ↓
                         MySQL

Key Principles:

AI workers are independent

No AI inside media router

Metadata only stored in DB

Horizontal scaling supported

8️⃣ Scaling Strategy
Horizontal Scaling

Add MediaMTX nodes as camera count grows

Add GPU nodes as H.265 grows

Add S3 storage capacity via lifecycle rules

CDN absorbs viewer traffic

Load-Based Camera Routing

Control plane assigns cameras to least-loaded cluster.

Database additions:

mediaClusterId

codec

transcoderNodeId (nullable)

9️⃣ Migration Plan
Phase 1

Introduce MediaMTX for live

Keep Shinobi for recording

Phase 2

Begin recording via MediaMTX

Reduce Shinobi dependency

Phase 3

Remove Shinobi entirely

Fully MediaMTX-based architecture

🔟 Design Principles

Control plane and media plane separated

No FFmpeg inside Node.js

No video served from Express

No per-viewer transcoding

GPU only for H.265

CDN for all playback

AI isolated

1️⃣1️⃣ Final System Flow Summary
Camera
   ↓
Codec Detection
   ↓
(H264) → MediaMTX
(H265) → GPU → MediaMTX
   ↓
WebRTC → Users
Recording → S3 → CDN → Playback
AI Worker (Future) ← RTSP Forward
1️⃣2️⃣ Benefits of This Architecture

Ultra-low latency streaming

Mixed codec support

Safe hybrid migration

Horizontally scalable

AI-ready

Linux-native deployment

SaaS multi-tenant ready

Predictable infrastructure scaling

🚀 Conclusion

Drisyam VMS Hybrid Architecture:

Uses Shinobi for short-term stability

Introduces MediaMTX for ultra-low latency

Isolates transcoding with GPU nodes

Separates control and media planes

Enables safe migration toward fully scalable SaaS media infrastructure

This design supports current needs while preparing for high-scale future growth.