# Drishyam VMS — Streaming Architecture HLD
## Goal: Smooth, Low-Latency, Multi-Region SAAS Streaming

---

## 1. The Problem (Root Cause Analysis)

### Why videos get stuck today

| Issue | Root Cause | Impact |
|---|---|---|
| **Video freezes** | HLS polling fails if one segment is late | Player stalls waiting for next segment |
| **High latency (~6–10s)** | `hls_time=2` × `hls_list_size=3` = 6s minimum | Viewers see old footage |
| **CPU spikes** | H.265→H.264 software transcoding on every frame | FFmpeg falls behind, segments arrive late |
| **Remote users lag** | HLS served directly from Shinobi, no CDN | Packets travel far, round-trips slow |
| **No fault tolerance** | Single Shinobi instance | One crash = all cameras down |

---

## 2. Streaming Protocol Comparison

| Protocol | Latency | Browser Support | Complexity | Use Case |
|---|---|---|---|---|
| **HLS (current)** | 6–30s | All browsers | Low | Good for recordings, tolerable for CCTV |
| **Low-Latency HLS (LL-HLS)** | 1–3s | All modern browsers | Medium | CCTV live view — **recommended** |
| **WebRTC** | <500ms | All modern browsers | High | PTZ control, ultra-live scenarios |
| **RTMP** | 2–5s | Flash only (dead) | Low | Not for browsers |
| **SRT** | 1–2s | Not native | Medium | Transport between servers |

**Decision: LL-HLS for primary, WebRTC as optional upgrade.**

---

## 3. Immediate Fixes (Zero Infrastructure Change)

### Fix 1 — Better FFmpeg settings in `shinobi.service.js`

Change `_buildShinobiConfig()` to use these values:

```
// Current (broken for SAAS):
hls_time: '2'
hls_list_size: '3'
cust_stream: '-preset ultrafast -tune zerolatency -g 30'
stream_vcodec: 'libx264'

// Fixed (lower latency, smoother):
hls_time: '1'                 // 1-second segments instead of 2
hls_list_size: '6'            // keep 6 segments = 6s of buffer for recovery
hls_flags: 'delete_segments+append_list+omit_endlist+independent_segments'
cust_stream: '-preset ultrafast -tune zerolatency -g 15 -sc_threshold 0 -b:v 2000k -maxrate 2500k -bufsize 4000k'
stream_vcodec: 'copy'         // Try 'copy' first — skip transcoding if camera outputs H.264
```

> **`copy` vcodec**: If the IP camera already outputs H.264, skip transcoding entirely.
> FFmpeg just remuxes → CPU drops 80%, latency drops ~1s.
> Only fall back to `libx264` if camera uses H.265/MJPEG.

### Fix 2 — HLS.js player config on the frontend

```js
// In the React live view component, configure HLS.js:
const hls = new Hls({
  liveSyncDurationCount: 2,     // sync to last 2 segments (was default 3)
  liveMaxLatencyDurationCount: 5,
  lowLatencyMode: false,        // enable only when using LL-HLS
  maxBufferLength: 10,
  maxMaxBufferLength: 30,
  enableWorker: true,
  backBufferLength: 0,          // don't keep back buffer for live
  fragLoadingMaxRetry: 6,       // retry failed segments 6 times
  fragLoadingRetryDelay: 500,
  manifestLoadingMaxRetry: 4,
});
```

### Fix 3 — Nginx reverse proxy with segment caching

Run Nginx in front of Shinobi. Nginx caches `.m3u8` and `.ts` segments,
so multiple viewers of the same camera don't each hit Shinobi separately.

```nginx
# /etc/nginx/sites-available/shinobi-proxy
proxy_cache_path /dev/shm/hls_cache levels=1:2 keys_zone=hls:10m max_size=1g inactive=10s use_temp_path=off;

server {
    listen 8444;

    # Cache HLS segments (ts files) — short TTL
    location ~* \.ts$ {
        proxy_pass http://localhost:8443;
        proxy_cache hls;
        proxy_cache_valid 200 2s;
        proxy_cache_use_stale updating;
        add_header X-Cache-Status $upstream_cache_status;
    }

    # Don't cache the manifest (m3u8) — always fresh
    location ~* \.m3u8$ {
        proxy_pass http://localhost:8443;
        proxy_no_cache 1;
        proxy_cache_bypass 1;
        add_header Cache-Control "no-cache, no-store";
    }

    location / {
        proxy_pass http://localhost:8443;
    }
}
```

**Result**: 10 viewers of the same camera = 1 Shinobi request, not 10.

---

## 4. Production SAAS Architecture

