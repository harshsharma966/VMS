# AI Detection Architecture — Drisyam VMS

## Overview

This document covers how to add **real-time, multi-layer AI detection** to the Drisyam VMS
stack using 100% open-source tools, with a clear scaling path from a single-server dev
setup to a distributed GPU cluster.

---

## Detection Philosophy: Multi-Layer Funnel

Running a full neural network on every frame of every camera is prohibitively expensive.
The correct approach is a **coarse-to-fine funnel** where cheap filters eliminate most frames
before expensive models ever see them.

```
RTSP Stream (25–30 fps per camera)
        │
        ▼  Layer 1 — Motion Detection           ← CPU, ~0.5 ms/frame
   ┌─────────────────────────────────┐
   │  Background subtraction         │  MOG2 / frame-diff
   │  Skip static frames entirely    │  Only ~2–5% of frames have motion
   └──────────────┬──────────────────┘
                  │ Motion frames only (~1–2 fps equivalent)
                  ▼  Layer 2 — Object Detection         ← GPU/CPU, ~20–80 ms/frame
   ┌─────────────────────────────────┐
   │  YOLOv8n / YOLOv8s             │  person, car, animal, package
   │  Frigate's embedded detector    │  Returns bounding boxes + confidence
   └──────────────┬──────────────────┘
                  │ Detections with confidence > threshold
                  ▼  Layer 3 — Classification / Re-ID   ← GPU optional
   ┌─────────────────────────────────┐
   │  DeepFace / InsightFace         │  Face recognition (opt-in)
   │  ByteTrack / BotSort            │  Multi-object tracking across frames
   │  CLIP / custom classifier       │  Activity classification
   └──────────────┬──────────────────┘
                  │ Structured events
                  ▼  Layer 4 — Event & Alert Engine     ← CPU, rule-based
   ┌─────────────────────────────────┐
   │  Rule engine (zones, schedules) │  "Person in zone A after 22:00"
   │  Cooldown / dedup logic         │  Suppress repeated alerts
   │  Snapshot + clip extraction     │  Grab the moment ± buffer
   └──────────────┬──────────────────┘
                  │
       ┌──────────┴──────────┐
       ▼                     ▼
  MySQL events DB       Push notifications
  S3 event clips        WebSocket → frontend
```

---

## Open-Source Tool Comparison

### Tier 1 — Integrated NVR + Detection

| Tool | Detection Engine | Recording | REST API | GPU | Best For |
|---|---|---|---|---|---|
| **Frigate NVR** | YOLOv8 + edgeTPU | Yes (local) | Yes | Yes (optional) | Drop-in NVR replacement with detection built in |
| **Viseron** | YOLOv8 / Darknet | Yes | Yes | Yes | Modular, very configurable |
| **Agent DVR** | Various | Yes | Yes | Yes | Feature-rich but partly closed |

### Tier 2 — Detection Microservices (plug into existing stack)

| Tool | What it does | Language | GPU | Notes |
|---|---|---|---|---|
| **DeepStack** | HTTP API: detect, face, scene | Python | Optional | Simple to integrate; runs as Docker container |
| **CodeProject.AI** | Drop-in DeepStack replacement | .NET/Python | Optional | Actively maintained fork |
| **Ultralytics YOLOv8** | Inference library | Python | Optional | Use directly in a custom worker |
| **OpenCV DNN module** | Local inference | C++/Python | Optional | Lightweight; great for CPU-only |
| **Roboflow Inference** | Hosted or self-hosted YOLO | Python | Optional | Easy model management |

### Tier 3 — Tracking & Re-ID

| Tool | Purpose | Notes |
|---|---|---|
| **ByteTrack** | Multi-object tracking across frames | Best accuracy at high occlusion |
| **BotSort** | Improved ByteTrack variant | Better ID switching |
| **DeepSORT** | Person re-identification | Requires appearance embedding model |
| **InsightFace** | Face recognition + age/gender | Apache 2.0 license |

### Tier 4 — Hardware Accelerators

| Accelerator | Speed | Cost | Notes |
|---|---|---|---|
| CPU only | ~80–200 ms/frame | Free | YOLOv8n runs at ~15 fps on modern i7 |
| NVIDIA GPU (CUDA) | ~5–20 ms/frame | $300–$3000 | Best throughput; use TensorRT for further 3–5× |
| Google Coral TPU | ~5 ms/frame | $60 | USB or M.2; requires quantised model |
| Intel OpenVINO | ~10–30 ms/frame | Free (iGPU) | Great for edge deployments |
| Raspberry Pi 5 + Hailo-8 | ~10 ms/frame | ~$120 | Edge node per camera cluster |

