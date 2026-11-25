# 11 — Deployment Guide

## Overview

| What | Where |
|---|---|
| Frontend (React) | Built locally → `scp` to server → Nginx serves `dist/` |
| Backend (Node.js) | Code copied to server → PM2 restarts |
| Shinobi (VMS) | Docker container — restart only when needed |

---

## Prerequisites on Your Machine

```bash
# Required tools
ssh        # SSH client
scp        # File copy over SSH
sshpass    # Non-interactive SSH password (install if missing)
node 18+   # For building frontend
npm        # Node package manager
```

Install `sshpass` if missing:
```bash
sudo apt install sshpass      # Ubuntu/Debian
brew install sshpass          # Mac
```

---

## Server Connection

```
IP:   103.109.7.37
Port: 35610
User: root
```

```bash
ssh root@103.109.7.37 -p 35610
```

---

## Deploy Frontend

Run these commands from your local machine every time you change frontend code.

### Step 1 — Set environment variables

```bash
cd smart-cam-app
cat .env
# Should contain:
# VITE_API_BASE_URL=http://103.109.7.37
# VITE_SHINOBI_URL=http://103.109.7.37:8443
```

### Step 2 — Build

```bash
cd smart-cam-app
npm run build
```

Output goes to `smart-cam-app/dist/`.

### Step 3 — Upload to server

```bash
# Delete old build on server
sshpass -f /tmp/sshpwd2 ssh -o StrictHostKeyChecking=no root@103.109.7.37 -p 35610 \
  "rm -rf /opt/drisyam/smart-cam-app/dist"

# Upload new build
sshpass -f /tmp/sshpwd2 scp -o StrictHostKeyChecking=no -P 35610 -r \
  smart-cam-app/dist \
  root@103.109.7.37:/opt/drisyam/smart-cam-app/
```

> **No Nginx restart needed** — Nginx serves static files directly from `dist/`.

### Verify

Open `https://drishyam.netforchoice.com` in browser → hard refresh (`Ctrl+Shift+R`).

---

## Deploy Backend

Run these steps when you change backend code (services, controllers, routes, etc.).

### Step 1 — Copy changed files to server

```bash
# Copy a specific file (faster)
sshpass -f /tmp/sshpwd2 scp -o StrictHostKeyChecking=no -P 35610 \
  smart-cam-backend/src/services/shinobi.service.js \
  root@103.109.7.37:/opt/drisyam/smart-cam-backend/src/services/

# Or copy entire src/ folder
sshpass -f /tmp/sshpwd2 scp -o StrictHostKeyChecking=no -P 35610 -r \
  smart-cam-backend/src \
  root@103.109.7.37:/opt/drisyam/smart-cam-backend/
```

### Step 2 — Restart backend

```bash
sshpass -f /tmp/sshpwd2 ssh -o StrictHostKeyChecking=no root@103.109.7.37 -p 35610 \
  "pm2 restart all --update-env"
```

### Step 3 — Verify

```bash
sshpass -f /tmp/sshpwd2 ssh -o StrictHostKeyChecking=no root@103.109.7.37 -p 35610 \
  "pm2 status && curl -s http://localhost:5000/api/health"
```

Should see all 4 instances `online` and `{"status":"ok",...}`.

---

## Deploy Both (Frontend + Backend)

```bash
# 1. Build frontend
cd smart-cam-app && npm run build && cd ..

# 2. Upload frontend
sshpass -f /tmp/sshpwd2 ssh -o StrictHostKeyChecking=no root@103.109.7.37 -p 35610 \
  "rm -rf /opt/drisyam/smart-cam-app/dist"
sshpass -f /tmp/sshpwd2 scp -o StrictHostKeyChecking=no -P 35610 -r \
  smart-cam-app/dist root@103.109.7.37:/opt/drisyam/smart-cam-app/

# 3. Upload backend
sshpass -f /tmp/sshpwd2 scp -o StrictHostKeyChecking=no -P 35610 -r \
  smart-cam-backend/src root@103.109.7.37:/opt/drisyam/smart-cam-backend/

# 4. Restart backend
sshpass -f /tmp/sshpwd2 ssh -o StrictHostKeyChecking=no root@103.109.7.37 -p 35610 \
  "pm2 restart all --update-env"
```

---

## Change Environment Variables

If you need to update `.env` on the server (e.g. new API key, new domain):

```bash
# SSH into server
ssh root@103.109.7.37 -p 35610

# Edit the file
nano /opt/drisyam/smart-cam-backend/.env

# Restart with updated env
pm2 restart all --update-env
```

Common variables to update:
- `CORS_ORIGINS` — add new allowed domains
- `S3_ACCESS_KEY` / `S3_SECRET_KEY` — if storage credentials change
- `SHINOBI_PUBLIC_URL` — if domain changes

---

## After Server Reboot

The server auto-starts Docker and PM2 on reboot. But Shinobi's MariaDB resets, so cameras need to be restored:

```bash
# SSH into server
ssh root@103.109.7.37 -p 35610

# Run restore script (inserts Shinobi users + Camera 06 + reconfigures cameras)
/opt/drisyam/restore-shinobi.sh
```

This runs automatically via crontab `@reboot`, but run it manually if cameras aren't showing.

---

## Quick Reference — One-Liners

```bash
# Deploy frontend only
cd smart-cam-app && npm run build && \
  sshpass -f /tmp/sshpwd2 ssh -o StrictHostKeyChecking=no root@103.109.7.37 -p 35610 "rm -rf /opt/drisyam/smart-cam-app/dist" && \
  sshpass -f /tmp/sshpwd2 scp -o StrictHostKeyChecking=no -P 35610 -r dist root@103.109.7.37:/opt/drisyam/smart-cam-app/

# Restart backend
sshpass -f /tmp/sshpwd2 ssh -o StrictHostKeyChecking=no root@103.109.7.37 -p 35610 "pm2 restart all --update-env"

# View backend logs
sshpass -f /tmp/sshpwd2 ssh -o StrictHostKeyChecking=no root@103.109.7.37 -p 35610 "pm2 logs drisyam-backend --lines 50"

# Check all services
sshpass -f /tmp/sshpwd2 ssh -o StrictHostKeyChecking=no root@103.109.7.37 -p 35610 "pm2 status && docker ps"

# Reconfigure all cameras (after Shinobi restart)
sshpass -f /tmp/sshpwd2 ssh -o StrictHostKeyChecking=no root@103.109.7.37 -p 35610 "/opt/drisyam/restore-shinobi.sh"
```

---

## Checklist Before Deploying

- [ ] Frontend: `.env` has correct `VITE_API_BASE_URL`
- [ ] Frontend: `npm run build` succeeds with no errors
- [ ] Backend: no syntax errors (`node -c src/server.js`)
- [ ] Backend: `.env` on server has all required variables
- [ ] After deploy: check `https://drishyam.netforchoice.com` loads
- [ ] After deploy: check `https://drishyam.netforchoice.com/api/health` returns `ok`
