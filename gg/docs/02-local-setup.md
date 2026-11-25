# 02 — Local Development Setup

## Prerequisites

- Node.js 18+
- Docker + Docker Compose
- MySQL 8.0 (local or Docker)
- Redis (optional)

---

## 1. Clone & Install

```bash
git clone <repo-url>
cd drisyam

# Backend
cd smart-cam-backend
npm install

# Frontend
cd ../smart-cam-app
npm install
```

---

## 2. Backend `.env`

Create `smart-cam-backend/.env`:

```env
NODE_ENV=development
PORT=5000

# MySQL
DB_HOST=localhost
DB_PORT=3306
DB_NAME=smart_cam_db
DB_USER=root
DB_PASSWORD=your_password

# JWT (use long random strings)
JWT_SECRET=your-jwt-secret-at-least-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret-at-least-32-chars
JWT_REFRESH_EXPIRES_IN=7d

# Shinobi VMS (running locally in Docker)
SHINOBI_URL=http://localhost:8443
SHINOBI_API_KEY=<from Shinobi UI>
SHINOBI_GROUP_KEY=<from Shinobi UI>
SHINOBI_SUPER_API_KEY=<from conf.json superApiKey>

# S3 Storage
S3_ENDPOINT=https://s3.10pb.com
S3_REGION=ap-south-1
S3_ACCESS_KEY=<your key>
S3_SECRET_KEY=<your secret>
S3_BUCKET=bms-001161

# CORS
CORS_ORIGINS=http://localhost:5173
FRONTEND_URL=http://localhost:5173

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Razorpay (payment)
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx
RAZORPAY_WEBHOOK_SECRET=xxx
```

---

## 3. Frontend `.env`

Create `smart-cam-app/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000
VITE_SHINOBI_URL=http://localhost:8443
```

---

## 4. Start Shinobi (Docker)

```bash
cd /opt/drisyam   # or wherever docker-compose.yml is
docker compose up -d
```

After first start, Shinobi DB is empty. Run the restore script:

```bash
/opt/drisyam/restore-shinobi.sh
```

See [08-shinobi-guide.md](./08-shinobi-guide.md) for full Shinobi setup.

---

## 5. Run the Backend

```bash
cd smart-cam-backend
npm run dev        # development (nodemon)
# or
npm start          # production
```

Backend starts on `http://localhost:5000`.

---

## 6. Run the Frontend

```bash
cd smart-cam-app
npm run dev
```

Frontend starts on `http://localhost:5173`.

---

## 7. Login

Default test account:
- Email: `test@systools.com`
- Password: `Systools@123`

---

## Useful Dev Commands

```bash
# Check backend logs
pm2 logs drisyam-backend

# Rebuild frontend
cd smart-cam-app && npm run build

# Test API health
curl http://localhost:5000/api/health
```