---

## Recommended Architecture for Drisyam

### Option A — Frigate as Camera Engine (replace Shinobi)

Frigate is the simplest path if you also want to replace Shinobi:

```
IP Camera (RTSP)
       │
       ▼
┌──────────────────────────────────────────┐
│  Frigate NVR                             │
│  • RTSP ingestion                        │
│  • Motion + object detection (YOLOv8)   │
│  • Writes MP4 clips with detection tags  │
│  • REST API + MQTT events                │
│  • HLS live stream                       │
└──────────────────────────────────────────┘
       │ events (MQTT / webhook)
       ▼
┌──────────────────────────────────────────┐
│  Drisyam Backend (Node.js)               │
│  • Consumes Frigate events               │
│  • Stores in MySQL (detections table)    │
│  • Uploads clips/snapshots to S3         │
│  • Pushes alerts via WebSocket           │
└──────────────────────────────────────────┘
```

**Pros**: one service does everything; best-maintained open-source NVR with detection.
**Cons**: replaces Shinobi entirely; Frigate is Python + Go and needs more RAM (~1 GB).

---

### Option B — Sidecar Detection Worker (keep Shinobi)

Keep the current Shinobi-based recording pipeline and add a **separate detection
microservice** that taps the same RTSP streams:

```
IP Camera (RTSP)
       │
       ├──────────────────────────────────────────┐
       │                                          │
       ▼                                          ▼
┌────────────────┐                     ┌──────────────────────┐
│  Shinobi VMS   │                     │  Detection Worker     │
│  (recording)   │                     │  (Python service)     │
│                │                     │                       │
│  Writes MP4    │                     │  • Reads RTSP stream  │
│  to disk       │                     │  • Layer 1: MOG2      │
└────────────────┘                     │  • Layer 2: YOLOv8    │
       │                               │  • Layer 3: ByteTrack │
       │ sync to S3                    │  • Publishes events   │
       ▼                               └──────────┬────────────┘
┌────────────────┐                                │ Redis Pub/Sub
│  S3 Storage    │◄───────────────────────────────┤
└────────────────┘                                │
                                                  ▼
                                    ┌──────────────────────────┐
                                    │  Drisyam Backend          │
                                    │  • Subscribes to events   │
                                    │  • Saves to MySQL         │
                                    │  • WebSocket → frontend   │
                                    └──────────────────────────┘
```

**Pros**: zero disruption to existing recording pipeline; detection can be scaled
independently; can be added incrementally.
**Cons**: two services tapping each camera doubles RTSP connections (most cameras
allow 2–4 simultaneous RTSP readers).

---

## Detection Worker — Implementation Detail

### File: `detection-worker/` (Python microservice)

```
detection-worker/
├── main.py              # Entry point — reads config, spawns camera workers
├── camera_worker.py     # One process per camera — grabs frames, runs pipeline
├── motion.py            # Layer 1: MOG2 background subtraction
├── detector.py          # Layer 2: YOLOv8 inference (ultralytics)
├── tracker.py           # Layer 3: ByteTrack integration
├── event_publisher.py   # Publishes to Redis Pub/Sub channel
├── config.yaml          # Camera list, thresholds, zone definitions
└── requirements.txt     # ultralytics, opencv-python, redis, bytetrack
```

### camera_worker.py — Core Loop

```python
import cv2
from ultralytics import YOLO
from motion import MotionDetector
from tracker import Tracker
from event_publisher import publish_event

model = YOLO('yolov8n.pt')   # nano model — fastest; swap for yolov8s for better recall
motion = MotionDetector()
tracker = Tracker()

cap = cv2.VideoCapture(rtsp_url)

while True:
    ret, frame = cap.read()
    if not ret:
        reconnect(cap, rtsp_url)
        continue

    # Layer 1: motion gate — skip if nothing moved
    if not motion.has_motion(frame):
        continue

    # Layer 2: object detection
    results = model(frame, classes=[0, 2, 15, 16])  # person, car, cat, dog
    detections = results[0].boxes

    if len(detections) == 0:
        continue

    # Layer 3: tracking — assign persistent IDs across frames
    tracked = tracker.update(detections, frame)

    # Layer 4: publish structured event
    for obj in tracked:
        publish_event({
            'camera_id': camera_id,
            'timestamp': time.time(),
            'label': obj.label,
            'confidence': obj.confidence,
            'track_id': obj.track_id,
            'bbox': obj.bbox,
            'zone': zone_check(obj.bbox, camera_zones),
        })
```

### event_publisher.py — Redis Channel

