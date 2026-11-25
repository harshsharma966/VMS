# Drisyam VMS — Server Credentials & Access Info

## Server
| Field    | Value              |
|----------|--------------------|
| IP       | 103.109.7.37       |
| User     | root               |
| Password | 123qwe,./@!QAZse4  |
| SSH Port | 22                 |
| OS       | Ubuntu 22.04.5 LTS |

---

## Application URLs
| Service          | URL                              |
|------------------|----------------------------------|
| Frontend (App)   | http://103.109.7.37              |
| Backend API      | http://103.109.7.37/api          |
| Shinobi VMS      | http://103.109.7.37:8443         |

---

## MySQL Database (Docker)
| Field     | Value           |
|-----------|-----------------|
| Host      | 127.0.0.1       |
| Port      | 3307            |
| Database  | drishyamvms     |
| User      | drishyam        |
| Password  | Drishyam@2026   |
| Root Pass | RootPass@2026   |

---

## Shinobi VMS (Docker)
| Field           | Value                        |
|-----------------|------------------------------|
| Admin Email     | admin@shinobi.video          |
| Admin Password  | admin                        |
| API Key         | f07483f48995f5ada7e2033d6c7b34a4 |
| Group Key       | 6b17427adfc70df0b5415ffd73a1e243 |
| Super API Key   | drishyam-super-token-123     |

---

## S3 Object Storage (10PB)
| Field      | Value                                |
|------------|--------------------------------------|
| Endpoint   | https://s3.10pb.com                  |
| Region     | ap-south-1                           |
| Bucket     | bms-001161                           |
| Access Key | M2MNWLSAF97U7TFKC1IW                 |
| Secret Key | velSwDL1ioYAd8A1csG0IjNLspWAvlpvCIw7XFEA |

---

## JWT Secrets (Production)
| Field           | Value                                                    |
|-----------------|----------------------------------------------------------|
| JWT Secret      | prod-jwt-secret-drishyam-vms-2026-must-be-at-least-32-chars-long |
| Refresh Secret  | prod-refresh-secret-drishyam-vms-2026-must-be-at-least-32-chars  |

---

## Project Paths on Server
| Component        | Path                                   |
|------------------|----------------------------------------|
| Project Root     | /opt/drisyam/                          |
| Backend          | /opt/drisyam/smart-cam-backend/        |
| Frontend Build   | /opt/drisyam/smart-cam-app/dist/       |
| Nginx Config     | /etc/nginx/sites-available/drisyam     |
| Docker Compose   | /opt/drisyam/docker-compose.yml        |
| Logs             | /opt/drisyam/logs/                     |
| Backups          | /opt/drisyam/backups/                  |

---

## Useful Commands (run on server)
```bash
# Backend status
pm2 status
pm2 logs drisyam-backend

# Restart backend
pm2 restart drisyam-backend

# Docker services
docker ps
docker compose -f /opt/drisyam/docker-compose.yml up -d
docker compose -f /opt/drisyam/docker-compose.yml down

# Nginx
nginx -t
systemctl reload nginx

# Redis
redis-cli ping
```
