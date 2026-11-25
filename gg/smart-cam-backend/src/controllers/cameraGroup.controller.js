const { v4: uuidv4 } = require('uuid');
const { spawn }    = require('node:child_process');
const asyncHandler = require('../middleware/asyncHandler');
const { CameraGroup, Camera, User } = require('../models');
const shinobiService = require('../services/shinobi.service');
const s3Service = require('../services/s3.service');
const logger = require('../config/logger');
const AppError = require('../utils/AppError');
const redis = require('../config/redis');
const { ffmpegThumbnailSemaphore } = require('../utils/semaphore');

/**
 * Safely call Shinobi — degrade gracefully if VMS is down
 */
async function tryShinobi(fn) {
  try { return await fn(); }
  catch (e) {
    logger.warn('Shinobi unavailable, skipping VMS call', { error: e.message });
    return null;
  }
}

/**
 * Build the RTSP path for a channel based on device type.
 * Hikvision:  /Streaming/Channels/101, 201 …
 * Dahua:      /cam/realmonitor?channel=1 …
 * Axis:       /axis-media/media.amp?camera=1 …
 * Generic:    /stream/1 …
 */
function buildRtspPath(channel, deviceType = 'hikvision') {
  switch ((deviceType || '').toLowerCase()) {
    case 'dahua':   return `/cam/realmonitor?channel=${channel}&subtype=0`;
    case 'axis':    return `/axis-media/media.amp?camera=${channel}`;
    case 'generic': return `/stream/${channel}`;
    default:        return `/Streaming/Channels/${channel * 100 + 1}`; // hikvision
  }
}

/**
 * Sync camera statuses for a group from Shinobi.
 * Updates DB if status has changed. Graceful — no error if Shinobi is down.
 */
async function syncGroupStatus(user, group, cameras) {
  const shinobiMonitors = await tryShinobi(() =>
    shinobiService.getCameras(user.apiKey, user.groupKey)
  );
  if (!shinobiMonitors || !Array.isArray(shinobiMonitors)) return cameras;

  // Build a lookup: monitorId → shinobi mode
  const modeMap = {};
  shinobiMonitors.forEach((m) => { modeMap[m.mid] = m.mode; });

  // Update each camera status if it differs
  let groupOnline = false;
  for (const cam of cameras) {
    const shinobiMode = modeMap[cam.monitorId];
    const newStatus = (shinobiMode === 'start' || shinobiMode === 'record') ? 'online' : 'offline';
    if (cam.status !== newStatus) {
      await cam.update({ status: newStatus });
      cam.status = newStatus;
    }
    if (newStatus === 'online') groupOnline = true;
  }

  // Update the group status
  const newGroupStatus = groupOnline ? 'online' : 'offline';
  if (group.status !== newGroupStatus) {
    await group.update({ status: newGroupStatus });
    group.status = newGroupStatus;
  }

  return cameras;
}

// ─────────────────────────────────────────────
// GET /api/groups
// List all camera groups — syncs live status from Shinobi
// ─────────────────────────────────────────────
const listGroups = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.id);

  const groups = await CameraGroup.findAll({
    where: { userId: req.user.id },
    include: [{ model: Camera, as: 'cameras' }],
    order: [['name', 'ASC']],
  });

  // Sync status from Shinobi (single call, maps all monitors at once)
  if (groups.length > 0 && user.apiKey && user.groupKey) {
    const shinobiMonitors = await tryShinobi(() =>
      shinobiService.getCameras(user.apiKey, user.groupKey)
    );

    if (shinobiMonitors && Array.isArray(shinobiMonitors)) {
      const modeMap = {};
      shinobiMonitors.forEach((m) => { modeMap[m.mid] = m.mode; });

      for (const group of groups) {
        let groupOnline = false;
        for (const cam of group.cameras) {
          const mode = modeMap[cam.monitorId];
          const newStatus = (mode === 'start' || mode === 'record') ? 'online' : 'offline';
          if (cam.status !== newStatus) {
            await cam.update({ status: newStatus });
            cam.status = newStatus;
          }
          if (newStatus === 'online') groupOnline = true;
        }
        const newGroupStatus = groupOnline ? 'online' : 'offline';
        if (group.status !== newGroupStatus) {
          await group.update({ status: newGroupStatus });
          group.status = newGroupStatus;
        }
      }
    }
  }

  res.json({ success: true, data: groups });
});