```python
import redis, json

r = redis.Redis.from_url(REDIS_URL)

def publish_event(event: dict):
    r.publish('detections', json.dumps(event))
    # Also push to a list for persistence
    r.lpush('detection_events', json.dumps(event))
    r.ltrim('detection_events', 0, 9999)   # keep last 10k events
```

---

## Backend Integration (Node.js)

### New: `detection.service.js`

```javascript
const redis = require('../config/redis');
const { io } = require('../config/socket');   // existing socket.io

// Subscribe to detection events from Python worker
const sub = redis.getClient().duplicate();
sub.subscribe('detections');

sub.on('message', async (channel, message) => {
  const event = JSON.parse(message);

  // Persist to MySQL
  await Detection.create({
    cameraId: event.camera_id,
    label: event.label,
    confidence: event.confidence,
    trackId: event.track_id,
    bbox: JSON.stringify(event.bbox),
    zone: event.zone,
    detectedAt: new Date(event.timestamp * 1000),
  });

  // Push real-time alert to connected browsers
  io.to(`user:${userId}`).emit('detection', event);
});
```

### New MySQL Table

```sql
CREATE TABLE detections (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  camera_id     INT UNSIGNED NOT NULL,
  label         VARCHAR(64) NOT NULL,          -- 'person', 'car', etc.
  confidence    FLOAT NOT NULL,
  track_id      INT UNSIGNED,                  -- ByteTrack persistent ID
  bbox          JSON,                          -- {x1,y1,x2,y2}
  zone          VARCHAR(128),                  -- matched zone name or NULL
  snapshot_key  VARCHAR(512),                  -- S3 key of JPEG snapshot
  clip_key      VARCHAR(512),                  -- S3 key of event clip (±15s)
  detected_at   DATETIME(3) NOT NULL,
  INDEX idx_camera_time (camera_id, detected_at),
  INDEX idx_label       (label),
  FOREIGN KEY (camera_id) REFERENCES cameras(id)
);
```

---

## Zone-Based Detection

Define no-go zones, entry zones, or counting lines per camera in `config.yaml`:

```yaml
cameras:
  - id: cam-001
    rtsp: rtsp://admin:pass@192.168.1.10/stream1
    zones:
      - name: "entrance"
        polygon: [[100, 200], [400, 200], [400, 500], [100, 500]]
        alerts:
          - label: person
            after: "22:00"
            before: "06:00"
      - name: "parking"
        polygon: [[0, 0], [640, 0], [640, 300], [0, 300]]
        alerts:
          - label: car
            min_dwell_seconds: 30
```

Zone check uses OpenCV `pointPolygonTest` — pure CPU, microseconds per call.

---

## Scaling Architecture

### Single Server (≤ 16 cameras, CPU-only)

```
┌────────────────────────────────────────────┐
│  Single Server (8-core, 16 GB RAM)         │
│                                            │
│  detection-worker (Python)                 │
│  ├── cam-001 worker process                │
│  ├── cam-002 worker process                │
│  └── ... (one process per camera)          │
│                                            │
│  YOLOv8n @ CPU: ~60 ms/frame               │
│  With motion gate: effectively 1–3 fps     │
│  Total CPU: ~4 cores for 16 cameras        │
└────────────────────────────────────────────┘
```

**Rule of thumb**: 1 CPU core handles ~4 cameras with motion gating + YOLOv8n.

---

### Medium Scale (≤ 64 cameras, 1× GPU)

Add a GPU server as a detection API endpoint. Camera workers send frames via gRPC
instead of running inference locally.

```
┌─────────────────────────┐      ┌──────────────────────────────┐
│  App Server             │      │  GPU Inference Server        │
│  (camera workers)       │      │  (NVIDIA RTX 3080 or A4000)  │
│                         │      │                              │
│  cam-001 worker ────────┼─────►│  Triton Inference Server     │
│  cam-002 worker ────────┼─────►│  or TorchServe               │
│  ...                    │      │  or simple FastAPI endpoint  │
│  cam-064 worker ────────┼─────►│                              │
│                         │      │  YOLOv8s @ GPU: ~8 ms/frame  │
│  Sends JPEG frames      │      │  Batch size 8: 64 fps total  │
│  via gRPC/HTTP          │◄─────┼─  Returns bounding boxes     │
└─────────────────────────┘      └──────────────────────────────┘
```

**Triton Inference Server** (NVIDIA, open-source) handles batching automatically —
frames from 64 cameras are auto-batched and processed together on the GPU.

---

### Large Scale (≥ 64 cameras, distributed)

