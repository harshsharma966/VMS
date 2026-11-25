# 05 — Codebase Guide

## Backend: `smart-cam-backend/`

### Entry Points

| File | Purpose |
|---|---|
| `src/server.js` | Starts the HTTP server, DB connection, calls `recordingSync.start()` |
| `src/app.js` | Express app: middleware (CORS, helmet, rate-limit), routes |

---

### Config (`src/config/`)

| File | Purpose |
|---|---|
| `env.js` | Reads + validates all env vars; exports typed config object |
| `cors.js` | CORS options — reads `CORS_ORIGINS` from env |
| `redis.js` | Redis client with graceful fallback; exports `getBuffer`, `setBuffer`, `getJSON`, `setJSON`, `del` |
| `logger.js` | Winston logger (console + file) |
| `database.js` | Sequelize MySQL connection |

---

### Models (`src/models/`)

| Model | Table | Purpose |
|---|---|---|
| `User` | `users` | Auth, subscription link |
| `CameraGroup` | `camera_groups` | Group of cameras (one per client) |
| `Camera` | `cameras` | Individual camera, has `monitorId` (Shinobi ID), `status` |
| `Subscription` | `subscriptions` | Plan + billing |
| `Plan` | `plans` | Subscription tiers |
| `Payment` | `payments` | Payment records |
| `RefreshToken` | `refresh_tokens` | JWT refresh tokens |
| `PasswordReset` | `password_resets` | Password reset tokens |

---

### Services (`src/services/`)

#### `shinobi.service.js` — **Most important file**

Wraps the Shinobi VMS HTTP API.

| Method | What it does |
|---|---|
| `configureMonitor(apiKey, groupKey, monitorId, config)` | Creates/updates a camera in Shinobi |
| `startMonitor(apiKey, groupKey, monitorId)` | Calls `/record` — starts FFmpeg (recording + HLS) |
| `stopMonitor(apiKey, groupKey, monitorId)` | Stops the camera FFmpeg process |
| `deleteCamera(apiKey, groupKey, monitorId)` | Removes camera from Shinobi |
| `getMonitors(apiKey, groupKey)` | Lists all cameras + status |
| `getRecordings(apiKey, groupKey, monitorId, start, end)` | Lists closed recordings |
| `_buildShinobiConfig(monitorId, groupKey, config)` | Builds the full Shinobi monitor config JSON |

**Critical settings in `_buildShinobiConfig()`:**
```js
// Inside 'details' object:
stream_vcodec: 'copy'    // H.264 copy — zero transcoding. Change if cameras use HEVC.
vcodec: 'copy'           // Recording also copy — no re-encode
cust_stream: ''          // No extra FFmpeg flags for streaming
cust_record: '-movflags frag_keyframe+empty_moov+...'  // fMP4 for safe recordings
time_limit: '15'         // 15-min recording segments — MUST be >0
stream_fps: '0'          // Prevents Shinobi adding -vf fps= flag (conflicts with copy)
```

---

#### `recordingSync.service.js` — Background sync + watchdog

Two loops started by `start()` in `server.js`:

1. **S3 Sync** (every 5 min): fetches closed recordings from Shinobi API → uploads to S3 → saves record in DB
2. **Watchdog** (every 2 min): checks all cameras → restarts any that stopped recording

Key functions:
- `syncCamera(user, group, camera)` — handles one camera's recordings
- `watchdogLoop()` — checks + restarts dead cameras

---

#### `s3.service.js`

Wraps AWS S3 SDK for the 10PB S3-compatible storage.

| Method | Purpose |
|---|---|
| `uploadRecording(key, stream, size)` | Upload MP4 to S3 |
| `getPresignedUrl(key, expiry)` | Generate signed URL for playback |
| `listRecordings(prefix)` | List recordings under a prefix |
| `buildRecordingKey(userId, group, cam, file, date)` | Build the S3 key path |

S3 key format: `recordings/{userId}/{groupName}/{cameraName}/{YYYY-MM-DD}/{filename}`

---

#### `stream.service.js`

Handles live stream URL generation.