// ─────────────────────────────────────────────
// GET /api/groups/:groupId
// Get a single group — syncs live status from Shinobi
// ─────────────────────────────────────────────
const getGroup = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.id);
  const group = await CameraGroup.findOne({
    where: { id: req.params.groupId, userId: req.user.id },
    include: [{ model: Camera, as: 'cameras' }],
  });

  if (!group) throw new AppError('Camera group not found.', 404);

  // Sync status from Shinobi
  if (user.apiKey && user.groupKey) {
    await syncGroupStatus(user, group, group.cameras);
  }

  res.json({ success: true, data: group });
});

// ─────────────────────────────────────────────
// POST /api/groups
// Create a new group (parent IP device) and
// auto-provision N camera channels inside it.
//
// Body:
// {
//   name: "Office 13",
//   host: "103.61.254.67",
//   port: 554,
//   username: "admin",
//   password: "pass",
//   totalChannels: 9,          ← how many cameras on this IP
//   deviceType: "hikvision",
//   location: "3rd Floor, Block B"
// }
// ─────────────────────────────────────────────
const createGroup = asyncHandler(async (req, res) => {
  const {
    name, host, port = 554, httpPort = 80,
    username, password,
    totalChannels = 1,
    deviceType = 'hikvision',
    location,
  } = req.body;

  if (!name || !host) throw new AppError('name and host are required.', 400);
  if (totalChannels < 1 || totalChannels > 64) {
    throw new AppError('totalChannels must be between 1 and 64.', 400);
  }

  // Fetch user for Shinobi keys
  const user = await User.findByPk(req.user.id);

  // S3 folder: recordings/{userId}/{safe-group-name}/
  const safeGroupName = name.toLowerCase().replace(/\s+/g, '-');
  const s3Folder = `recordings/${user.id}/${safeGroupName}`;

  // Create the group
  const group = await CameraGroup.create({
    userId: user.id,
    name,
    host,
    port,
    httpPort,
    username,
    password,
    deviceType,
    totalChannels,
    location,
    s3Folder,
    status: 'unknown',
  });

  // Build camera configs for all channels upfront
  const channelConfigs = Array.from({ length: totalChannels }, (_, i) => {
    const ch = i + 1;
    const monitorId = uuidv4().replace(/-/g, '').slice(0, 24);
    const cameraName = `${name} - Camera ${String(ch).padStart(2, '0')}`;
    const rtspPath = buildRtspPath(ch, deviceType);
    const s3Path = `${s3Folder}/${cameraName.toLowerCase().replace(/\s+/g, '-')}`;
    return { ch, monitorId, cameraName, rtspPath, s3Path };
  });

  // Provision ALL channels in Shinobi: configure then start recording
  await Promise.all(channelConfigs.map(async ({ monitorId, cameraName, rtspPath }) => {
    const ok = await tryShinobi(() =>
      shinobiService.addCamera(user.apiKey, user.groupKey, monitorId, {
        name: cameraName,
        host, port, path: rtspPath,
        username, password,
        type: 'h264',
        width: 1920, height: 1080, fps: 25,
        groupKey: user.groupKey,
      })
    );
    if (ok) {
      // Small delay so Shinobi registers the config before we start
      await new Promise((r) => setTimeout(r, 1500));
      await tryShinobi(() =>
        shinobiService.startMonitor(user.apiKey, user.groupKey, monitorId)
      );
    }
  }));

  // Create all camera DB records in parallel
  const cameras = await Promise.all(channelConfigs.map(({ ch, monitorId, cameraName, rtspPath, s3Path }) =>
    Camera.create({
      userId: user.id,
      groupId: group.id,
      monitorId,
      name: cameraName,
      host,
      port,
      path: rtspPath,
      username,
      password,
      channel: ch,
      type: 'h264',
      width: 1920,
      height: 1080,
      fps: 25,
      s3Path,
      status: 'offline',
    })
  ));

  logger.info('CameraGroup created', { groupId: group.id, name, totalChannels });

  res.status(201).json({
    success: true,
    data: { ...group.toJSON(), cameras },
  });
});