```
                           ┌─────────────────────────────────────┐
                           │  Message Queue (Redis Streams)       │
                           │  or Apache Kafka                     │
                           │                                      │
                           │  Topic: raw-frames                   │
                           │  Topic: detections                   │
                           └──────────────┬──────────────────────┘
                                          │
                    ┌─────────────────────┼──────────────────────┐
                    ▼                     ▼                      ▼
          ┌──────────────┐     ┌──────────────┐      ┌──────────────┐
          │  GPU Worker 1│     │  GPU Worker 2│      │  GPU Worker N│
          │  (8× A10G)   │     │  (8× A10G)   │      │  (8× A10G)   │
          │  16 cams each│     │  16 cams each│      │  16 cams each│
          └──────┬───────┘     └──────┬───────┘      └──────┬───────┘
                 │                    │                      │
                 └──────────────┬─────┘──────────────────────┘
                                ▼
                     ┌─────────────────────┐
                     │  Event Aggregator   │
                     │  (Node.js service)  │
                     │  • Dedup            │
                     │  • Zone logic       │
                     │  • Save to MySQL    │
                     │  • Push WebSocket   │
                     └─────────────────────┘
```

**Kafka** is preferred over Redis Streams at this scale because:
- Persistent replay (re-process frames if a model is updated)
- Consumer group load balancing across GPU workers
- Back-pressure handling when GPU workers are slow

---

## Model Selection Guide

| Model | Size | Speed (CPU) | Speed (GPU) | mAP50 | Use Case |
|---|---|---|---|---|---|
| **YOLOv8n** | 6 MB | ~15 fps | ~200 fps | 37.3 | Edge / CPU-only |
| **YOLOv8s** | 22 MB | ~8 fps | ~160 fps | 44.9 | Balanced |
| **YOLOv8m** | 52 MB | ~4 fps | ~80 fps | 50.2 | High accuracy |
| **YOLOv8l** | 87 MB | ~2 fps | ~50 fps | 52.9 | Best accuracy |
| **YOLOv10n** | 2.3 MB | ~20 fps | ~250 fps | 38.5 | Fastest available |
| **RT-DETR-L** | 124 MB | ~1 fps | ~100 fps | 53.0 | Real-time transformer |

**Recommendation**: start with **YOLOv8n** (CPU) or **YOLOv8s** (GPU). With motion
gating, effective frame rate is 1–3 fps regardless of model throughput.

---

## Frigate NVR — Configuration Example

If choosing Option A (replace Shinobi with Frigate):

```yaml
# /etc/frigate/config.yml

mqtt:
  host: localhost
  port: 1883

database:
  path: /data/frigate.db

detectors:
  cpu1:
    type: cpu           # or 'gpu' for NVIDIA, 'edgetpu' for Coral
    num_threads: 4

model:
  path: /models/yolov8n_320.tflite    # or 'default' for built-in

cameras:
  entrance-cam:
    ffmpeg:
      inputs:
        - path: rtsp://admin:pass@192.168.1.10/stream1
          roles: [detect, record]
    detect:
      width: 640
      height: 480
      fps: 5           # only detect at 5 fps; record at full rate
    record:
      enabled: true
      retain:
        days: 3        # keep on-disk for 3 days (Drisyam syncs to S3)
    motion:
      threshold: 30
    objects:
      track: [person, car, dog]
      filters:
        person:
          min_score: 0.65
          threshold: 0.75

# Webhook for Drisyam backend
notifications:
  - type: webhook
    url: http://localhost:5000/api/internal/detection-event
    events: [new_snapshot, new_clip]
```

---

## Event Clip Extraction

When a detection fires, extract a ±15-second clip from the ongoing recording:

```javascript
// In detection.service.js when receiving a Frigate/worker event
async function extractEventClip(cameraId, detectedAt, label) {
  const clipStart = detectedAt - 10_000;  // 10s before
  const clipEnd   = detectedAt + 5_000;   // 5s after

  // Find the S3 recording that covers this time range
  const clip = await findRecordingCoveringRange(cameraId, clipStart, clipEnd);
  if (!clip) return;

  const presignedUrl = await s3Service.getPlaybackUrl(clip.s3Key, 300);

  // Trim with FFmpeg
  const offsetSeconds = (clipStart - clip.startTime) / 1000;
  const outKey = `events/${cameraId}/${label}/${Date.now()}.mp4`;

  await new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', [
      '-ss', String(offsetSeconds),
      '-i', presignedUrl,
      '-t', '15',
      '-c', 'copy',
      '-movflags', '+faststart',
      '-f', 'mp4', 'pipe:1',
    ]);
    const chunks = [];
    ff.stdout.on('data', (c) => chunks.push(c));
    ff.on('close', async (code) => {
      if (code !== 0) return reject(new Error('ffmpeg clip extract failed'));
      await s3Service.uploadBuffer(outKey, Buffer.concat(chunks), 'video/mp4');
      resolve();
    });
  });

  return outKey;
}
```

