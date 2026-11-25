# 08 — Shinobi VMS Guide

Shinobi is the open-source VMS that manages all camera streams and recordings. It runs in Docker.

---

## Key Facts

- **Docker container**: `drisyam-shinobi` (image: `registry.gitlab.com/shinobi-systems/shinobi:latest`)
- **Port**: `8443` on host → `8080` in container
- **UI**: `http://103.109.7.37:8443` (or via Nginx proxy)
- **Internal DB**: MariaDB inside the container (NOT persistent across restarts!)
- **HLS segments**: RAM disk at `/dev/shm/streams/` (fast, temporary)
- **Recordings**: `/home/Shinobi/videos/` (persisted via `shinobi_data` Docker volume)

---

## CRITICAL: MariaDB is NOT Persistent

Shinobi's internal MariaDB has **no volume mount** — every container restart wipes all users and camera configs.

**After every container restart, run:**
```bash
/opt/drisyam/restore-shinobi.sh
```

This script is also in crontab (`@reboot`) so it runs automatically after a server reboot.

---

## restore-shinobi.sh — What It Does

1. Waits for MariaDB to be ready inside container
2. Inserts the two Shinobi users back into `ccio.Users`
3. Restarts Shinobi Node.js inside container: `pm2 restart all`
4. Inserts Camera 06 directly into `ccio.Monitors` (bypasses 15-camera API limit)
5. Calls the backend `/reconfigure` endpoint to push all cameras to Shinobi + start recording

---

## Shinobi Users

| Role | Email | ke | auth |
|---|---|---|---|
| Super Admin | — | `drishyam-super-ke` | `drishyam-super-token-123` |
| Regular User | `test@systools.com` | `6b17427adfc70df0b5415ffd73a1e243` | `f07483f48995f5ada7e2033d6c7b34a4` |

The regular user's `ke` is the **group key** and `auth` is the **API key** used in all API calls.

To insert users manually:
```sql
docker exec drisyam-shinobi mysql -uroot ccio -e "
INSERT INTO Users (ke, auth, mail, pass, details, accountType, factorEnabled)
VALUES
('drishyam-super-ke', 'drishyam-super-token-123', 'super@drishyam.com', '', '{}', 'super', 0),
('6b17427adfc70df0b5415ffd73a1e243', 'f07483f48995f5ada7e2033d6c7b34a4', 'test@systools.com',
'839e9d6787ac71cf4911b0017c10ade9784fd4520b449943563b729adef2519c', '{}', 'user', 0)
ON DUPLICATE KEY UPDATE auth=VALUES(auth);
"
```

---

## Camera 06 — The 15-Camera Limit Workaround

Free Shinobi limits API-created monitors to **15 cameras**. Camera 06 (the 16th) must be inserted directly into MariaDB:

```sql
docker exec drisyam-shinobi mysql -uroot ccio -e "
INSERT INTO Monitors (ke, mid, name, type, ext, protocol, host, port, path, mode, details)
VALUES (
  '6b17427adfc70df0b5415ffd73a1e243',
  'da8cc3b3a5224db2ae63805d',
  'office 12 - Camera 06',
  'h264', 'mp4', 'rtsp', '111.125.141.20', 554, '/Streaming/Channels/601',
  'stop',
  '{\"auto_host\":\"rtsp://admin:Webin%40123abc45@111.125.141.20:554/Streaming/Channels/601\",\"auto_host_enable\":1,\"muser\":\"admin\",\"mpass\":\"Webin%40123abc45\",\"rtsp_transport\":\"tcp\",\"stream_type\":\"hls\",\"hls_time\":2,\"hls_list_size\":5,\"hls_flags\":\"delete_segments+omit_endlist\",\"stream_vcodec\":\"copy\",\"stream_fps\":0,\"vcodec\":\"copy\",\"acodec\":\"no\",\"cust_record\":\"-movflags frag_keyframe+empty_moov+default_base_moof+faststart\",\"cust_input\":\"\",\"cust_stream\":\"\",\"time_limit\":15,\"snap\":0}'
) ON DUPLICATE KEY UPDATE mid=mid;
"
```

Then start it:
```bash
curl http://localhost:8443/f07483f48995f5ada7e2033d6c7b34a4/monitor/6b17427adfc70df0b5415ffd73a1e243/da8cc3b3a5224db2ae63805d/record
```

---

## Shinobi API Cheat Sheet

Base: `http://localhost:8443/{apiKey}/`

| Action | HTTP |
|---|---|
| List monitors | `GET /{apiKey}/monitor/{groupKey}` |
| Configure monitor | `POST /{apiKey}/configureMonitor/{groupKey}/{monitorId}` body: `{data: JSON.stringify(config)}` |
| Start recording | `GET /{apiKey}/monitor/{groupKey}/{monitorId}/record` |
| Start stream only | `GET /{apiKey}/monitor/{groupKey}/{monitorId}/start` |
| Stop monitor | `GET /{apiKey}/monitor/{groupKey}/{monitorId}/stop` |
| Delete monitor | `GET /{apiKey}/monitor/{groupKey}/{monitorId}/delete` |
| List recordings | `GET /{apiKey}/videos/{groupKey}` |
| HLS stream | `GET /{apiKey}/hls/{groupKey}/{monitorId}/s.m3u8` |

---

## Checking Camera Status

```bash
curl -s http://localhost:8443/f07483f48995f5ada7e2033d6c7b34a4/monitor/6b17427adfc70df0b5415ffd73a1e243 \
  | python3 -c '
import sys, json
for m in sorted(json.load(sys.stdin), key=lambda x: x["name"]):
    print(m["name"], "|", m.get("status","?"))
'
```

All cameras should show `Recording`.

---

## HLS Segment Files

```bash
# Check HLS segments for a camera
ls /dev/shm/streams/6b17427adfc70df0b5415ffd73a1e243/{monitorId}/

# Should see: s.m3u8, s0.ts, s1.ts, s2.ts ...
# If only s.m3u8 with no .ts files → FFmpeg crashed (check RTSP connectivity)
```

---

## conf.json

Mounted at `/opt/drisyam/shinobi/conf.json` → `/home/Shinobi/conf.json` in container.

Key settings:
```json
{
  "port": 8080,
  "videosDir": "__DIR__/videos",
  "passwordType": "sha256",
  "db": {
    "host": "localhost",
    "user": "majesticflame",
    "password": "",
    "database": "ccio",
    "port": 3306
  }
}
```

Do not change `db` settings — Shinobi's internal MariaDB uses these.