// ─────────────────────────────────────────────
// PUT /api/groups/:groupId
// Update group metadata AND optionally add more camera channels.
// If totalChannels increases, new cameras are auto-provisioned.
// ─────────────────────────────────────────────
const updateGroup = asyncHandler(async (req, res) => {
  const group = await CameraGroup.findOne({
    where: { id: req.params.groupId, userId: req.user.id },
    include: [{ model: Camera, as: 'cameras' }],
  });
  if (!group) throw new AppError('Camera group not found.', 404);

  const {
    name, location, status, latitude, longitude,
    host, port, httpPort, username, password, deviceType,
    totalChannels,
  } = req.body;

  // Validate totalChannels if provided — cannot reduce below existing cameras
  const existingCount = group.cameras ? group.cameras.length : 0;
  let newTotal = group.totalChannels;
  if (totalChannels !== undefined) {
    newTotal = parseInt(totalChannels);
    if (isNaN(newTotal) || newTotal < 1) {
      throw new AppError('totalChannels must be at least 1.', 400);
    }
    if (newTotal < existingCount) {
      throw new AppError(
        `totalChannels cannot be less than the number of provisioned cameras (${existingCount}). Delete cameras individually to reduce the count.`,
        400,
      );
    }
    if (newTotal > 64) {
      throw new AppError('totalChannels must not exceed 64.', 400);
    }
  }

  // Build update payload — only include fields that were explicitly sent
  const groupUpdates = {};
  if (name      !== undefined) groupUpdates.name       = name;
  if (location  !== undefined) groupUpdates.location   = location;
  if (status    !== undefined) groupUpdates.status     = status;
  if (latitude  !== undefined) groupUpdates.latitude   = latitude;
  if (longitude !== undefined) groupUpdates.longitude  = longitude;
  if (host      !== undefined) groupUpdates.host       = host;
  if (port      !== undefined) groupUpdates.port       = parseInt(port) || group.port;
  if (httpPort  !== undefined) groupUpdates.httpPort   = parseInt(httpPort) || group.httpPort;
  if (username  !== undefined) groupUpdates.username   = username;
  if (password  !== undefined && String(password).trim()) groupUpdates.password = password;
  if (deviceType !== undefined) groupUpdates.deviceType = deviceType;
  if (totalChannels !== undefined) groupUpdates.totalChannels = newTotal;

  await group.update(groupUpdates);

  // Effective values after update (fall back to existing group values)
  const eHost       = groupUpdates.host       || group.host;
  const ePort       = groupUpdates.port       || group.port;
  const eUsername   = groupUpdates.username   || group.username;
  const ePassword   = groupUpdates.password   || group.password;
  const eDeviceType = groupUpdates.deviceType || group.deviceType;
  const eName       = groupUpdates.name       || group.name;

  // If connection details changed, update existing cameras too (in parallel)
  const connectionChanged = host !== undefined || port !== undefined ||
    username !== undefined || password !== undefined;
  if (connectionChanged && group.cameras.length > 0) {
    const camUpdates = {};
    if (host     !== undefined) camUpdates.host     = eHost;
    if (port     !== undefined) camUpdates.port     = ePort;
    if (username !== undefined) camUpdates.username = eUsername;
    if (password !== undefined && String(password).trim()) camUpdates.password = ePassword;

    await Promise.all(group.cameras.map((cam) => cam.update(camUpdates)));
  }

  // Provision new cameras if totalChannels increased
  if (newTotal > existingCount) {
    const user = await User.findByPk(req.user.id);

    // Find the highest channel number already in use so we don't duplicate
    const usedChannels = (group.cameras || []).map(c => c.channel || 0);
    const maxChannel   = usedChannels.length > 0 ? Math.max(...usedChannels) : 0;

    const newChannelConfigs = Array.from({ length: newTotal - maxChannel }, (_, i) => {
      const ch = maxChannel + i + 1;
      const monitorId  = uuidv4().replace(/-/g, '').slice(0, 24);
      const cameraName = `${eName} - Camera ${String(ch).padStart(2, '0')}`;
      const rtspPath   = buildRtspPath(ch, eDeviceType);
      const s3Path     = `${group.s3Folder}/${cameraName.toLowerCase().replace(/\s+/g, '-')}`;
      return { ch, monitorId, cameraName, rtspPath, s3Path };
    });

    // Provision all new channels in Shinobi: configure then start recording
    await Promise.all(newChannelConfigs.map(async ({ monitorId, cameraName, rtspPath }) => {
      const ok = await tryShinobi(() =>
        shinobiService.addCamera(user.apiKey, user.groupKey, monitorId, {
          name:     cameraName,
          host:     eHost,
          port:     ePort,
          path:     rtspPath,
          username: eUsername,
          password: ePassword,
          type:     'h264',
          width: 1920, height: 1080, fps: 25,
          groupKey: user.groupKey,
        })
      );
      if (ok) {
        await new Promise((r) => setTimeout(r, 1500));
        await tryShinobi(() =>
          shinobiService.startMonitor(user.apiKey, user.groupKey, monitorId)
        );
      }
    }));

    // Create all camera DB records in parallel
    await Promise.all(newChannelConfigs.map(({ ch, monitorId, cameraName, rtspPath, s3Path }) =>
      Camera.create({
        userId:    user.id,
        groupId:   group.id,
        monitorId,
        name:      cameraName,
        host:      eHost,
        port:      ePort,
        path:      rtspPath,
        username:  eUsername,
        password:  ePassword,
        channel:   ch,
        type:      'h264',
        width:     1920,
        height:    1080,
        fps:       25,
        s3Path,
        status:    'offline',
      })
    ));

    logger.info('Added camera channels', { groupId: group.id, added: newTotal - existingCount, newTotal });
  }

  // Return the fully updated group with all cameras (ordered by channel)
  const updatedGroup = await CameraGroup.findOne({
    where: { id: group.id },
    include: [{ model: Camera, as: 'cameras' }],
    order: [[{ model: Camera, as: 'cameras' }, 'channel', 'ASC']],
  });

  res.json({ success: true, data: updatedGroup });
});

