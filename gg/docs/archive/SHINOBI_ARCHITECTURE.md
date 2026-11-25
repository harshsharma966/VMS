# Shinobi VMS — Role, Architecture & Dependency Analysis

## What is Shinobi?

Shinobi is an open-source **Video Management System (VMS)** that runs as a separate service
(usually on `http://localhost:8443`). It connects to IP cameras via RTSP, handles live
streaming transcoding, and writes MP4 recording files to local disk.

In this project, Shinobi is the **camera engine** — the part that physically talks to cameras
and writes recordings. Everything else (user management, S3 archive, playback, thumbnails)
is handled independently by the backend.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Browser (React App)                          │
└─────────────────────────────┬───────────────────────────────────┘
                              │ HTTPS API
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Backend (Node.js / Express)                     │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  API Controllers                                           │ │
│  │  GET/POST /groups           → Camera group management      │ │
│  │  GET /recordings/stream     → FFmpeg remux → browser       │ │
│  │  GET /recordings/thumbnail  → FFmpeg first frame → JPEG    │ │
│  │  POST /payment              → Subscription + provisioning   │ │
│  └──────────────┬──────────────────────────────┬──────────────┘ │
│                 │                              │                  │
│  ┌──────────────▼──────────┐    ┌─────────────▼──────────────┐ │
│  │  ShinobiService          │    │  RecordingSyncService       │ │
│  │  (HTTP API client)       │    │  (Background job, 5 min)    │ │
│  │                          │    │                             │ │
│  │  • provisionUser()       │    │  On boot → push FFmpeg      │ │
│  │  • addCamera()           │    │  config to all cameras      │ │
│  │  • getCameras()          │    │                             │ │
│  │  • deleteCamera()        │    │  Every 5 min → download     │ │
│  │  • stopMonitor()         │    │  new MP4s from Shinobi →    │ │
│  │  • getRecordings()       │    │  upload to S3               │ │
│  └──────────────┬──────────┘    └─────────────┬───────────────┘ │
│                 │                              │                  │
│  ┌──────────────▼──────────┐    ┌─────────────▼───────────────┐ │
│  │  MySQL Database          │    │  Redis Cache                │ │
│  │  • users (apiKey,        │    │  • thumbnail:v1:{key}       │ │
│  │    groupKey)             │    │    7-day JPEG cache         │ │
│  │  • cameras (monitorId,   │    │  • recordings:{id}:{group}  │ │
│  │    RTSP creds)           │    │    2-min list cache         │ │
│  │  • camera_groups         │    └─────────────────────────────┘ │
│  └──────────────────────────┘                                    │
└──────────────────┬──────────────────────────┬────────────────────┘
                   │                          │
     ┌─────────────▼──────────┐   ┌──────────▼──────────────────┐
     │  Shinobi VMS           │   │  S3 Object Storage (10PB)   │
     │  (Separate process)    │   │  (Fully independent)        │
     │                        │   │                             │
     │  • Connects to IP cams │   │  recordings/               │
     │  • RTSP → HLS stream   │   │  └─{userId}/               │
     │  • Writes MP4 to disk  │   │    └─{group}/              │
     │  • Manages monitors    │   │      └─{camera}/           │
     │                        │   │        └─{date}/           │
     └────────────────────────┘   │          └─clip.mp4        │
                                  └─────────────────────────────┘
