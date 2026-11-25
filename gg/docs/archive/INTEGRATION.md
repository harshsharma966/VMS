# Drishyam VMS — Complete Integration & Infrastructure Guide

> Everything you need to understand, update, and scale the system.

---

## Table of Contents
1. [System Overview](#1-system-overview)
2. [Infrastructure & Components](#2-infrastructure--components)
3. [Backend API Reference](#3-backend-api-reference)
4. [Frontend Pages & Their API Calls](#4-frontend-pages--their-api-calls)
5. [Camera Parent-Child Architecture](#5-camera-parent-child-architecture)
6. [S3 Object Storage (10PB)](#6-s3-object-storage-10pb)
7. [Shinobi VMS Integration](#7-shinobi-vms-integration)
8. [Status Sync — How It Works](#8-status-sync--how-it-works)
9. [Database Schema](#9-database-schema)
10. [How to Add a New Feature](#10-how-to-add-a-new-feature)
11. [Infrastructure Cost & Usage](#11-infrastructure-cost--usage)

---

## 1. System Overview

```
Browser (React App)
    │
    ├── REST calls ──► Node.js Backend (Port 5000)
    │                        │
    │                        ├── MySQL Database (localhost:3306)
    │                        ├── Shinobi VMS API (localhost:8443)
    │                        ├── S3 Object Storage (s3.10pb.com)
    │                        └── Stripe / Razorpay
    │
    └── HLS streams ──► Shinobi VMS ──► FFmpeg ──► RTSP IP Cameras
```

**Three data sources in the backend:**
| Source | What it stores | When it's used |
|---|---|---|
| MySQL | Users, groups, cameras (metadata) | Every API call |
| Shinobi VMS | Live stream state, HLS segments | Status sync, streaming |
| S3 (10PB) | Recorded video files | Playback / recordings API |

---

## 2. Infrastructure & Components

### Backend — `smart-cam-backend/`
| File/Folder | Purpose |
|---|---|
| `src/server.js` | Entry point, starts Express |
| `src/app.js` | Express app config, middleware |
| `src/routes/index.js` | Mounts all route groups |
| `src/controllers/` | Request handlers (one per domain) |
| `src/services/` | Business logic (Shinobi, S3, auth) |
| `src/models/` | Sequelize ORM models |
| `src/migrations/` | DB schema changes |
| `src/config/env.js` | All env vars with Joi validation |
| `.env` | Secrets (never commit this) |

### Frontend — `smart-cam-app/`
| File/Folder | Purpose |
|---|---|
| `src/App.jsx` | All routes defined here |
| `src/components/Sidebar.jsx` | Left navigation |
| `src/pages/` | One file per page |
| `src/services/api.js` | Axios instance (adds JWT header) |
| `src/services/cameraGroup.js` | Camera group API calls |
| `src/services/shinobi.js` | Shinobi/camera API calls |

### Services Running
| Service | Port | How to start |
|---|---|---|
| Node.js backend | 5000 | `npm run dev` in `smart-cam-backend/` |
| React frontend | 5173 | `npm run dev` in `smart-cam-app/` |
| Shinobi VMS | 8443 | `docker start shinobi` |
| MySQL | 3306 | Should be running as a service |

---

## 3. Backend API Reference

**Base URL:** `http://localhost:5000/api`
**Auth:** All protected routes need `Authorization: Bearer <JWT>` header.

### Auth
```
POST /api/auth/register          Register user
POST /api/auth/login             Login → returns accessToken + refreshToken
GET  /api/auth/me          🔒    Get current user + subscription
POST /api/auth/refresh-token     Refresh JWT
POST /api/auth/logout      🔒    Revoke refresh token
```

### Camera Groups (Parent IP Devices) — NEW
```
GET    /api/groups               List all groups + cameras (auto-syncs Shinobi status)
POST   /api/groups               Create group + auto-provision all camera channels
GET    /api/groups/:id           Get one group + cameras (syncs status)
PUT    /api/groups/:id           Update group name/location
DELETE /api/groups/:id           Delete group + all cameras from DB + Shinobi
POST   /api/groups/:id/sync      Force refresh camera statuses from Shinobi
GET    /api/groups/:id/recordings             All S3 recordings for the group
GET    /api/groups/:id/cameras/:mid/recordings  S3 recordings for one camera
```

### Individual Cameras (existing)
```
GET    /api/shinobi/cameras              List all cameras (flat, syncs Shinobi)
GET    /api/shinobi/cameras/:mid         Get one camera
POST   /api/shinobi/cameras             Add single camera
PUT    /api/shinobi/cameras/:mid        Update camera
DELETE /api/shinobi/cameras/:mid        Delete camera
GET    /api/shinobi/recordings/:mid     Get Shinobi recordings for camera
```

### Streaming
```
GET /api/stream/start/:mid   Start HLS stream for camera
GET /api/stream/stop/:mid    Stop stream
GET /api/stream/status/:mid  Check if stream is active
```

### Payment & Subscription
```
POST /api/payment/create-checkout   Create Stripe/Razorpay checkout
POST /api/payment/verify            Verify payment after success
POST /api/payment/webhook           Stripe/Razorpay webhook (no auth)
GET  /api/subscription/status 🔒   Current plan + limits
```

---

## 4. Frontend Pages & Their API Calls

| Page (`/route`) | What it calls |
|---|---|
| `/devices` | `GET /api/groups` (with 30s auto-refresh) |
| `/devices` → Add Device wizard | `POST /api/groups` |
| `/devices` → Sync button | `POST /api/groups/:id/sync` |
| `/cameras` | `GET /api/shinobi/cameras` |
| `/live` | `GET /api/user/group-key` → HLS URL from Shinobi |
| `/playback` | `GET /api/shinobi/recordings/:mid` |
| `/dashboard` | `GET /api/auth/me`, `GET /api/shinobi/cameras` |

### How the frontend gets the HLS stream URL
```
1. Frontend calls GET /api/user/group-key
2. Backend returns { groupKey, apiKey }
3. Frontend builds URL:
   http://localhost:8443/{apiKey}/hls/{groupKey}/{monitorId}/s.m3u8
4. HLS.js loads and plays the stream
```

---

## 5. Camera Parent-Child Architecture

### The model
```
CameraGroup (parent = one physical device / IP address)
│  name: "Office 13"
│  host: "103.61.254.67"
│  totalChannels: 9
│
├── Camera 01  channel=1  path=/Streaming/Channels/101  monitorId=abc...
├── Camera 02  channel=2  path=/Streaming/Channels/201  monitorId=def...
├── Camera 03  channel=3  path=/Streaming/Channels/301
...
└── Camera 09  channel=9  path=/Streaming/Channels/901
```

### How channels map to RTSP paths (Hikvision)
| Channel | RTSP Path |
|---|---|
| 1 | `/Streaming/Channels/101` |
| 2 | `/Streaming/Channels/201` |
| 3 | `/Streaming/Channels/301` |
| N | `/Streaming/Channels/${N*100+1}` |

### Adding a new group via API
```json
POST /api/groups
{
  "name": "Office 14",
  "host": "103.61.254.68",
  "port": 554,
  "username": "admin",
  "password": "YourPassword",
  "totalChannels": 10,
  "deviceType": "hikvision",
  "location": "4th Floor"
}
```
**What the backend does automatically:**
1. Creates `camera_groups` row
2. Loops 1→10, for each channel:
   - Generates unique `monitorId`
   - Calls Shinobi `configureMonitor` to start HLS stream
   - Saves `cameras` row with `group_id`, `channel`, `path`, `s3_path`
3. Returns the full group with all cameras

---

## 6. S3 Object Storage (10PB — netforchoice)

> **Provider:** 10PB (netforchoice) — NOT AWS. Compatible S3 API with `forcePathStyle: true`.

### Credentials (in `.env`)
```env
S3_ENDPOINT=https://s3.10pb.com
S3_REGION=ap-south-1
S3_ACCESS_KEY=M2MNWLSAF97U7TFKC1IW
S3_SECRET_KEY=velSwDL1ioYAd8A1csG0IjNLspWAvlpvCIw7XFEA
S3_BUCKET=bms-001161
```

---

### Complete Recording Flow (Store → Fetch)

```
STEP 1 — CAPTURE (real-time)
──────────────────────────────────────────────────────
IP Camera (RTSP)
    │  rtsp://admin:pass@103.61.254.67:554/Streaming/Channels/101
    ▼
Shinobi VMS (Docker, port 8443)
    │  FFmpeg reads RTSP → transcodes H.265→H.264
    │
    ├──► /dev/shm/  (live HLS segments — 2s each, only last 6s kept)
    │         └─ used by browser for live viewing  ← NOT stored long-term
    │
    └──► /home/Shinobi/videos/  (local disk — 15-min MP4 clips)
              rec_enable: '1'   ← enabled in Shinobi monitor config
              rec_duration: 900  ← 15 minutes per clip


STEP 2 — UPLOAD (every 5 minutes, automatic)
──────────────────────────────────────────────────────
recordingSync.service.js  (background job, starts with server)
    │
    │  Every 5 minutes:
    │  1. Get all cameras from MySQL (all users)
    │  2. Call Shinobi videos API → list recordings per camera
    │  3. For each clip older than 2 minutes:
    │       → Check S3 HeadObject — skip if already uploaded
    │       → GET /{apiKey}/videos/{groupKey}/{filename}  (download from Shinobi)
    │       → PUT to S3 (upload to 10PB)
    │
    ▼
S3 Bucket: bms-001161  (10PB / netforchoice, New Delhi)
    recordings/
    └── {userId}/
        └── {group-name}/          ← e.g. office-13
            └── {camera-name}/     ← e.g. office-13-camera-01
                └── {YYYY-MM-DD}/
                    └── 2026-02-16T10-30-00.mp4   ← 15-min clip


STEP 3 — FETCH / PLAYBACK
──────────────────────────────────────────────────────
Frontend calls:
    GET /api/groups/:groupId/recordings?date=2026-02-16
    GET /api/groups/:groupId/cameras/:monitorId/recordings

Backend (cameraGroup.controller.js):
    1. Lists S3 objects with prefix  recordings/{userId}/{group}/{camera}/{date}/
    2. For each clip → generates a signed URL (valid 1 hour):
       https://s3.10pb.com/bms-001161/recordings/.../clip.mp4?X-Amz-Signature=...
    3. Returns array: [{ key, filename, size, lastModified, playbackUrl }]

Frontend:
    → Renders list of recordings with playbackUrl
    → User clicks → video plays directly from S3 (signed URL)
```

---

### File path structure in S3
```
bms-001161/
└── recordings/
    └── {userId}/
        └── office-13/
            └── office-13---camera-01/
                └── 2026-02-16/
                    ├── 2026-02-16T10-00-00.mp4   (10:00 – 10:15)
                    ├── 2026-02-16T10-15-00.mp4   (10:15 – 10:30)
                    └── 2026-02-16T10-30-00.mp4   (10:30 – 10:45)
```

### Key S3 service methods (`src/services/s3.service.js`)
| Method | When it's called | What it does |
|---|---|---|
| `uploadRecording(userId, group, camera, filename, buffer)` | By recordingSync every 5 min | Upload MP4 clip to S3 |
| `exists(key)` | By recordingSync before upload | Skip already-uploaded clips |
| `listRecordings(userId, group, camera, date)` | `GET /api/groups/:id/cameras/:mid/recordings` | List clips for one camera |
| `listGroupRecordings(userId, group, date)` | `GET /api/groups/:id/recordings` | List all cameras in a group |
| `getPlaybackUrl(key, 3600)` | After every list call | Generate 1-hour signed playback URL |
| `deleteRecording(key)` | Future: retention policy cleanup | Delete one clip |

### How to manually trigger a sync (no code needed)
```bash
# Force-sync one group's cameras from Shinobi (re-enables recording if needed)
POST /api/groups/:groupId/sync
Authorization: Bearer <JWT>
```
Or click the **🔄 Sync** button on the Devices page in the UI.

---

## 7. Shinobi VMS Integration

### How Shinobi works
- Shinobi is an NVR running in Docker
- It receives RTSP streams from cameras via FFmpeg
- It outputs HLS (`.m3u8`) segments to `/dev/shm/`
- The browser plays HLS via HLS.js

### Key Shinobi API calls (internal, backend only)
```
POST /{apiKey}/configureMonitor/{groupKey}/{monitorId}   Add/update camera
GET  /{apiKey}/monitor/{groupKey}                        List all cameras
GET  /{apiKey}/monitor/{groupKey}/{monitorId}/delete     Delete camera
GET  /{apiKey}/hls/{groupKey}/{monitorId}/s.m3u8         HLS stream (browser)
```

### Camera config sent to Shinobi (built by `_buildShinobiConfig`)
```js
{
  mode: 'start',               // auto-start stream
  type: 'h264',
  stream_vcodec: 'libx264',   // transcode H.265→H.264 for browser
  stream_type: 'hls',
  hls_time: '2',              // 2-second segments
  hls_list_size: '3',         // keep 3 segments
  cust_stream: '-preset ultrafast -tune zerolatency -g 30',
  skip_ping: '1',             // skip TCP test (passwords with @ break it)
  wall_clock_timestamp_ignore: '1',  // prevents frame duplication
  rtsp_transport: 'tcp',
}
```

### After Docker restart — cameras don't auto-start
Run this to re-trigger all cameras:
```bash
# The backend re-sends configureMonitor for each camera when you call:
POST /api/groups/:id/sync   ← this is the easiest way
```

---

## 8. Status Sync — How It Works

### Auto-sync flow (every 30 seconds)
```
Frontend (CameraGroups.jsx)
  ↓ every 30s: calls GET /api/groups
Backend
  ↓ fetches all groups + cameras from MySQL
  ↓ calls Shinobi GET /{apiKey}/monitor/{groupKey}
  ↓ for each camera: compares shinobi mode ('start'/'stop') with DB status
  ↓ updates DB if changed
  ↓ returns updated data
Frontend
  ↓ updates React state → UI re-renders with new statuses
```

### Manual sync (Refresh button)
```
User clicks 🔄 button on group card
  ↓ calls POST /api/groups/:id/sync
Backend
  ↓ syncs only that group's cameras from Shinobi
  ↓ returns { groupStatus, cameras: [{monitorId, status}, ...] }
Frontend
  ↓ updates only that group in local state (no full reload)
```

### Why cameras show "Offline" after creation
1. Camera was just added — DB default is `status: 'offline'`
2. Shinobi might take 5–15 seconds to start the FFmpeg process
3. **Click the 🔄 Sync button** after ~15 seconds to refresh

---

## 9. Database Schema

### `camera_groups` (new — parent device)
| Column | Type | Example |
|---|---|---|
| id | CHAR(36) | UUID |
| user_id | CHAR(36) | FK → users |
| name | VARCHAR(100) | "Office 13" |
| host | VARCHAR(255) | "103.61.254.67" |
| port | INT | 554 |
| http_port | INT | 80 |
| username | VARCHAR(100) | "admin" |
| password | VARCHAR(255) | hashed/plain |
| device_type | ENUM | hikvision/dahua/axis/generic |
| total_channels | INT | 9 |
| status | ENUM | online/offline/unknown |
| location | VARCHAR(255) | "3rd Floor" |
| s3_folder | VARCHAR(255) | "recordings/uid/office-13" |

### `cameras` (updated — child channels)
| Column | Type | Example |
|---|---|---|
| id | CHAR(36) | UUID |
| user_id | CHAR(36) | FK → users |
| group_id | CHAR(36) | FK → camera_groups |
| monitor_id | VARCHAR(24) | Shinobi monitor ID |
| name | VARCHAR(100) | "Office 13 - Camera 01" |
| channel | INT | 1 (→ ch101), 2 (→ ch201) |
| host | VARCHAR(255) | "103.61.254.67" |
| port | INT | 554 |
| path | VARCHAR(255) | "/Streaming/Channels/101" |
| username | VARCHAR(100) | "admin" |
| password | VARCHAR(255) | camera password |
| type | VARCHAR(20) | "h264" |
| width | INT | 1920 |
| height | INT | 1080 |
| fps | INT | 25 |
| status | ENUM | online/offline |
| s3_path | VARCHAR(500) | S3 prefix for this camera |

---

## 10. How to Add a New Feature

### Add a new API endpoint
1. Create/edit controller in `src/controllers/`
2. Add route in `src/routes/` and register in `src/routes/index.js`
3. If DB change needed: add migration in `migrations/`, run `npx sequelize-cli db:migrate`

### Add a new frontend page
1. Create `src/pages/NewPage.jsx`
2. Add lazy import + route in `src/App.jsx`
3. Add nav item in `src/components/Sidebar.jsx`
4. Add API calls in `src/services/`

### Add a new DB column
```js
// migrations/008-add-column.js
async up(queryInterface, Sequelize) {
  await queryInterface.addColumn('cameras', 'new_field', {
    type: Sequelize.STRING(100),
    allowNull: true,
  });
}
```
Then run: `npx sequelize-cli db:migrate`
Then add the field to the Sequelize model in `src/models/`.

---

## 11. Infrastructure Cost & Usage

### Current setup (local/development)
| Component | Resource | Cost |
|---|---|---|
| Node.js backend | Any server with 1GB+ RAM | — |
| MySQL | 5GB+ disk | — |
| Shinobi VMS | 2+ CPU cores, 4GB+ RAM | — |
| S3 (10PB) | `bms-001161` bucket, New Delhi | Pay per GB stored |

### S3 (10PB) pricing estimate
| Usage | Cost |
|---|---|
| Storage | Per GB/month |
| 1 camera, 1 hour recording @1080p | ~1–2 GB |
| 9 cameras × 24h | ~216–432 GB/day |
| 10 cameras × 24h | ~240–480 GB/day |
| 1 month (19 cameras × 24h) | ~10–20 TB |

> **Tip:** Use retention policies — delete recordings older than 30 days to control costs.

### Production deployment (recommended)
```
Frontend (React)         → Vercel / Netlify (free tier)
Backend (Node.js)        → AWS EC2 t3.medium / DigitalOcean $20/mo droplet
Database (MySQL)         → AWS RDS t3.micro / PlanetScale (managed)
Shinobi VMS              → Dedicated VPS with high CPU (4+ cores)
S3 Storage               → 10PB (already configured, bms-001161)
Domain                   → app.drishyamvms.com (backend: api.drishyamvms.com)
```

### Scaling plan
| Scale level | Action |
|---|---|
| 1–50 cameras | Current setup works fine |
| 50–200 cameras | Add load balancer, scale Shinobi horizontally |
| 200+ cameras | Kubernetes + multiple Shinobi instances + Redis for state |
| Recording storage | Already handled by 10PB S3 object storage |

---

*Last updated: February 2026*