// ─────────────────────────────────────────────
// POST /api/groups/:groupId/sync
// Force-sync all camera statuses from Shinobi
// Frontend can call this any time user clicks "Refresh"
// ─────────────────────────────────────────────
const syncGroup = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.id);
  const group = await CameraGroup.findOne({
    where: { id: req.params.groupId, userId: req.user.id },
    include: [{ model: Camera, as: 'cameras' }],
  });
  if (!group) throw new AppError('Camera group not found.', 404);

  const cameras = await syncGroupStatus(user, group, group.cameras);

  res.json({
    success: true,
    data: {
      groupStatus: group.status,
      cameras: cameras.map(c => ({ id: c.id, monitorId: c.monitorId, name: c.name, status: c.status })),
    },
  });
});

// ─────────────────────────────────────────────
// DELETE /api/groups/:groupId
// Delete group + all its cameras from DB + Shinobi
// ─────────────────────────────────────────────
const deleteGroup = asyncHandler(async (req, res) => {
  const group = await CameraGroup.findOne({
    where: { id: req.params.groupId, userId: req.user.id },
    include: [{ model: Camera, as: 'cameras' }],
  });
  if (!group) throw new AppError('Camera group not found.', 404);

  const user = await User.findByPk(req.user.id);

  // Remove all cameras from Shinobi in parallel
  await Promise.all(group.cameras.map((cam) =>
    tryShinobi(() => shinobiService.deleteCamera(user.apiKey, user.groupKey, cam.monitorId))
  ));

  await group.destroy(); // cascades to cameras via DB

  logger.info('CameraGroup deleted', { groupId: group.id });
  res.json({ success: true, message: 'Camera group and all cameras deleted.' });
});