```js
// Returns HLS URL for a camera
getHlsUrl(apiKey, groupKey, monitorId)
// → https://drishyam.netforchoice.com/shinobi/{apiKey}/hls/{groupKey}/{monitorId}/s.m3u8

// Starts a camera stream if not already online
startStream(camera, user)
// → Only calls Shinobi if camera.status !== 'online' (avoids restarting live streams)
```

---

#### Other Services

| Service | Purpose |
|---|---|
| `auth.service.js` | JWT generation, refresh, password hashing |
| `email.service.js` | Nodemailer (SMTP) for password reset |
| `payment.service.js` | Razorpay integration |
| `razorpay.service.js` | Razorpay API wrapper |

---

### Controllers (`src/controllers/`)

| Controller | Routes | Purpose |
|---|---|---|
| `auth.controller.js` | `/api/auth/*` | Login, register, refresh, logout, password reset |
| `cameraGroup.controller.js` | `/api/groups/*` | Groups, cameras, recordings, thumbnails, reconfigure |
| `stream.controller.js` | `/api/stream/*` | Start/stop live streams |
| `user.controller.js` | `/api/user/*` | Profile, settings |
| `subscription.controller.js` | `/api/subscription/*` | Plans, subscribe, cancel |
| `payment.controller.js` | `/api/payment/*` | Razorpay webhook, order creation |
| `shinobi.controller.js` | `/api/shinobi/*` | Direct Shinobi admin actions |

---

### Middleware (`src/middleware/`)

| File | Purpose |
|---|---|
| `authenticate.js` | Verifies JWT; checks `Authorization` header OR `?token=` query param |
| `authorize.js` | Role-based access (admin vs user) |
| `asyncHandler.js` | Wraps async controllers to catch errors |
| `errorHandler.js` | Central error handler; returns JSON errors |
| `rateLimiter.js` | Express rate-limit (100 req/15 min per IP) |
| `validate.js` | Joi validation middleware |

---

### Utils (`src/utils/`)

| File | Purpose |
|---|---|
| `AppError.js` | Custom error class with `statusCode` |
| `semaphore.js` | Limits concurrent operations (used for FFmpeg thumbnail jobs, max 6) |
| `constants.js` | Shared constants |

---

## Frontend: `smart-cam-app/`

### Pages (`src/pages/`)

| Page | Route | Purpose |
|---|---|---|
| `Login.jsx` | `/login` | Login form |
| `Register.jsx` | `/register` | Registration |
| `Dashboard.jsx` | `/` | Overview stats |
| `LiveView.jsx` | `/live` | Live camera grid |
| `Timeline.jsx` | `/timeline` | Recording playback with clip list |
| `Gallery.jsx` | `/gallery` | Thumbnail grid of recordings |
| `Timelapse.jsx` | `/timelapse` | Timelapse viewer |
| `CameraGroups.jsx` | `/groups` | Manage camera groups |
| `Cameras.jsx` | `/cameras` | Add/edit cameras |
| `Settings.jsx` | `/settings` | User/system settings |
| `Playback.jsx` | `/playback` | Single recording playback |

---

### Key Components (`src/components/`)

| Component | Purpose |
|---|---|
| `DirectStreamPlayer.jsx` | HLS.js player for live streams; handles reconnect, evicts dead instances from cache |
| `CameraCard.jsx` | Camera thumbnail card with status badge |
| `Sidebar.jsx` / `Topbar.jsx` | Navigation |

---

### Services (`src/services/`)

| File | Purpose |
|---|---|
| `api.js` | Axios instance; auto-attaches JWT; auto-refreshes on 401 |
| `auth.js` | Login, register, logout API calls |
| `recordings.js` | `getStreamUrl()`, `getThumbnailUrl()`, `getDownloadUrl()` |
| `streamCache.js` | HLS.js instance registry — prevents restarting already-running streams; `evictStream()` removes dead instances |
| `cameraGroup.js` | Camera group CRUD, camera management |

---

### State (`src/store/`)

| File | Purpose |
|---|---|
| `authStore.js` | Zustand store; holds `user`, `token`, login/logout actions |

Token is stored in `localStorage` as `auth_token` (not `token`).
