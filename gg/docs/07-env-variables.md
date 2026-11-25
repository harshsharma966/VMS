# 07 — Environment Variables

## Backend: `smart-cam-backend/.env`

### Server
| Variable | Example | Description |
|---|---|---|
| `NODE_ENV` | `production` | `development` or `production` |
| `PORT` | `5000` | HTTP port |

### Database (MySQL)
| Variable | Example | Description |
|---|---|---|
| `DB_HOST` | `localhost` | MySQL host (use `127.0.0.1` if Docker) |
| `DB_PORT` | `3307` | MySQL port (3307 because Docker maps it here) |
| `DB_NAME` | `smart_cam_db` | Database name |
| `DB_USER` | `smart_cam_user` | DB username |
| `DB_PASSWORD` | `smart_cam_pass_2024` | DB password |

### JWT
| Variable | Example | Description |
|---|---|---|
| `JWT_SECRET` | `long-random-string-32+chars` | Access token secret |
| `JWT_EXPIRES_IN` | `15m` | Access token lifetime |
| `JWT_REFRESH_SECRET` | `another-long-random-string` | Refresh token secret |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Refresh token lifetime |

### Shinobi VMS
| Variable | Example | Description |
|---|---|---|
| `SHINOBI_URL` | `http://localhost:8443` | Internal Shinobi URL (backend → Shinobi) |
| `SHINOBI_PUBLIC_URL` | `https://drishyam.netforchoice.com/shinobi` | Public Nginx-proxied URL (returned to frontend for HLS) |
| `SHINOBI_API_KEY` | `f07483f48995f5ada7e2033d6c7b34a4` | Regular user API key |
| `SHINOBI_GROUP_KEY` | `6b17427adfc70df0b5415ffd73a1e243` | Regular user group key |
| `SHINOBI_SUPER_API_KEY` | `drishyam-super-token-123` | Super admin API key |

### S3 Storage
| Variable | Example | Description |
|---|---|---|
| `S3_ENDPOINT` | `https://s3.10pb.com` | S3-compatible endpoint |
| `S3_REGION` | `ap-south-1` | Region |
| `S3_ACCESS_KEY` | `M2MNWLSAF97U7TFKC1IW` | Access key ID |
| `S3_SECRET_KEY` | `velSwDL1ioYA...` | Secret access key |
| `S3_BUCKET` | `bms-001161` | Bucket name |

### CORS
| Variable | Example | Description |
|---|---|---|
| `CORS_ORIGINS` | `http://103.109.7.37,https://drishyam.netforchoice.com` | Comma-separated allowed origins |
| `FRONTEND_URL` | `https://drishyam.netforchoice.com` | Primary frontend URL |

### Redis (optional)
| Variable | Example | Description |
|---|---|---|
| `REDIS_URL` | `redis://localhost:6379` | Redis connection. Omit to disable caching. |

### Payments (Razorpay)
| Variable | Example | Description |
|---|---|---|
| `RAZORPAY_KEY_ID` | `rzp_live_xxx` | Razorpay key ID |
| `RAZORPAY_KEY_SECRET` | `xxx` | Razorpay secret |
| `RAZORPAY_WEBHOOK_SECRET` | `xxx` | Webhook verification secret |

---

## Frontend: `smart-cam-app/.env`

| Variable | Example | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://103.109.7.37` | Backend API base (no `/api` suffix) |
| `VITE_SHINOBI_URL` | `http://103.109.7.37:8443` | Direct Shinobi URL (for local dev) |

> On the live server, `VITE_SHINOBI_URL` is not used directly for HLS — Nginx proxies via `/shinobi/`. HLS URLs are built by the backend using `SHINOBI_PUBLIC_URL`.

---

## After Changing `.env`

Always restart with `--update-env` so PM2 picks up the changes:

```bash
pm2 restart all --update-env
```
