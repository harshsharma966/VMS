# Drishyam VMS — Full Project Documentation

> **Drishyam** (दृश्यम) — a cloud-based Video Management System (VMS) that lets businesses subscribe to plans, manage RTSP IP cameras, watch live HLS streams in a browser, and review recorded footage — all through a modern web dashboard.

---

## Table of Contents

1. [What We Built](#1-what-we-built)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Backend API — Full Reference](#4-backend-api--full-reference)
5. [Frontend Pages & Features](#5-frontend-pages--features)
6. [Database Models](#6-database-models)
7. [Camera & Streaming Pipeline](#7-camera--streaming-pipeline)
8. [Payment & Subscription System](#8-payment--subscription-system)
9. [Security Implementation](#9-security-implementation)
10. [Bugs Fixed & Problems Solved](#10-bugs-fixed--problems-solved)
11. [Current Status](#11-current-status)
12. [Setup & Running Locally](#12-setup--running-locally)
13. [Environment Variables Reference](#13-environment-variables-reference)

---

## 1. What We Built

Drishyam is a **SaaS Video Management System** consisting of:

| Component | Description |
|---|---|
| **React Frontend** | Dashboard app for managing cameras, watching live streams, reviewing recordings |
| **Node.js Backend** | REST API for auth, camera CRUD, payments, subscriptions, streaming |
| **Shinobi VMS** | Open-source NVR (running in Docker) that handles RTSP ingest, recording, HLS output |
| **MySQL Database** | Stores users, cameras, plans, subscriptions, payments |

### What It Offers

- **User Registration & Login** — JWT-based authentication with refresh token rotation
- **Subscription Plans** — Free/paid plans with camera limits; Stripe & Razorpay payment gateways
- **Camera Management** — Add, edit, delete RTSP IP cameras; synced to Shinobi VMS automatically
- **Live View** — Watch any camera as a live HLS stream in the browser (H.264, compatible with all modern browsers)
- **Recording Playback** — Browse and replay recordings stored by Shinobi
- **Multi-camera Dashboard** — Overview of all cameras with online/offline status

---

## 2. System Architecture

```
Browser (React App)
    │
    ├─── REST API calls ──► Node.js Backend (Port 5000)
    │                            │
    │                            ├─── MySQL Database
    │                            ├─── Shinobi VMS API  (internal, Port 8443)
    │                            └─── Stripe / Razorpay APIs
    │
    └─── HLS stream URLs ──► Shinobi VMS (Port 8443) ──► FFmpeg ──► RTSP Cameras
```

**Data Flow for Live Video:**
```
IP Camera (RTSP) ──► Shinobi (FFmpeg transcoder) ──► HLS .m3u8 + .ts segments in /dev/shm
    └── Browser ──► GET /{apiKey}/hls/{groupKey}/{monitorId}/s.m3u8 ──► HLS.js player
```

**Authentication Flow:**
```
User → POST /api/auth/login → JWT (15 min) + Refresh Token (7 days)
     → Every request: Authorization: Bearer {JWT}
     → On expiry: POST /api/auth/refresh-token → new JWT pair
```

---

## 3. Technology Stack

### Backend
| Package | Version | Purpose |
|---|---|---|
| Node.js | ≥18 | Runtime |
| Express | 5.2.1 | HTTP framework |
| Sequelize | 6.37.7 | ORM for MySQL |
| MySQL2 | — | Database driver |
| jsonwebtoken | 9.0.3 | JWT tokens |
| bcryptjs | — | Password hashing |
| Axios | — | HTTP client (Shinobi API calls) |
| fluent-ffmpeg | 2.1.3 | FFmpeg wrapper |
| Stripe | — | Payment gateway |
| Razorpay | — | Payment gateway |
| Winston | 3.19.0 | Logging |
| Helmet | — | HTTP security headers |
| express-rate-limit | — | Rate limiting |
| Joi | — | Request validation |
| dotenv | — | Environment variables |

### Frontend
| Package | Version | Purpose |
|---|---|---|
| React | 19.2.0 | UI framework |
| Vite | 7.3.1 | Build tool & dev server |
| React Router DOM | 7.13.0 | Client-side routing |
| Zustand | 5.0.11 | Global state management |
| Axios | 1.13.5 | HTTP client |
| TanStack React Query | 5.90.21 | Server state & caching |
| HLS.js | 1.6.15 | HLS video playback in browser |
| Tailwind CSS | 4.1.18 | Utility-first CSS |
| shadcn/ui + Radix UI | — | Headless UI components |
| lucide-react | 0.564.0 | Icon library |
| date-fns | 4.1.0 | Date formatting |

### Infrastructure
| Component | Details |
|---|---|
| Shinobi VMS | Docker image `shinobisystems/shinobi:latest`, Port 8443→8080 |
| FFmpeg | 4.1.6 (inside Shinobi Docker container) |
| MySQL | Port 3306, database `drishyamvms` |

---

## 4. Backend API — Full Reference

Base URL: `http://localhost:5000/api`

All protected routes require: `Authorization: Bearer <JWT>`

---

### Auth Routes — `/api/auth`

#### `POST /api/auth/register`
Register a new user. Automatically assigns the Free plan and provisions a Shinobi VMS account.

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123"
}
```
**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "name": "John Doe", "email": "john@example.com" },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

---

#### `POST /api/auth/login`
Authenticate and receive JWT tokens.

**Request:**
```json
{ "email": "john@example.com", "password": "securePassword123" }
```
**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "name": "...", "email": "...", "role": "user" },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

---

#### `GET /api/auth/me` 🔒
Get authenticated user's profile with active subscription.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "activeSubscription": {
      "status": "active",
      "plan": { "name": "Pro", "maxCameras": 10, "price": 999 },
      "currentPeriodEnd": "2026-03-15T00:00:00.000Z"
    }
  }
}
```

---

#### `POST /api/auth/refresh-token`
Rotate JWT tokens using a valid refresh token.

**Request:** `{ "refreshToken": "eyJ..." }`
**Response:** `200 OK` — new `accessToken` + `refreshToken`

---

#### `POST /api/auth/logout` 🔒
Revoke the user's refresh token.

**Request:** `{ "refreshToken": "eyJ..." }`
**Response:** `200 OK`

---

### User Routes — `/api/user`

#### `GET /api/user/group-key` 🔒
Fetch the user's Shinobi credentials. Used by the frontend to construct HLS URLs.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "groupKey": "6b17427adfc70df0b5415ffd73a1e243",
    "apiKey": "f07483f48995f5ada7e2033d6c7b34a4"
  }
}
```

---

### Camera Routes — `/api/shinobi`

#### `GET /api/shinobi/cameras` 🔒
List all cameras for the authenticated user. Syncs live status from Shinobi.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "mid": "66321aea1468a0220d536968",
      "name": "Camera 01",
      "type": "h264",
      "host": "103.61.254.67",
      "port": 554,
      "path": "/Streaming/Channels/101",
      "width": 1920,
      "height": 1080,
      "fps": 25,
      "status": "online"
    }
  ]
}
```

---

#### `GET /api/shinobi/cameras/:monitorId` 🔒
Get a single camera by monitor ID.

---

#### `POST /api/shinobi/cameras` 🔒
Add a new RTSP camera. Creates the monitor in Shinobi and saves to local DB.

**Request:**
```json
{
  "name": "Front Door",
  "host": "192.168.1.100",
  "port": 554,
  "path": "/Streaming/Channels/101",
  "username": "admin",
  "password": "camera123",
  "type": "h264",
  "width": 1920,
  "height": 1080,
  "fps": 25,
  "groupKey": "6b17427adfc70df0b5415ffd73a1e243"
}
```
**Response:** `201 Created`

---

#### `PUT /api/shinobi/cameras/:monitorId` 🔒
Update camera configuration in Shinobi and local DB.

---

#### `DELETE /api/shinobi/cameras/:monitorId` 🔒
Delete camera from Shinobi VMS and local DB.

---

#### `GET /api/shinobi/recordings/:monitorId` 🔒
Fetch recorded clips for a camera within a date range.

**Query params:** `groupKey`, `start` (ISO date), `end` (ISO date)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "filename": "2026-02-15T10-00-00.mp4",
      "timestamp": "2026-02-15T10:00:00Z",
      "size": 104857600,
      "duration": 300
    }
  ]
}
```

---

### Payment Routes — `/api/payment`

#### `POST /api/payment/create-checkout` 🔒
Create a payment session for a subscription plan.

**Request:** `{ "planId": "...", "gateway": "stripe" }`
**Response:** `200 OK` with checkout URL

---

#### `POST /api/payment/verify` 🔒
Verify a completed payment and activate the subscription.

---

#### `POST /api/payment/webhook`
Handle webhook events from Stripe/Razorpay. Raw body required for signature verification.

---

### Subscription Routes — `/api/subscription`

#### `GET /api/subscription/status` 🔒
Get the user's current subscription with plan details.

---

### Streaming Routes — `/api/stream`

#### `GET /api/stream/start/:monitorId` 🔒
Start an FFmpeg HLS transcoding process for a camera.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": { "streamUrl": "/streams/66321aea1468a0220d536968/stream.m3u8" }
}
```

---

#### `GET /api/stream/stop/:monitorId` 🔒
Stop the active transcoding process.

---

#### `GET /api/stream/status/:monitorId` 🔒
Check if a stream is currently active.

---

#### `GET /api/health`
Health check endpoint.

**Response:** `{ "status": "ok", "timestamp": "..." }`

---

## 5. Frontend Pages & Features

### Login Page — `/login`
- Email + password form
- Redirects to dashboard on success
- Dev quick-login button (development only)
- Shows validation errors inline

### Dashboard — `/dashboard` (Protected)
- **4 Stat Cards**: Total Cameras · Online Now · Recordings · Storage Used
- **Camera Grid**: Shows all cameras as cards with thumbnails
- Each card links to Live View for that camera
- Status badges (Online/Offline/Unknown)

### Cameras — `/cameras` (Protected)
- Full table of all cameras
- Status badge per row
- **Add Camera** dialog: enter RTSP details, name, resolution, FPS
- **Edit Camera** dialog: modify any field, synced to Shinobi
- **Delete Camera**: removes from Shinobi VMS and database
- Error handling for network/VMS failures

### Live View — `/live` (Protected)
- **Left sidebar**: clickable list of all cameras with green/grey status dots
- **Main area**: HLS.js video player (`<video>` element)
  - Controls enabled (play/pause/fullscreen)
  - Muted autoplay
  - Stream error banner if Shinobi is unreachable
  - Camera metadata below player: Resolution · FPS · Status
- Auto-selects first camera on load
- `?camera={monitorId}` query param to pre-select a camera

### Playback — `/playback` (Protected)
- Camera dropdown selector
- Date range picker (default: last 7 days)
- Recording grid with thumbnails, timestamps, file sizes
- Click any recording to play it in the video player

---

## 6. Database Models

### Users
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | Auto-generated |
| name | VARCHAR(100) | Required |
| email | VARCHAR(255) | Unique |
| password | VARCHAR(255) | bcrypt hashed |
| role | ENUM(admin, user) | Default: user |
| group_key | VARCHAR(255) | Shinobi groupKey |
| api_key | VARCHAR(255) | Shinobi apiKey |
| is_active | BOOLEAN | Default: true |
| email_verified | BOOLEAN | Default: false |
| deleted_at | DATETIME | Soft delete |

### Cameras
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | Auto-generated |
| user_id | UUID (FK) | References Users |
| monitor_id | VARCHAR | Shinobi monitor ID |
| name | VARCHAR | Display name |
| type | ENUM(h264, h265, mjpeg) | |
| host | VARCHAR | IP/hostname |
| port | INTEGER | Default: 554 |
| path | VARCHAR | RTSP path |
| username | VARCHAR | Camera auth |
| password | VARCHAR | Camera auth |
| width | INTEGER | Resolution |
| height | INTEGER | Resolution |
| fps | INTEGER | Frame rate |
| status | ENUM(online, offline) | |

### Plans
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| name | VARCHAR | Unique plan name |
| max_cameras | INTEGER | Camera limit |
| max_storage | BIGINT | Bytes |
| price | DECIMAL | Cost |
| billing_cycle | ENUM | monthly/yearly |
| stripe_product_id | VARCHAR | |
| stripe_price_id | VARCHAR | |
| razorpay_plan_id | VARCHAR | |
| is_active | BOOLEAN | |

### Subscriptions
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| user_id | UUID (FK) | |
| plan_id | UUID (FK) | |
| stripe_subscription_id | VARCHAR | |
| razorpay_subscription_id | VARCHAR | |
| status | ENUM | active/trialing/past_due/cancelled/expired |
| current_period_start | DATETIME | |
| current_period_end | DATETIME | |

### Payments
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| user_id | UUID (FK) | |
| subscription_id | UUID (FK) | |
| amount | DECIMAL | |
| currency | VARCHAR | Default: INR |
| gateway | ENUM | stripe/razorpay |
| gateway_payment_id | VARCHAR | |
| status | ENUM | pending/completed/failed/refunded |

### RefreshTokens
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| user_id | UUID (FK) | |
| token | VARCHAR | Unique |
| expires_at | DATETIME | |
| is_revoked | BOOLEAN | |

---

## 7. Camera & Streaming Pipeline

### How a Camera Gets Added

1. User fills "Add Camera" form in the browser
2. Frontend sends `POST /api/shinobi/cameras` to backend
3. Backend calls `ShinobiService._buildShinobiConfig()` to create Shinobi monitor config
4. Backend calls `POST /{apiKey}/configureMonitor/{groupKey}/{monitorId}` on Shinobi
5. Shinobi writes the config to MySQL, spawns `singleCamera.js` process
6. `singleCamera.js` builds an FFmpeg command and starts transcoding
7. Backend saves the camera record to the local `cameras` table

### Shinobi Monitor Config (Built by Backend)

```js
{
  mid: monitorId,
  ke: groupKey,
  name: cameraName,
  type: 'h264',
  mode: 'start',            // auto-start stream
  protocol: 'rtsp',
  host: 'user:pass@ip:554',
  port: '554',
  path: '/Streaming/Channels/101',
  fps: '25',
  width: '1920',
  height: '1080',
  details: JSON.stringify({
    auto_host: 'rtsp://user:pass@ip:554/path',
    auto_host_enable: '1',
    stream_type: 'hls',
    stream_vcodec: 'libx264',   // transcode to H.264 for browser compatibility
    cust_stream: '-preset ultrafast -tune zerolatency -g 30',
    wall_clock_timestamp_ignore: '1',  // prevents frame duplication
    rtsp_transport: 'tcp',
    hls_time: '2',
    hls_list_size: '3',
    skip_ping: '1',             // skip TCP connectivity test
    input_map_choices: '{}',    // prevents builders.js crash
    snap: '1',
    snap_fps: '1',
  })
}
```

### FFmpeg Command (Generated by Shinobi)

```bash
/usr/bin/ffmpeg \
  -fflags +igndts \
  -rtsp_transport tcp \
  -i "rtsp://admin:pass@ip:554/Streaming/Channels/101" \
  -preset ultrafast -tune zerolatency -g 30 \
  -strict -2 -an \
  -c:v libx264 -q:v 50 \
  -f hls -hls_time 2 -hls_list_size 3 \
  -start_number 0 -hls_allow_cache 0 \
  -hls_flags +delete_segments+omit_endlist \
  /dev/shm/streams/{groupKey}/{monitorId}/s.m3u8 \
  -vf fps=1 -update 1 \
  /dev/shm/streams/{groupKey}/{monitorId}/s.jpg
```

### HLS URL Pattern

```
http://localhost:8443/{apiKey}/hls/{groupKey}/{monitorId}/s.m3u8
```

The frontend fetches this URL from `/api/user/group-key` and uses it directly with HLS.js. CORS is open (`Access-Control-Allow-Origin: *`) so the browser can access Shinobi directly.

### HLS.js Player (LiveView.jsx)

```js
const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
hls.loadSource(hlsUrl);
hls.attachMedia(videoElement);
hls.on(Hls.Events.MANIFEST_PARSED, () => videoElement.play());
hls.on(Hls.Events.ERROR, (event, data) => {
  if (data.fatal) setStreamError('Unable to load stream.');
});
```

---

## 8. Payment & Subscription System

### Supported Gateways
- **Stripe** — international cards, subscriptions
- **Razorpay** — Indian market, UPI, net banking

### Flow
```
1. User clicks "Upgrade Plan"
2. POST /api/payment/create-checkout  → returns checkout URL
3. User completes payment on gateway
4. Gateway sends webhook to POST /api/payment/webhook
5. Backend verifies signature, updates subscription status to "active"
6. User's camera limit increases per new plan
```

### After Payment — VMS Provisioning
When a new user registers, the backend calls `ShinobiService.provisionUser(email)` which:
1. Creates a new Shinobi user/group via `POST /super/{superApiKey}/accounts/registerAdmin`
2. Retrieves the new user's `groupKey` and `apiKey`
3. Stores both on the User record in the database

---

## 9. Security Implementation

| Feature | Implementation |
|---|---|
| Password hashing | bcryptjs, 12 rounds |
| JWT access tokens | 15-minute expiry, signed with secret |
| JWT refresh tokens | 7-day expiry, single-use rotation |
| Token revocation | RefreshToken table with `is_revoked` flag |
| CORS | Whitelist in env `CORS_ORIGINS` |
| HTTP headers | Helmet.js (CSP, XSS protection, no-sniff) |
| Rate limiting | Per-route express-rate-limit middleware |
| Request validation | Joi schemas on all input routes |
| Payment webhooks | Signature verification (Stripe/Razorpay) |
| Soft deletes | Users never hard-deleted (deleted_at timestamp) |
| Group key isolation | Each API call verifies groupKey matches user |

---

## 10. Bugs Fixed & Problems Solved

This section documents every issue encountered and resolved during development.

---

### BUG 1: Cameras showing offline / no live stream (MJPEG → HLS migration)

**Problem:** LiveView was using MJPEG (`<img src="/mjpeg/...">`) but cameras were configured for HLS. MJPEG endpoint returned empty stream.

**Fix:** Rewrote LiveView.jsx to use HLS.js with `<video>` element. Added `getShinobiHlsUrl()` to `shinobi.js` frontend service.

---

### BUG 2: `no EXTM3U delimiter` error in HLS.js

**Problem:** HLS manifest URL returned "File Not Found" HTML because Shinobi's FFmpeg process never started.

**Root cause:** Multiple issues (see bugs 3–5 below).

---

### BUG 3: Shinobi crash — `Cannot read property 'stream' of undefined` at builders.js:386

**Problem:** `builders.js` accesses `e.details.input_map_choices.stream` without null-checking. Camera config was missing `input_map_choices` field.

**Fix:** Added `input_map_choices: '{}'` to `_buildShinobiConfig()` in `shinobi.service.js`. Applied to all existing cameras via `POST /{apiKey}/configureMonitor` API.

---

### BUG 4: Ping test failing for all cameras — password contains `@` symbol

**Problem:** Shinobi's `stripAuthFromHost()` splits the host string on `@` to extract credentials. Camera password `Synoweb@abc123cd` contains `@`, so `"admin:Synoweb@abc123cd@103.61.254.67:554".split('@')` returns `["admin:Synoweb", "abc123cd", "103.61.254.67:554"]`. Index `[1]` is `"abc123cd"` (invalid hostname). TCP connectivity test fails → all cameras show "Ping Failed" → streams never start.

**Fix:** Added `skip_ping: '1'` to all camera details. Applied via API to all 15 cameras.

---

### BUG 5: Zombie FFmpeg processes flooding the system

**Problem:** Shinobi enters a retry loop when cameras fail to start, spawning hundreds of zombie FFmpeg processes.

**Fix:** Stopped all cameras via API, then `docker restart shinobi` to kill all zombie processes. Subsequently all camera restarts work cleanly.

---

### BUG 6: `bufferAddCodecError` — HEVC/H.265 not supported in Chrome

**Problem:** Camera streams were encoded in HEVC (H.265). Chrome and Firefox do not support H.265 in the MediaSource Extensions (MSE) API. HLS.js uses MSE internally.

**Verified with:**
```bash
docker exec shinobi ffprobe -rtsp_transport tcp -i "rtsp://..." 2>&1 | grep codec_name
# Output: codec_name=hevc
```

**Fix:** Changed all camera configs:
- `stream_vcodec: 'copy'` → `'libx264'` (transcode to H.264)
- `vcodec: 'copy'` → `'libx264'`
- Added `cust_stream: '-preset ultrafast -tune zerolatency'` for fast encoding

Applied via configureMonitor API to all 15 cameras. Also updated `_buildShinobiConfig()` in `shinobi.service.js`.

---

### BUG 7: `testrtspformat` camera on wrong RTSP port (8000 instead of 554)

**Problem:** Camera was configured with port 8000 (Hikvision SDK/HTTP port). RTSP uses port 554. HLS file was never generated for this camera.

**Fix:** Updated host from `103.61.254.67:8000` to `103.61.254.67:554`, port to `"554"`, fixed `auto_host` URL in details.

---

### BUG 8: Cameras don't auto-start after `docker restart`

**Problem:** Even with `mode: 'start'` in the database, Shinobi does not automatically restart camera streams after a container restart. It requires a `configureMonitor` API call to trigger stream start.

**Fix:** After each Docker restart, all 15 cameras must be re-triggered via:
```
POST /{apiKey}/configureMonitor/{groupKey}/{monitorId}
```
with the full camera config in `data=` form field.

---

### BUG 9: `s.m3u8` never created — `s0.ts` grows to hundreds of MB

**Problem:** After fixing the H.264 transcoding issue, FFmpeg processes ran at 100% CPU but `s.m3u8` was never created. `s0.ts` grew to 200–400MB indefinitely.

**Root cause:** Shinobi's `builders.js:287` injects `-g 1` (keyframe on every frame) when no `-g` flag exists in stream config. At 1920×1080 with 25fps, all-I-frame encoding pushes the H.264 macroblock rate past the encoder's level limit: `MB rate (648000000) > level limit (16711680)`. The encoder cannot produce valid output → HLS muxer never finalizes the first segment → `s.m3u8` never created.

**Verified by:**
```bash
# With -g 1: s0.ts grows to 14MB, no s.m3u8 after 12 seconds
# With -g 30: s.m3u8 created within 3 seconds ✓
```

**Fix:** Added `-g 30` to `cust_stream` in all cameras. Shinobi checks `!arrayContains('-g ', streamFlags)` before injecting `-g 1`, so the custom flag takes priority. Applied to all 15 cameras and updated `_buildShinobiConfig()`.

---

### BUG 10: `More than 1000 frames duplicated` — cameras 02, 03, 04, 08 stuck

**Problem:** After fixing `-g 1`, cameras 01, 05, 06, 07 started working, but cameras 02, 03, 04, 08 still had `s0.ts` growing without `s.m3u8`. Test showed: `More than 1000 frames duplicated` warning and `MB rate > level limit`.

**Root cause:** Shinobi's `builders.js:320–321` adds `-use_wallclock_as_timestamps 1` to FFmpeg input flags for H.264 streams (config `wallClockTimestampAsDefault: true`). Cameras on channels 201, 301, 401, 801 have irregular RTSP timestamps (gaps/jumps). With `-use_wallclock_as_timestamps 1`, FFmpeg duplicates frames to fill wall-clock time, causing 1000+ duplicates in seconds. This pushes the MB rate over the H.264 level limit again.

**Fix:** Added `wall_clock_timestamp_ignore: '1'` to camera details. Shinobi checks this field at `builders.js:310` and skips adding `-use_wallclock_as_timestamps 1` when set. Applied to cameras 02, 03, 04, 08, basement, drishyam, and demo cameras.

---

### BUG 11: Express 5 route registration issue

**Problem:** Stream routes were not being registered correctly. Some route patterns caused Express 5 route-matching issues.

**Fix:** Updated `stream.routes.js` to use the correct Express 5 `router.get()` signature with named params:
```js
router.get('/start/:monitorId', authenticate, streamController.startStream);
```

---

### BUG 12: Stale Node.js process on Port 5000

**Problem:** Backend wouldn't start — port 5000 already in use by a previous crashed process.

**Fix:** Kill stale process:
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <pid> /F
```

---

## 11. Current Status

### Working (10 cameras) ✓
| Camera | Channel | Status |
|---|---|---|
| Camera 01 | Channels/101 | ✓ Live HLS |
| Camera 02 | Channels/201 | ✓ Live HLS |
| Camera 03 | Channels/301 | ✓ Live HLS |
| Camera 04 | Channels/401 | ✓ Live HLS |
| Camera 05 | Channels/501 | ✓ Live HLS |
| Camera 06 | Channels/601 | ✓ Live HLS |
| Camera 07 | Channels/701 | ✓ Live HLS |
| Camera 08 | Channels/801 | ✓ Live HLS |
| Door camera | Channels/101 | ✓ Live HLS |
| TEST - Standard Hikvision | Channels/101 | ✓ Live HLS |

### Offline (5 cameras) — Network Issues
| Camera | Issue |
|---|---|
| basement | RTSP host `192.168.1.150` — local IP, not reachable from Docker network |
| drishyam | RTSP host `192.168.1.150` — same local IP |
| TEST - Big Buck Bunny | External demo RTSP server (unreliable) |
| Demo - City Camera | HTTP MJPEG feed configured as RTSP (wrong protocol) |
| Demo - Times Square Live | HTTP MJPEG feed configured as RTSP (wrong protocol) |

---

## 12. Setup & Running Locally

### Prerequisites
- Node.js ≥ 18
- MySQL (running on port 3306)
- Docker Desktop
- FFmpeg (inside Docker container — already included in Shinobi image)

### Step 1: Start Shinobi VMS
```bash
docker start shinobi
# or first time:
docker run -d --name shinobi -p 8443:8080 shinobisystems/shinobi:latest
```

### Step 2: Start Backend
```bash
cd smart-cam-backend
cp .env.example .env   # Fill in your values
npm install
npm run dev            # Runs on http://localhost:5000
```

### Step 3: Start Frontend
```bash
cd smart-cam-app
cp .env.example .env   # Fill in VITE_API_BASE_URL and VITE_SHINOBI_URL
npm install
npm run dev            # Runs on http://localhost:5173
```

### Step 4: Re-trigger cameras after Docker restart
Cameras do not auto-start after `docker restart`. Run this script:
```bash
cd /tmp
node trigger_cameras.js  # triggers all cameras via configureMonitor API
```

---

## 13. Environment Variables Reference

### Backend — `.env`
```env
NODE_ENV=development
PORT=5000

# MySQL
DB_HOST=localhost
DB_PORT=3306
DB_NAME=drishyamvms
DB_USER=root
DB_PASSWORD=

# JWT
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars
JWT_REFRESH_EXPIRES_IN=7d

# Shinobi VMS
SHINOBI_URL=http://localhost:8443
SHINOBI_API_KEY=<user api key>
SHINOBI_SUPER_API_KEY=<super admin key for provisioning>

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Razorpay
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...

# CORS
CORS_ORIGINS=http://localhost:5173
FRONTEND_URL=http://localhost:5173
```

### Frontend — `.env`
```env
VITE_API_BASE_URL=http://localhost:5000
VITE_SHINOBI_URL=http://localhost:8443
```

---

*Documentation generated: February 2026*
*System: Drishyam VMS v1.0*























first phase - client onboarding ip username password   stor the live 10pb S3  


second phase model --- for detection ,  and all kind of analysis 