```

---

## What Shinobi Does (and Doesn't Do)

### Shinobi IS responsible for

| Responsibility | Details |
|---|---|
| **RTSP connection** | Connects to IP cameras using credentials stored in DB |
| **HLS live streaming** | Transcodes RTSP → H.264/HLS segments for browser playback |
| **MP4 recording** | Writes 10-minute MP4 clips to local disk using `vcodec: copy` |
| **Monitor management** | Start, stop, and configure camera streams |
| **User provisioning** | Creates isolated Shinobi accounts (groupKey + apiKey) per user |

### Shinobi is NOT responsible for

| Responsibility | Who does it instead |
|---|---|
| **S3 storage** | `RecordingSyncService` (downloads from Shinobi, uploads to S3) |
| **Video playback** | Backend streams from S3 via FFmpeg remux |
| **Thumbnail generation** | Backend runs FFmpeg against S3 presigned URL |
| **User accounts** | MySQL — email, password, JWT auth |
| **Camera metadata** | MySQL — RTSP URLs, NVR credentials, channel numbers |
| **Recording browser** | S3 `ListObjectsV2` via `s3.service.js` |
| **Downloads** | S3 presigned URL via `getDownloadUrl()` |

---

## Shinobi API Endpoints Used

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/super/{superApiKey}/accounts/registerAdmin` | Provision new user/group |
| `GET` | `/super/{superApiKey}/accounts/list` | Fetch auth token after provisioning |
| `GET` | `/{apiKey}/monitor/{groupKey}` | List all cameras + live status |
| `GET` | `/{apiKey}/monitor/{groupKey}/{mid}` | Get single camera |
| `POST` | `/{apiKey}/configureMonitor/{groupKey}/{mid}` | Add or update camera config |
| `GET` | `/{apiKey}/monitor/{groupKey}/{mid}/stop` | Stop a camera stream |
| `GET` | `/{apiKey}/monitor/{groupKey}/{mid}/start` | Start a camera stream |
| `GET` | `/{apiKey}/monitor/{groupKey}/{mid}/delete` | Remove camera from Shinobi |
| `GET` | `/{apiKey}/videos/{groupKey}/{mid}` | List recent recordings (last 24h) |
| `GET` | `/{apiKey}/videos/{groupKey}/{mid}/{filename}` | Download MP4 for S3 upload |

---

## User Provisioning Flow

When a user signs up (free plan) or pays for their first subscription:

```
User signs up / pays
        │
        ▼
payment.service.js
        │
        ├── shinobiService.provisionUser(email)
        │       │
        │       ├── POST /super/.../accounts/registerAdmin
        │       │     → creates Shinobi user with random password
        │       │
        │       └── GET /super/.../accounts/list
        │             → fetches { groupKey, apiKey } for the new user
        │
        └── user.update({ groupKey, apiKey })  ← stored in MySQL
                │
                └── All future Shinobi API calls use these credentials
```

**⚠️ This is the only blocking Shinobi dependency.** If Shinobi is down when a user
tries to sign up or activate their subscription, they get a 502 error.

---

## Recording Pipeline (Most Important Flow)

```
IP Camera (RTSP)
        │
        │  RTSP stream
        ▼
┌───────────────────┐
│   Shinobi VMS     │  writes 10-min MP4 clips to /srv/shinobi/videos/...
│   vcodec: copy    │  (stream copy — no re-encode, moov atom at END)
│   cust_record:    │
│   +faststart      │  (new clips: moov moved to FRONT after writing)
└───────────────────┘
        │
        │  Every 5 minutes
        ▼
┌───────────────────────────────────┐
│  RecordingSyncService             │
│                                   │
│  1. GET /videos/{groupKey}/{mid}  │  list new recordings from Shinobi
│  2. Download MP4 buffer           │  axios GET → arraybuffer
│  3. uploadRecording(... recDate)  │  upload to S3 at correct date folder
└───────────────────────────────────┘
        │
        │  S3 key: recordings/{userId}/{group}/{camera}/{YYYY-MM-DD}/{file}.mp4
        ▼
┌───────────────────────────────────┐
│  S3 Object Storage (10PB)         │
│  (archive, independent of         │
│  Shinobi from this point on)      │
└───────────────────────────────────┘
        │
        │  When user clicks Play
        ▼
┌───────────────────────────────────┐
│  streamRecording controller       │
│                                   │
│  S3 raw MP4                       │
│    → FFmpeg (pipe:0 → pipe:1)     │
│    → frag_keyframe+empty_moov     │  fixes moov-at-end for old clips
│    → browser <video> element      │
└───────────────────────────────────┘
```

---

## What Happens When Shinobi is Down

### Feature-by-Feature Impact