```
                        ┌─────────────────────────────────┐
                        │         IP Cameras (RTSP)        │
                        │  Hikvision / Dahua / Axis / etc  │
                        └──────────────┬──────────────────┘
                                       │ RTSP (TCP)
                        ┌──────────────▼──────────────────┐
                        │      Edge Media Server           │
                        │   (Shinobi + FFmpeg, per site)   │
                        │   Outputs: HLS + MP4 recordings  │
                        └──────────────┬──────────────────┘
                                       │ HLS push / RTMP relay
              ┌───────────────────────▼──────────────────────────┐
              │             Origin Media Cluster                   │
              │         (Nginx-RTMP or Ant Media Server)          │
              │  - Receives streams from all edge sites           │
              │  - Transcodes to multiple bitrates (ABR)          │
              │  - Pushes segments to CDN origin                  │
              └───────────────────────┬──────────────────────────┘
                                      │ HLS segments
              ┌───────────────────────▼──────────────────────────┐
              │                    CDN Layer                       │
              │         (Cloudflare / AWS CloudFront)             │
              │  - PoPs in IN, US, EU, SEA, etc.                  │
              │  - Caches .ts segments for 2-4s                   │
              │  - Does NOT cache .m3u8 (always fresh)            │
              │  - Auto-routes viewer to nearest PoP              │
              └───────────────────────┬──────────────────────────┘
                                      │ HTTPS
              ┌───────────────────────▼──────────────────────────┐
              │                   Browser                         │
              │  HLS.js plays stream from CDN edge               │
              │  Latency: 2–4s from camera to screen              │
              └──────────────────────────────────────────────────┘

              ┌─────────────────────────────────────────────────┐
              │              Drishyam Backend (Node.js)          │
              │  - Manages users, cameras, subscriptions         │
              │  - Provisions Shinobi monitors via API           │
              │  - Generates signed CDN URLs for playback        │
              │  - Stores recordings metadata in MySQL            │
              └─────────────────────────────────────────────────┘
```

---

## 5. Multi-Region Scale Plan

### Phase 1: Single Region (Current)
```
1 Shinobi instance → Nginx cache → Direct to browser
Handles: ~20–50 cameras, ~100 concurrent viewers
```

### Phase 2: CDN-enabled (Next step — low cost)
```
Shinobi → Nginx → Cloudflare CDN → Browser
Cost: ~$20/month Cloudflare Pro
Handles: 50–200 cameras, viewers anywhere in world
Latency improvement: 30–70% for remote viewers
```

### Phase 3: Multi-Shinobi + Load Balancer
```
Camera groups distributed across Shinobi instances
- Shinobi-1: Cameras 1–50 (one physical location)
- Shinobi-2: Cameras 51–100 (another location)
- Nginx load balancer routes /hls/{groupKey}/... to correct instance
Handles: 200–1000 cameras
```

### Phase 4: Full SAAS Scale (Kubernetes)
```
- Shinobi pods auto-scaled (HPA based on CPU)
- Ant Media Server cluster for WebRTC fallback
- Cloudflare CDN for global distribution
- Redis for stream state across instances
- Each tenant (buyer) gets isolated Shinobi group
Handles: 1000+ cameras, unlimited viewers
```

---

## 6. Handling the "Stuck Video" Problem Specifically

### Why it sticks
HLS.js downloads segments sequentially. If segment N is late (FFmpeg
fell behind due to transcoding load), HLS.js stalls until it arrives.

### Solutions in order of priority

**A. Use `copy` vcodec** — Remove transcoding if camera outputs H.264.
FFmpeg just copies bytes. Cannot fall behind.

**B. Use hardware transcoding (if H.265 cameras)**
```
# NVIDIA GPU (if available):
cust_stream: '-preset ultrafast -tune zerolatency -g 15 -c:v h264_nvenc'

# Intel QuickSync:
cust_stream: '-preset ultrafast -tune zerolatency -g 15 -c:v h264_qsv'

# Raspberry Pi / ARM:
cust_stream: '-preset ultrafast -tune zerolatency -g 15 -c:v h264_v4l2m2m'
```

**C. Increase `hls_list_size` (buffer headroom)**
```
hls_list_size: '8'   // 8 seconds of segments = 8s to recover from hiccup
hls_time: '1'        // but each segment is only 1s → latency stays low
```

**D. Player-side: auto-recover on stall**
```js
hls.on(Hls.Events.ERROR, (event, data) => {
  if (data.fatal) {
    switch (data.type) {
      case Hls.ErrorTypes.NETWORK_ERROR:
        hls.startLoad(); // retry network error
        break;
      case Hls.ErrorTypes.MEDIA_ERROR:
        hls.recoverMediaError(); // recover from media error
        break;
      default:
        // Reinitialize the player
        hls.destroy();
        initPlayer();
    }
  }
});
```

**E. Show heartbeat indicator** — let the user know if stream is live or
reconnecting, rather than just freezing with no feedback.

---

## 7. Recording Pipeline (No Change Needed)

The S3 recording pipeline is already solid:
- Shinobi → 15-min MP4 clips → `recordingSync.service.js` → S3 (10PB)
- Signed playback URLs generated on demand

Only improvement: add a **retention job** to auto-delete old recordings
from S3 after N days to control storage costs.

---

## 8. Summary — What to Implement

| Priority | Change | Effort | Impact |
|---|---|---|---|
| **P0** | Use `copy` vcodec for H.264 cameras | 5 min | Eliminates transcoding lag |
| **P0** | Set `hls_time: '1'`, `hls_list_size: '8'` | 5 min | Smoother playback, 50% less latency |
| **P0** | Add HLS.js error recovery handler | 30 min | Auto-recovers from stalls |
| **P1** | Nginx HLS segment cache | 2 hours | Multi-viewer efficiency |
| **P1** | HLS.js `liveSyncDurationCount: 2` | 15 min | Reduce live delay |
| **P2** | Cloudflare CDN for HLS segments | 1 day | Global viewers, no lag |
| **P3** | Second Shinobi instance + load balancer | 1 week | Scale to 200+ cameras |
| **P4** | WebRTC for <1s latency | 2 weeks | Premium plan feature |

---

*Last updated: February 2026*