---

## Frontend Integration

### Real-time Alerts via WebSocket

```jsx
// In Timeline.jsx or a new Alerts.jsx
useEffect(() => {
  const socket = io(API_URL, { auth: { token } });

  socket.on('detection', (event) => {
    toast.custom(() => (
      <div className="flex items-center gap-3 bg-zinc-900 border border-red-500/40 p-3 rounded-xl">
        <span className="text-red-400 text-sm font-semibold uppercase">{event.label}</span>
        <span className="text-zinc-400 text-xs">{event.zone || event.camera_id}</span>
        <span className="text-zinc-500 text-xs">{new Date(event.timestamp * 1000).toLocaleTimeString()}</span>
      </div>
    ));
  });

  return () => socket.disconnect();
}, []);
```

### Detection Overlay on Video Player

Draw bounding boxes on a `<canvas>` element overlaid on the `<video>`:

```jsx
// When playing back a recording, fetch detections for that time range
const { data: detections } = useQuery({
  queryKey: ['detections', cameraId, recording.startTime, recording.endTime],
  queryFn: () => api.get(`/cameras/${cameraId}/detections`, {
    params: { from: recording.startTime, to: recording.endTime }
  }),
});

// Draw on canvas in sync with video.currentTime
videoRef.current.ontimeupdate = () => {
  const currentDetections = detections.filter(d =>
    Math.abs(d.offsetSeconds - videoRef.current.currentTime) < 0.5
  );
  drawBboxes(canvasRef.current, currentDetections);
};
```

---

## Deployment Checklist

### Phase 1 — CPU baseline (any server)
- [ ] Deploy detection-worker as systemd service alongside Shinobi/Frigate
- [ ] Start with 4 cameras, YOLOv8n, motion gating enabled
- [ ] Add `detections` table to MySQL
- [ ] Backend subscribes to Redis `detections` channel
- [ ] Frontend shows toast alerts on WebSocket events

### Phase 2 — GPU acceleration
- [ ] Add NVIDIA GPU (RTX 3080 minimum for 16 cameras)
- [ ] Install CUDA 12.x + cuDNN
- [ ] Switch to YOLOv8s with `device='cuda'`
- [ ] Enable TensorRT export: `model.export(format='engine', device=0)`
- [ ] Add Triton Inference Server for frame batching

### Phase 3 — Distributed (64+ cameras)
- [ ] Replace Redis Pub/Sub with Kafka (persistent, replayable)
- [ ] Add GPU worker pool with Kubernetes autoscaling
- [ ] Add Coral TPU per camera pod for Layer 1 motion + person detection
- [ ] Switch detection storage to ClickHouse (columnar, better for time-series queries)

---

## Hardware Reference

| Setup | Cameras | Hardware | Cost (approx) |
|---|---|---|---|
| Dev / test | 1–4 | Any modern laptop/server (CPU) | $0 extra |
| Small office | 4–16 | Single server, 8-core CPU, 16 GB RAM | ~$500–1000 |
| Medium | 16–64 | CPU server + 1× NVIDIA A4000 (16 GB VRAM) | ~$2500 |
| Large | 64–256 | Kubernetes cluster + 4× A10G GPU nodes | ~$15k–30k |
| Edge | Per-site | Jetson Orin NX (16 GB) per 8 cameras | ~$500/node |

---

## Summary: Recommended Path for Drisyam

```
Now (Shinobi-based stack)
        │
        ▼  Phase 1 — Add sidecar detection worker (Option B)
   Keep Shinobi + add Python detection worker
   • YOLOv8n on CPU
   • Redis Pub/Sub events → Node.js backend
   • Frontend toast alerts + detection history page
        │
        ▼  Phase 2 — Migrate to Frigate (Option A, if replacing Shinobi)
   Frigate handles RTSP + recording + detection in one service
   • Built-in GPU acceleration
   • MQTT/webhook events → same Node.js consumer
   • Better timeline: Frigate tracks objects across clips
        │
        ▼  Phase 3 — Distributed GPU workers (100+ cameras)
   Kafka message queue
   GPU worker pool (Triton batching)
   ByteTrack for cross-camera person re-ID
   ClickHouse for detection analytics
```

**Bottom line**: the current Drisyam stack (Node.js + Redis + S3) is already well
positioned for AI integration. The detection worker is a **separate process** that
publishes events — the backend consumes them over Redis, exactly the same pattern
used today for recording sync. No major refactoring needed.