| Feature | Shinobi Down? | Behaviour |
|---|---|---|
| **New user signup** | ❌ Blocked | 502 error — can't get `apiKey`/`groupKey` |
| **Login / JWT auth** | ✅ Works | Fully independent (MySQL + JWT) |
| **Create camera group** | ⚠️ Partial | Saved to DB; Shinobi config deferred until restart |
| **Delete camera group** | ⚠️ Partial | Removed from DB; Shinobi deletion skipped (graceful) |
| **Live camera status** | ⚠️ Stale | Shows last known status from DB, not real-time |
| **Live HLS streaming** | ❌ Unavailable | Shinobi transcodes RTSP → HLS; no fallback active |
| **New MP4 recordings** | ❌ Stopped | Shinobi writes recordings; no new files created |
| **Recording sync to S3** | ⏸ Paused | Sync job returns empty list; resumes when Shinobi is back |
| **Browse recording archive** | ✅ Works | S3 independent — all past recordings still accessible |
| **Play recording** | ✅ Works | S3 + FFmpeg — fully independent |
| **Thumbnail generation** | ✅ Works | FFmpeg + S3 presigned URL — fully independent |
| **Download recording** | ✅ Works | S3 presigned URL — fully independent |

### Graceful Degradation Pattern

Almost every Shinobi call in the backend is wrapped in `tryShinobi()`:

```javascript
// In cameraGroup.controller.js and shinobi.controller.js
async function tryShinobi(fn) {
  try {
    return await fn();
  } catch (e) {
    logger.warn('Shinobi unavailable, skipping VMS call', { error: e.message });
    return null;   // ← never throws, never crashes the request
  }
}
```

This means:
- Camera CRUD always completes (DB is updated regardless)
- Status sync is best-effort (uses cached DB value on failure)
- Recording config pushes are retried on next server boot

**The two exceptions** that do NOT use `tryShinobi()` are in `payment.service.js`
(user provisioning). These intentionally block because a user without a Shinobi
account cannot use the camera features at all.

---

## Data Ownership: Where is the Source of Truth?

| Data | Stored In | Notes |
|---|---|---|
| User email / password / JWT | **MySQL** | Fully independent |
| User `groupKey` + `apiKey` | **MySQL** | Written once during provisioning |
| Camera RTSP URL, credentials | **MySQL** | Synced to Shinobi on camera create/update |
| Camera `monitorId` | **MySQL** | UUID generated locally, registered in Shinobi |
| Live camera online/offline | **Shinobi** (primary), MySQL (cache) | MySQL updated every status poll |
| FFmpeg / stream config | **Shinobi** | Pushed from `_buildShinobiConfig()` |
| MP4 recordings (fresh) | **Shinobi local disk** | Temporary — synced to S3 every 5 min |
| MP4 recordings (archive) | **S3** | Permanent — `recordings/{userId}/...` |
| Thumbnail JPEGs | **Redis** (7-day cache) | Generated on-demand from S3 |
| Recording list | **Redis** (2-min cache) | From S3 `ListObjectsV2` |

---

## Key Environment Variables

```env
# Required — Shinobi cannot work without these
SHINOBI_URL=http://localhost:8443        # Shinobi server URL
SHINOBI_API_KEY=...                      # Super admin API key (for provisioning)
SHINOBI_SUPER_API_KEY=...               # Super admin key for /super/ endpoints

# Optional — S3 and Redis are independent
REDIS_URL=redis://localhost:6379         # Optional, graceful fallback
S3_ENDPOINT=https://s3.10pb.com         # S3 storage
S3_BUCKET=bms-001161
```

---

## Dependency Summary

```
Are we TOTALLY dependent on Shinobi?   NO.

Are we PARTIALLY dependent?            YES — for two things:
  1. New user provisioning (signup/payment)
  2. Active recording of new camera footage

Everything else works independently:
  ✓ User auth and management
  ✓ Camera metadata CRUD (DB-only)
  ✓ Past recordings (S3 → FFmpeg → browser)
  ✓ Thumbnails (S3 → FFmpeg → JPEG → Redis)
  ✓ Downloads (S3 presigned URL)
  ✓ Recording list browsing (S3 + Redis cache)
```

---

## If You Wanted to Remove Shinobi

You would need to replace two things:

1. **Recording engine** — something that connects to RTSP cameras and writes MP4 files.
   Candidates: FFmpeg running as a daemon, MediaMTX, go2rtc.

2. **User provisioning** — the `groupKey`/`apiKey` system is Shinobi-specific.
   If you replace Shinobi, you can remove these columns from the User model.

The rest of the codebase (S3 storage, playback, thumbnails, Redis cache, frontend Timeline)
would work unchanged with any recording engine that writes MP4 files and makes them
downloadable by filename.
