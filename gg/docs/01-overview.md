# 01 — System Overview

## What is Drisyam VMS?

Drisyam is a Video Management System (VMS) that:
- Shows **live streams** from 16 CCTV cameras
- **Records** all cameras 24/7 in 15-minute segments
- **Uploads** recordings to 10PB S3 cloud storage automatically
- Provides **playback**, **gallery**, and **timeline** views for recordings
- Has a **user/subscription** system with Razorpay payments

---

## Tech Stack

### Backend
| Component | Technology |
|---|---|
| API server | Node.js + Express |
| Database | MySQL 8.0 (via Sequelize ORM) |
| Process manager | PM2 (4 cluster instances) |
| Cache | Redis (optional — graceful fallback) |
| VMS engine | Shinobi (Docker) |
| Cloud storage | 10PB S3-compatible (`s3.10pb.com`) |

### Frontend
| Component | Technology |
|---|---|
| Framework | React 18 + Vite |
| Styling | Tailwind CSS + shadcn/ui |
| Video player | HLS.js |
| State | Zustand (`authStore`) |
| HTTP client | Axios |

### Infrastructure
| Component | Details |
|---|---|
| Web server | Nginx (reverse proxy + static files) |
| VMS container | Shinobi Docker (`drisyam-shinobi`) |
| DB container | MySQL 8.0 Docker (`drisyam-mysql`) |
| Cameras | 16× Hikvision IP cameras over RTSP |

---

## Request Flow

```
Browser (https://drishyam.netforchoice.com)
    │
    ├── /api/*  ──────► Nginx ──► Node.js :5000 (PM2 × 4)
    │                                  │
    │                                  ├── MySQL :3307 (backend DB)
    │                                  ├── Shinobi :8443 (VMS)
    │                                  └── S3 (10pb cloud)
    │
    ├── /shinobi/*  ──► Nginx ──► Shinobi :8443 (HLS segments)
    │
    └── /*  ──────────► Nginx ──► React SPA (dist/)
```

---

## Camera Setup

- **16 Hikvision cameras** connected to an NVR
- NVR IP: `111.125.141.20`, port `554`
- Codec: **H.264** (set on NVR), 720p/1080p, 15–20 fps, 512 kbps max
- RTSP paths: `/Streaming/Channels/101` through `/Streaming/Channels/1601`
- Shinobi pulls RTSP streams from the NVR and generates HLS segments

---

## Data Flow — Recording

```
NVR (RTSP H.264)
    └── Shinobi FFmpeg (vcodec: copy, no re-encode)
            ├── HLS segments → /dev/shm/streams/  (live view)
            └── MP4 files → /home/Shinobi/videos/ (15-min segments)
                    └── recordingSync (every 5 min)
                            └── S3 upload → s3.10pb.com/bms-001161
                                    └── Backend DB records path
```
