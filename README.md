# VMS — Enterprise Cloud Video Management System

> **Cloud-Connected CCTV Surveillance & Video Management Platform** with live HLS streaming, 24/7 fragmented MP4 recording, automated S3 cloud sync, interactive playback timelines, and multi-tenant management.

---

## 🌟 Key Features

- **Live Low-Latency Streaming**: HLS.js streaming with zero-transcode (`vcodec: copy`) mode, keeping CPU loads minimal even on 16+ high-resolution cameras.
- **24/7 Cloud Recording**: Continuous recording into 15-minute fragmented MP4 (`fMP4`) segments ensuring uncorrupted video recovery.
- **Automated S3 Sync**: Background worker automatically pushes closed video chunks to 10PB S3-compatible cloud storage.
- **Interactive Timeline & Playback**: Scrub through 24-hour recordings with on-demand FFmpeg thumbnail generation and Redis caching.
- **Multi-Camera Grid & Groups**: Manage multiple facilities, branches, and camera groupings under isolated client profiles.
- **Interactive Geo-Map**: Physical camera placement and status visualization via Leaflet maps.
- **Self-Healing Watchdog**: Background monitor checks stream health every 2 minutes and auto-restarts failed feeds with cooldown management.
- **Subscription & Billing**: Role-based access control with Razorpay subscription integration.

---

## 🏗️ System Architecture

```
[ IP Cameras / NVR ] (16× Hikvision RTSP Streams)
        │
        ▼
[ Shinobi VMS (Docker) ]
   ├─► Live Streams: /dev/shm/streams/ (HLS .ts & .m3u8) ──► Nginx ──► React Player
   └─► 15-min MP4 Chunks: /home/Shinobi/videos/
              │
              ▼ (Every 5 mins)
      [ recordingSync Worker ] ──► S3 Cloud Storage (10PB) + MySQL Records
```

---

## 🛠️ Tech Stack

### Frontend (`smart-cam-app`)
- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS + shadcn/ui + Radix UI
- **Video Player**: HLS.js
- **State Management**: Zustand
- **Maps**: Leaflet + React-Leaflet
- **Data Fetching**: TanStack React Query + Axios

### Backend (`smart-cam-backend`)
- **Runtime**: Node.js + Express
- **Database**: MySQL 8.0 (Sequelize ORM)
- **VMS Core**: Shinobi Video Management System
- **Cache**: Redis (with graceful in-memory fallback)
- **Media Engine**: FFmpeg (fluent-ffmpeg)
- **Cloud Storage**: AWS S3 SDK (S3-compatible 10PB storage)
- **Authentication**: JWT (Access + Refresh tokens)
- **Payments**: Razorpay

### Marketing & Landing (`smart-cam-marketing`)
- Responsive product landing pages, pricing tables, and onboarding portal.

---

## 📂 Project Structure

```
├── gg/
│   ├── smart-cam-app/        # React 18 + Vite frontend client
│   ├── smart-cam-backend/    # Node.js Express backend & watchdog service
│   ├── smart-cam-marketing/  # Marketing landing site
│   ├── docs/                 # Detailed architectural & setup guides
│   ├── docker-compose.yml    # Docker services orchestration
│   └── shinobi-super.json    # Shinobi VMS superuser config
└── README.md
```

---

## 🚀 Quick Start (Local Setup)

### 1. Backend Setup
```bash
cd gg/smart-cam-backend
npm install
cp .env.example .env   # configure your database and S3 credentials
npm run dev
```

### 2. Frontend Setup
```bash
cd gg/smart-cam-app
npm install
npm run dev
```

---

## 📖 Detailed Documentation

Comprehensive guides are available in the [`gg/docs/`](./gg/docs/) directory:
- [01 — System Overview](./gg/docs/01-overview.md)
- [02 — Local Setup Guide](./gg/docs/02-local-setup.md)
- [03 — Server Setup Guide](./gg/docs/03-server-setup.md)
- [04 — Architecture Deep-Dive](./gg/docs/04-architecture.md)
- [05 — Codebase Guide](./gg/docs/05-codebase-guide.md)
- [06 — API Reference](./gg/docs/06-api-reference.md)
- [07 — Environment Variables](./gg/docs/07-env-variables.md)
- [08 — Shinobi Guide](./gg/docs/08-shinobi-guide.md)
- [09 — Troubleshooting Guide](./gg/docs/09-troubleshooting.md)
- [11 — Deployment Guide](./gg/docs/11-deployment.md)
