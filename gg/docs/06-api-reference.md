# 06 — API Reference

Base URL: `http://103.109.7.37/api` (or `https://drishyam.netforchoice.com/api`)

All authenticated endpoints require: `Authorization: Bearer <token>`

---

## Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | No | Create account |
| POST | `/auth/login` | No | Login → returns `accessToken`, `refreshToken` |
| POST | `/auth/refresh` | No | Exchange refresh token for new access token |
| POST | `/auth/logout` | Yes | Invalidate refresh token |
| POST | `/auth/forgot-password` | No | Send reset email |
| POST | `/auth/reset-password` | No | Reset password with token |

### Login Request/Response
```json
POST /auth/login
{ "email": "test@systools.com", "password": "Systools@123" }

Response:
{ "accessToken": "eyJ...", "refreshToken": "eyJ...", "user": { "id": 1, "email": "..." } }
```

---

## Camera Groups

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/groups` | Yes | List all groups for the user |
| POST | `/groups` | Yes | Create a new group |
| GET | `/groups/:id` | Yes | Get group details + cameras |
| PUT | `/groups/:id` | Yes | Update group |
| DELETE | `/groups/:id` | Yes | Delete group |
| POST | `/groups/:id/reconfigure` | Yes | Re-push all cameras to Shinobi + start recording |

---

## Cameras

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/groups/:id/cameras` | Yes | List cameras in group |
| POST | `/groups/:id/cameras` | Yes | Add camera (configures in Shinobi) |
| PUT | `/groups/:id/cameras/:camId` | Yes | Update camera |
| DELETE | `/groups/:id/cameras/:camId` | Yes | Delete camera from group + Shinobi |

### Add Camera Body
```json
{
  "name": "Camera 01",
  "username": "admin",
  "password": "Webin@123abc45",
  "host": "111.125.141.20",
  "port": 554,
  "path": "/Streaming/Channels/101",
  "protocol": "rtsp",
  "type": "h264",
  "width": 1920,
  "height": 1080,
  "fps": 20
}
```

---

## Recordings

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/groups/:id/recordings?date=YYYY-MM-DD&camera=name` | Yes | List recordings |
| GET | `/groups/:id/recordings/stream?key=recordings/...` | Yes/token | Stream MP4 (Range support) |
| GET | `/groups/:id/recordings/thumbnail?key=recordings/...` | Yes/token | Get first-frame JPEG |
| GET | `/groups/:id/recordings/download?key=recordings/...` | Yes/token | Signed download URL |

---

## Live Streams

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/stream/start/:monitorId` | Yes | Ensure camera is streaming (starts if offline) |
| POST | `/stream/stop/:monitorId` | Yes | Stop stream |
| GET | `/stream/status/:monitorId` | Yes | Check if stream is active |

---

## User

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/user/profile` | Yes | Get current user |
| PUT | `/user/profile` | Yes | Update name/email |
| PUT | `/user/password` | Yes | Change password |

---

## Subscription

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/subscription/plans` | No | List available plans |
| GET | `/subscription/current` | Yes | Get user's active subscription |
| POST | `/subscription/subscribe` | Yes | Subscribe to a plan |
| POST | `/subscription/cancel` | Yes | Cancel subscription |

---

## Shinobi Admin

| Method | Endpoint | Auth (admin) | Description |
|---|---|---|---|
| GET | `/shinobi/monitors` | Yes | List all Shinobi monitors |
| POST | `/shinobi/restart/:monitorId` | Yes | Restart a specific monitor |

---

## Health

```
GET /health → { "status": "ok", "timestamp": "..." }
```
