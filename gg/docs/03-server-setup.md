# 03 — Production Server Setup

## Server Info

| Item | Value |
|---|---|
| IP | `103.109.7.37` |
| SSH Port | `35610` |
| User | `root` |
| Domain | `https://drishyam.netforchoice.com` |
| OS | Ubuntu (Linux 6.x) |
| CPU | Intel Xeon E5-2650 v2, 12 cores |
| RAM | 32 GB |

```bash
ssh root@103.109.7.37 -p 35610
```

---

## Directory Layout on Server

```
/opt/drisyam/
├── docker-compose.yml          # Shinobi + MySQL containers
├── smart-cam-backend/          # Node.js backend (git clone here)
├── smart-cam-app/dist/         # Frontend build (Nginx serves this)
├── shinobi/
│   └── conf.json               # Shinobi config (mounted into container)
└── restore-shinobi.sh          # Run after server reboot
```

---

## Step-by-Step Fresh Setup

### 1. Install System Dependencies

```bash
apt update && apt upgrade -y
apt install -y nodejs npm nginx redis-server git curl python3
npm install -g pm2
```

### 2. Install Docker

```bash
apt install -y docker.io docker-compose-plugin
systemctl enable docker
systemctl start docker
```

### 3. Clone the Project

```bash
cd /opt/drisyam
git clone <repo-url> smart-cam-backend
```

### 4. Start Docker Services

```bash
cd /opt/drisyam
docker compose up -d
```

This starts:
- `drisyam-mysql` — MySQL 8.0 on `127.0.0.1:3307`
- `drisyam-shinobi` — Shinobi VMS on `0.0.0.0:8443`

### 5. Set Up Shinobi

**Shinobi's internal MariaDB is NOT persistent.** After every container restart, run:

```bash
/opt/drisyam/restore-shinobi.sh
```

This script:
1. Inserts Shinobi users back into the MariaDB
2. Restarts Shinobi Node.js (`pm2 restart all` inside container)
3. Inserts Camera 06 directly (bypasses the 15-camera API limit)

See [08-shinobi-guide.md](./08-shinobi-guide.md) for details.

### 6. Backend Setup

```bash
cd /opt/drisyam/smart-cam-backend
npm install

# Create .env (see 07-env-variables.md for all values)
nano .env

# Start with PM2 (4 cluster instances)
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # auto-start on reboot
```

### 7. Frontend Build

```bash
cd /opt/drisyam/smart-cam-app
# Set VITE_API_BASE_URL to the public domain or server IP
echo "VITE_API_BASE_URL=http://103.109.7.37" > .env
echo "VITE_SHINOBI_URL=http://103.109.7.37:8443" >> .env
npm install
npm run build
# Built files land in dist/
```

### 8. Nginx Setup

```bash
nano /etc/nginx/sites-enabled/default
```

Paste this config:

```nginx
server {
    listen 80;
    server_name 103.109.7.37 drishyam.netforchoice.com;

    root /opt/drisyam/smart-cam-app/dist;
    index index.html;

    # Proxy Shinobi HLS (avoids HTTPS mixed-content block)
    location /shinobi/ {
        proxy_pass http://127.0.0.1:8443/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_buffering off;
        proxy_read_timeout 300s;
        add_header Cross-Origin-Resource-Policy cross-origin always;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        client_max_body_size 100M;
    }

    # React SPA
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
nginx -t && systemctl reload nginx
```

### 9. Configure Cameras

After backend is running, call the reconfigure endpoint to push all cameras to Shinobi:

```bash
# Login first to get a token
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@systools.com","password":"Systools@123"}' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["accessToken"])')

# Get group ID
GROUP=$(curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/groups \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)[0]["id"])')

# Reconfigure + start all cameras
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/groups/$GROUP/reconfigure
```

---

## Maintenance Commands

```bash
# Check all services
pm2 status
docker ps

# Restart backend
pm2 restart all --update-env

# View backend logs
pm2 logs drisyam-backend --lines 100

# Check server load
top -b -n1 | head -5

# Check Shinobi camera statuses
curl -s http://localhost:8443/<apiKey>/monitor/<groupKey> | python3 -m json.tool

# Check S3 uploads working
pm2 logs drisyam-backend --lines 200 | grep -i 'upload\|s3\|sync'
```

---

## After Server Reboot Checklist

1. `docker ps` — verify both containers are up
2. `/opt/drisyam/restore-shinobi.sh` — restore Shinobi DB
3. `pm2 status` — verify backend is running
4. `systemctl status nginx` — verify Nginx is running
5. Call `POST /api/groups/:id/reconfigure` to restart all cameras
