# 10 — Credentials & Access

> **Keep this file secure. Do not commit to public repositories.**

---

## Server Access

| Item | Value |
|---|---|
| IP | `103.109.7.37` |
| SSH Port | `35610` |
| User | `root` |

```bash
ssh root@103.109.7.37 -p 35610
```

---

## Application URLs

| URL | Purpose |
|---|---|
| `https://drishyam.netforchoice.com` | Production frontend |
| `http://103.109.7.37:8443` | Shinobi VMS (internal) |
| `http://103.109.7.37/api/health` | API health check |

---

## Backend MySQL (Docker)

| Item | Value |
|---|---|
| Host | `127.0.0.1` |
| Port | `3307` |
| Database | `smart_cam_db` |
| User | `smart_cam_user` |
| Password | `smart_cam_pass_2024` |
| Root password | `drisyam_root_2024` |

```bash
docker exec drisyam-mysql mysql -uroot -pdrisyam_root_2024 smart_cam_db
```

---

## Shinobi Internal MariaDB

| Item | Value |
|---|---|
| Container | `drisyam-shinobi` |
| User (Shinobi internal) | `majesticflame` |
| Password | *(empty)* |
| Database | `ccio` |

```bash
docker exec drisyam-shinobi mysql -uroot ccio
```

---

## Shinobi Users

| Role | ke (group key) | auth (API key) | Email | Password |
|---|---|---|---|---|
| Super Admin | `drishyam-super-ke` | `drishyam-super-token-123` | — | — |
| Regular User | `6b17427adfc70df0b5415ffd73a1e243` | `f07483f48995f5ada7e2033d6c7b34a4` | `test@systools.com` | `Systools@123` |

The regular user `auth` key is used as `SHINOBI_API_KEY` in backend `.env`.

---

## Camera NVRs

### Office 12 NVR (16 cameras)

| Item | Value |
|---|---|
| IP | `111.125.141.20` |
| Port | `554` (RTSP) |
| Username | `admin` |
| Password | `Webin@123abc45` |
| Codec | H.264 (must stay H.264 — see architecture docs) |
| Shinobi group ID | `c4bb7b24-ad41-4b48-987c-ca98a0bf79e9` |

RTSP paths: `/Streaming/Channels/101` (cam 01) ... `/Streaming/Channels/1601` (cam 16)

> Camera 16 (`da8cc3b3a5224db2ae63805d`) must be inserted directly into Shinobi MariaDB — bypasses 15-camera API limit.

### Office 13 NVR (8 cameras)

| Item | Value |
|---|---|
| IP | `103.61.254.67` |
| Port | `554` (RTSP) |
| Username | `admin` |
| Password | `Synoweb@abc123cd` (URL-encoded: `Synoweb%40abc123cd`) |
| Codec | H.264, 1280×1440 |
| Shinobi group ID | `b2eaefef-2c1f-4b49-ad08-f465548d0aad` |

RTSP paths: `/Streaming/Channels/101` ... `/Streaming/Channels/801`

> All 8 Office 13 cameras are inserted directly into Shinobi MariaDB (not via API) — they exceed the 15-camera free limit.

---

## S3 Storage (10PB)

| Item | Value |
|---|---|
| Endpoint | `https://s3.10pb.com` |
| Region | `ap-south-1` |
| Bucket | `bms-001161` |
| Access Key | `M2MNWLSAF97U7TFKC1IW` |
| Secret Key | `velSwDL1ioYAd8A1csG0IjNLspWAvlpvCIw7XFEA` |

---

## Application Login

| Email | Password | Role |
|---|---|---|
| `test@systools.com` | `Systools@123` | User |