// ─────────────────────────────────────────────
// GET /api/groups/:groupId/recordings
// List S3 recordings for every camera in this group with pagination.
//
// Query params:
//   ?date=2026-02-16     (optional) filter by specific date
//   ?page=1              (optional) page number, default 1
//   ?limit=50            (optional) items per page, default 50, max 200
//   ?camera=slug         (optional) filter by camera slug
//
// Returns:
//   { success, data: [...], total, page, limit, totalPages, cached }
// ─────────────────────────────────────────────
const getGroupRecordings = asyncHandler(async (req, res) => {
  const group = await CameraGroup.findOne({
    where: { id: req.params.groupId, userId: req.user.id },
  });
  if (!group) throw new AppError('Camera group not found.', 404);

  const { date, camera } = req.query;
  const page  = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));

  // Cache key includes date + camera filter so different filters get separate caches.
  // Cache TTL is 5 minutes — matches the sync interval, so fresh recordings appear
  // within one sync cycle without excessive cache misses.
  const cacheKey = `recordings:${req.user.id}:${group.name}:${date || 'all'}:${camera || 'all'}`;
  const cached = await redis.getJSON(cacheKey);

  let allRecordings;
  if (cached) {
    allRecordings = cached;
  } else {
    // Fetch from S3, filter by date/camera, cache the full filtered list
    let recs = await s3Service.listGroupRecordings(req.user.id, group.name, date || null);
    if (camera) {
      recs = recs.filter((r) => r.cameraName === camera);
    }
    allRecordings = recs;
    redis.setJSON(cacheKey, allRecordings, redis.RECORDINGS_TTL);
  }

  // Paginate in-memory (fast; recordings are already sorted by S3 key = date+time)
  const total      = allRecordings.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start      = (page - 1) * limit;
  const end        = start + limit;
  const data       = allRecordings.slice(start, end);

  res.json({
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
    cached: !!cached,
  });
});

// ─────────────────────────────────────────────
// GET /api/groups/:groupId/cameras/:monitorId/recordings
// List S3 recordings for a single camera
// Query: ?date=2026-02-16  (optional)
// ─────────────────────────────────────────────
const getCameraRecordings = asyncHandler(async (req, res) => {
  const group = await CameraGroup.findOne({
    where: { id: req.params.groupId, userId: req.user.id },
  });
  if (!group) throw new AppError('Camera group not found.', 404);

  const camera = await Camera.findOne({
    where: { monitorId: req.params.monitorId, userId: req.user.id, groupId: group.id },
  });
  if (!camera) throw new AppError('Camera not found.', 404);

  const { date } = req.query;
  const recordings = await s3Service.listRecordings(
    req.user.id, group.name, camera.name, date || null
  );

  res.json({ success: true, data: recordings });
});

// ─────────────────────────────────────────────
// GET /api/groups/:groupId/recordings/play?key=...
// Generate a fresh playback URL on demand (7-day expiry — effectively never
// expires during normal use). Called per-video when the user clicks play.
// ─────────────────────────────────────────────
const getRecordingPlayUrl = asyncHandler(async (req, res) => {
  const { key } = req.query;
  if (!key) throw new AppError('key query parameter is required.', 400);

  const expectedPrefix = `recordings/${req.user.id}/`;
  if (!key.startsWith(expectedPrefix)) {
    throw new AppError('Access denied to this recording.', 403);
  }

  // 7 days — max S3 SigV4 presigned URL lifetime
  const playbackUrl = await s3Service.getPlaybackUrl(key, 604800);
  res.json({ success: true, playbackUrl });
});


