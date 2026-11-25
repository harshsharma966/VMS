# Smart-Cam VMS - System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER JOURNEY                             │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│  User visits     │
│  www.smart-cam   │
│  .com            │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Marketing Site  │
│  (React + Vite)  │
│                  │
│  - Home Page     │
│  - Features      │
│  - Pricing       │
│  - Contact       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Register/Login  │
│  Choose Plan     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Payment Gateway │
│  (Stripe/Razorpay)│
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Payment Success │
│  Webhook → API   │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│  Backend Creates:                                             │
│  1. User Account                                              │
│  2. Shinobi Group                                             │
│  3. Group Key                                                 │
│  4. JWT Token                                                 │
└────────┬─────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────┐
│  Redirect to     │
│  app.smart-cam   │
│  .com/dashboard  │
└────────┬─────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────┐
│              VMS APPLICATION (React + Vite)                     │
│                                                                 │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────┐│
│  │ Dashboard  │  │ Live View  │  │  Playback  │  │ Cameras  ││
│  └────────────┘  └────────────┘  └────────────┘  └──────────┘│
└────────────────────────────────────────────────────────────────┘
         │
         │ API Calls with JWT
         ▼
┌────────────────────────────────────────────────────────────────┐
│                    BACKEND API (Node.js)                        │
│                                                                 │
│  - Authentication (JWT)                                         │
│  - User Management                                              │
│  - Subscription Management                                      │
│  - Shinobi Proxy Layer                                          │
└────────┬───────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────┐
│                   SHINOBI VMS SERVER                            │
│                                                                 │
│  - Camera Management                                            │
│  - Live Streaming (HLS/WebRTC)                                  │
│  - Recording Storage                                            │
│  - Motion Detection                                             │
│  - Event Triggers                                               │
└────────┬───────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────┐
│                  CLOUD STORAGE (10PB)                           │
│                                                                 │
│  - AWS S3 / Cloudflare R2                                       │
│  - Video Recordings                                             │
│  - Snapshots                                                    │
│  - Timelapse Videos                                             │
└─────────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════
                    TECHNOLOGY STACK BREAKDOWN
═══════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND (Marketing Website)                                   │
│  ─────────────────────────────────────────────────────────      │
│  • React.js 18                                                  │
│  • Vite (Build Tool)                                            │
│  • React Router DOM                                             │
│  • Tailwind CSS                                                 │
│  • Axios (API Calls)                                            │
│  • 38 Images from Figma Design                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND (VMS Application)                                     │
│  ─────────────────────────────────────────────────────────      │
│  • React.js 18                                                  │
│  • Vite (Build Tool)                                            │
│  • React Router DOM                                             │
│  • Zustand (State Management)                                   │
│  • React Query (Data Fetching)                                  │
│  • HLS.js (Video Player)                                        │
│  • Tailwind CSS                                                 │
│  • date-fns (Date Handling)                                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  BACKEND API                                                    │
│  ─────────────────────────────────────────────────────────      │
│  • Node.js + Express                                            │
│  • JWT Authentication                                           │
│  • PostgreSQL / MongoDB                                         │
│  • Stripe/Razorpay Payment Gateway                              │
│  • Shinobi API Integration                                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  SHINOBI VMS                                                    │
│  ─────────────────────────────────────────────────────────      │
│  • Docker Container                                             │
│  • FFmpeg (Video Processing)                                    │
│  • HLS Streaming                                                │
│  • Motion Detection                                             │
│  • Multi-Camera Support                                         │
└─────────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════
                      DATA FLOW DIAGRAM
═══════════════════════════════════════════════════════════════════

[User Browser]
      │
      │ 1. Login Request
      ▼
[Marketing Site] ──2. Auth Request──> [Backend API]
                                            │
                                            │ 3. Verify & Create JWT
                                            ▼
                                       [Database]
                                            │
                                            │ 4. Return JWT + Group Key
                                            ▼
[VMS App] <────────────────────── [Backend API]
      │
      │ 5. Request Live Stream (with JWT)
      ▼
[Backend API] ──6. Proxy Request──> [Shinobi VMS]
                                            │
                                            │ 7. Get Camera Stream
                                            ▼
                                    [Camera/Cloud Storage]
                                            │
                                            │ 8. HLS Stream
                                            ▼
[VMS App] <──────────────────── [Shinobi VMS]
      │
      │ 9. Display Video to User
      ▼
[User Browser]


═══════════════════════════════════════════════════════════════════
                      FILE STRUCTURE
═══════════════════════════════════════════════════════════════════

project-root/
│
├── smart-cam-marketing/          (Marketing Website)
│   ├── public/
│   │   └── assets/
│   │       └── images/           (38 Figma Images)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx
│   │   │   ├── Hero.jsx
│   │   │   ├── Features.jsx
│   │   │   ├── Upgrade.jsx
│   │   │   ├── FAQ.jsx
│   │   │   ├── Contact.jsx
│   │   │   └── Footer.jsx
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Pricing.jsx
│   │   │   ├── Login.jsx
│   │   │   └── Register.jsx
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   └── auth.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── smart-cam-app/                (VMS Application)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Topbar.jsx
│   │   │   ├── HLSPlayer.jsx
│   │   │   ├── CameraCard.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── LiveView.jsx
│   │   │   ├── Playback.jsx
│   │   │   └── Cameras.jsx
│   │   ├── services/
│   │   │   ├── auth.js
│   │   │   ├── shinobi.js
│   │   │   ├── api.js
│   │   │   └── payment.js
│   │   ├── store/
│   │   │   └── authStore.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
└── smart-cam-backend/            (Backend API)
    ├── src/
    │   ├── controllers/
    │   │   ├── authController.js
    │   │   ├── userController.js
    │   │   ├── paymentController.js
    │   │   └── shinobiController.js
    │   ├── middleware/
    │   │   ├── auth.js
    │   │   └── errorHandler.js
    │   ├── models/
    │   │   ├── User.js
    │   │   ├── Subscription.js
    │   │   └── Camera.js
    │   ├── routes/
    │   │   ├── auth.js
    │   │   ├── user.js
    │   │   ├── payment.js
    │   │   └── shinobi.js
    │   ├── services/
    │   │   ├── shinobiService.js
    │   │   └── paymentService.js
    │   ├── config/
    │   │   └── database.js
    │   └── server.js
    └── package.json