// ─────────────────────────────────────────────
// GET /api/groups/:groupId/recordings/thumbnail?key=...
// Extract the first video frame as a JPEG thumbnail.
// FFmpeg uses the S3 presigned URL directly (HTTP Range requests) so it only
// fetches the portion of the file it needs. Response is cached 24 h.
// ─────────────────────────────────────────────
const getThumbnailForRecording = asyncHandler(async (req, res) => {
  const { key } = req.query;
  if (!key) throw new AppError('key query parameter is required.', 400);

  const expectedPrefix = `recordings/${req.user.id}/`;
  if (!key.startsWith(expectedPrefix)) {
    throw new AppError('Access denied.', 403);
  }

  const cacheKey = `thumbnail:v1:${key}`;

  // ── 1. Redis cache hit ───────────────────────────────────────────────────
  const cached = await redis.getBuffer(cacheKey);
  if (cached) {
    res.writeHead(200, {
      'Content-Type':                 'image/jpeg',
      'Content-Length':               cached.length,
      'Cache-Control':                'public, max-age=86400',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'X-Cache':                      'HIT',
    });
    res.end(cached);
    return;
  }

  // ── 2. Semaphore: cap concurrent FFmpeg processes ────────────────────────
  // Prevents a burst of 50+ clip thumbnails from spawning 50 FFmpeg processes.
  await ffmpegThumbnailSemaphore.acquire();

  let clientGone = false;
  req.on('close', () => { clientGone = true; });

  try {
    // ── 3. Generate via FFmpeg ─────────────────────────────────────────────
    // Presigned URL lets FFmpeg use HTTP Range requests to seek to the moov
    // atom and first frame without downloading the whole file.
    const presignedUrl = await s3Service.getPlaybackUrl(key, 300);

    const ff = spawn('ffmpeg', [
      '-loglevel', 'error',
      '-i', presignedUrl,   // HTTP input — FFmpeg Range-seeks for moov atom
      '-vframes', '1',      // extract exactly one frame
      '-q:v', '4',          // JPEG quality (2 = best, 31 = worst; 4 is crisp)
      '-f', 'image2pipe',
      '-vcodec', 'mjpeg',
      'pipe:1',
    ]);

    req.on('close', () => ff.kill('SIGKILL'));

    // Collect stdout into a buffer (thumbnails are small: 15–60 KB)
    const chunks = [];
    ff.stdout.on('data', (chunk) => chunks.push(chunk));

    let ffStderr = '';
    ff.stderr.on('data', (chunk) => { ffStderr += chunk; });

    await new Promise((resolve, reject) => {
      ff.on('close', (code) => {
        if (code !== 0) {
          logger.error('thumbnail: ffmpeg exited non-zero', { key, code, stderr: ffStderr.slice(-300) });
          reject(new Error(`ffmpeg exited ${code}`));
        } else {
          resolve();
        }
      });
      ff.on('error', reject);
    });

    if (clientGone) return; // client disconnected while ffmpeg was running

    const jpeg = Buffer.concat(chunks);
    if (jpeg.length === 0) throw new Error('ffmpeg produced empty output');

    // ── 4. Store in Redis (fire-and-forget, 7-day TTL) ─────────────────────
    redis.setBuffer(cacheKey, jpeg, redis.THUMB_TTL);

    // ── 5. Send response ───────────────────────────────────────────────────
    res.writeHead(200, {
      'Content-Type':                 'image/jpeg',
      'Content-Length':               jpeg.length,
      'Cache-Control':                'public, max-age=86400',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'X-Cache':                      'MISS',
    });
    res.end(jpeg);

  } finally {
    ffmpegThumbnailSemaphore.release();
  }
});

// ─────────────────────────────────────────────
// GET /api/groups/:groupId/recordings/stream?key=...
// Proxy S3 recording bytes to the browser with full Range (seeking) support.
// Avoids S3 CORS issues and lets <video> seek without a presigned URL.
// Auth token accepted via ?token= query param (can't use headers on <video>).
// ─────────────────────────────────────────────
const streamRecording = asyncHandler(async (req, res) => {
  const { key } = req.query;
  if (!key) throw new AppError('key query parameter is required.', 400);

  const expectedPrefix = `recordings/${req.user.id}/`;
  if (!key.startsWith(expectedPrefix)) {
    throw new AppError('Access denied to this recording.', 403);
  }

  const range = req.headers.range || null;
  const { stream, contentLength, contentType, contentRange, statusCode } =
    await s3Service.getReadStream(key, range);

  const headers = {
    'Content-Type':                 contentType || 'video/mp4',
    'Accept-Ranges':                'bytes',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'Cache-Control':                'no-store',
  };
  if (range && contentRange) headers['Content-Range'] = contentRange;
  if (contentLength)          headers['Content-Length'] = contentLength;

  res.writeHead(statusCode, headers);
  stream.pipe(res);

  req.on('close', () => { try { stream.destroy(); } catch (_) {} });
});

// ─────────────────────────────────────────────
// GET /api/groups/:groupId/recordings/download?key=...
// Generate a forced-download signed URL for a specific S3 recording key.
// The key must belong to the requesting user (verified by prefix check).
// ─────────────────────────────────────────────
const getRecordingDownloadUrl = asyncHandler(async (req, res) => {
  const { key } = req.query;
  if (!key) throw new AppError('key query parameter is required.', 400);

  // Security: key must start with recordings/{userId}/
  const expectedPrefix = `recordings/${req.user.id}/`;
  if (!key.startsWith(expectedPrefix)) {
    throw new AppError('Access denied to this recording.', 403);
  }

  const filename = key.split('/').pop();
  const downloadUrl = await s3Service.getDownloadUrl(key, filename, 86400); // 24h

  res.json({ success: true, downloadUrl, filename });
});

// ─────────────────────────────────────────────
// POST /api/groups/:groupId/reconfigure
// Re-sends configureMonitor to Shinobi for every camera in the group.
// Use this after changing FFmpeg settings in shinobi.service.js so
// existing cameras pick up the new config without deleting/re-adding them.
// ─────────────────────────────────────────────
const reconfigureGroup = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.id);
  const group = await CameraGroup.findOne({
    where: { id: req.params.groupId, userId: req.user.id },
    include: [{ model: Camera, as: 'cameras' }],
  });
  if (!group) throw new AppError('Camera group not found.', 404);

  const results = [];
  for (const cam of group.cameras) {
    // Step 1: Push new config to Shinobi (configureMonitor)
    const configured = await tryShinobi(() =>
      shinobiService.addCamera(user.apiKey, user.groupKey, cam.monitorId, {
        name: cam.name,
        host: cam.host,
        port: cam.port,
        path: cam.path,
        username: cam.username,
        password: cam.password,
        type: cam.type || 'h264',
        width: cam.width || 1920,
        height: cam.height || 1080,
        fps: cam.fps || 25,
        groupKey: user.groupKey,
      })
    );

    // Step 2: Start camera in RECORD mode (not /start — that's HLS-only with no recording)
    // Small delay to let Shinobi register the config update before starting
    if (configured) {
      await new Promise((r) => setTimeout(r, 1500));
      await tryShinobi(() =>
        shinobiService.startMonitor(user.apiKey, user.groupKey, cam.monitorId)
      );
    }

    results.push({ monitorId: cam.monitorId, name: cam.name, ok: !!configured });
  }

  const succeeded = results.filter(r => r.ok).length;
  logger.info('reconfigureGroup completed', { groupId: group.id, succeeded, total: results.length });

  res.json({
    success: true,
    message: `Re-configured ${succeeded}/${results.length} cameras with new FFmpeg settings.`,
    cameras: results,
  });
});

// ─────────────────────────────────────────────
// DELETE /api/groups/:groupId/cameras/:monitorId
// Remove a single camera channel from a group.
// Deletes from Shinobi + local DB and decrements totalChannels.
// Used when a user added a channel that doesn't physically exist on the device.
// ─────────────────────────────────────────────
const deleteCameraFromGroup = asyncHandler(async (req, res) => {
  const { groupId, monitorId } = req.params;

  // Verify the camera belongs to this group and user
  const camera = await Camera.findOne({
    where: { monitorId, groupId, userId: req.user.id },
  });
  if (!camera) throw new AppError('Camera not found in this group.', 404);

  // Verify the group belongs to user
  const group = await CameraGroup.findOne({
    where: { id: groupId, userId: req.user.id },
  });
  if (!group) throw new AppError('Group not found.', 404);

  // Remove from Shinobi VMS (non-blocking — if VMS is down, still remove locally)
  const user = await User.findByPk(req.user.id);
  await tryShinobi(() =>
    shinobiService.deleteCamera(user.apiKey, user.groupKey, monitorId)
  );

  // Remove from local DB
  await camera.destroy();

  // Decrement totalChannels on the group to keep it in sync
  const newTotal = Math.max(0, (group.totalChannels || 1) - 1);
  await group.update({ totalChannels: newTotal });

  logger.info('Camera removed from group', { groupId, monitorId, newTotal });

  res.json({ success: true, message: 'Camera channel removed successfully.', totalChannels: newTotal });
});


module.exports = {
  listGroups,
  getGroup,
  createGroup,
  updateGroup,
  deleteGroup,
  syncGroup,
  reconfigureGroup,
  deleteCameraFromGroup,
  getGroupRecordings,
  getCameraRecordings,
  getRecordingPlayUrl,
  streamRecording,
  getThumbnailForRecording,
  getRecordingDownloadUrl,
};
