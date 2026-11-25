/**
 * recordingSync.service.js
 *
 * Two independent background loops:
 *
 *  1. S3 Sync  — every 5 minutes
 *     Downloads new MP4 recordings from Shinobi local disk → uploads to 10PB S3.
 *
 *  2. Monitor Watchdog  — every 30 seconds (BALANCED SPEED)
 *     Checks every camera monitor's running state in Shinobi.
 *     If a monitor is not running (stream crashed, camera rebooted, RTSP drop),
 *     it is restarted automatically — with a 45-second per-camera cooldown to
 *     prevent restart storms. This ensures continuous 24/7 recording with fast
 *     recovery without hammering the Shinobi API.
 */

const { Op } = require('sequelize');
const axios          = require('axios');
const config         = require('../config/env');
const logger         = require('../config/logger');
const s3Service      = require('./s3.service');
const shinobiService = require('./shinobi.service');

// Lazy-loaded to avoid circular dependency with models
let User, Camera, CameraGroup;
const loadModels = () => {
  if (!User) {
    ({ User, Camera, CameraGroup } = require('../models'));
  }
};

// ── Constants ──────────────────────────────────────────────────────────────────

const SHINOBI_BASE         = config.shinobi.url;
const SYNC_INTERVAL_MS     = 5 * 60 * 1000;  // S3 sync: every 5 minutes
const WATCHDOG_INTERVAL_MS = 2 * 60 * 1000;  // Monitor watchdog: every 2 minutes (reduced from 30s to prevent Shinobi overload with 27 cameras)
const MIN_AGE_MS           = 2 * 60 * 1000;  // Skip recordings < 2 min old (still writing)
const RESTART_COOLDOWN_MS  = 45 * 1000;      // Min 45 seconds between restarts per camera (BALANCED - 4x faster than original)

// ── Per-process state ──────────────────────────────────────────────────────────

let _syncTimer     = null;
let _watchdogTimer = null;
let _syncRunning   = false;
let _watchdogRunning = false;

// S3 key cache — prevents re-downloading recordings already in S3 during
// this process lifetime (guards against eventual-consistency false-negatives)
const _uploaded = new Set();

// Per-camera restart timestamps — prevent watchdog from restarting too often
// Map<monitorId: string, lastRestartMs: number>
const _lastRestart = new Map();

// ─────────────────────────────────────────────────────────────────────────────
// S3 SYNC — download from Shinobi, upload to 10PB
// ───────────           
async function syncCamera(user, group, camera) {
  const recordings = await getShinobiRecordings(user.apiKey, user.groupKey, camera.monitorId);
  if (!recordings.length) return;

  const now = Date.now();

  for (const rec of recordings) {
    try {
      const filename = rec.filename || rec.href?.split('/').pop();
      if (!filename) continue;

      // Parse recording end time; skip if < 2 min old (Shinobi still writing)
      const endTime = rec.end ? new Date(rec.end).getTime()
                    : rec.time ? new Date(rec.time).getTime() + 900000
                    : 0;
      if (endTime && (now - endTime) < MIN_AGE_MS) continue;

      // Extract date from filename so the S3 key is stable regardless of when sync runs
      const dateMatch = filename.match(/^(\d{4}-\d{2}-\d{2})/);
      const recDate   = dateMatch ? dateMatch[1] : new Date().toISOString().slice(0, 10);

      const safeGroup  = group.name.toLowerCase().replace(/\s+/g, '-');
      const safeCamera = camera.name.toLowerCase().replace(/\s+/g, '-');
      const s3Key = `recordings/${user.id}/${safeGroup}/${safeCamera}/${recDate}/${filename}`;

      if (_uploaded.has(s3Key)) continue;

      const alreadyUploaded = await s3Service.exists(s3Key);
      if (alreadyUploaded) { _uploaded.add(s3Key); continue; }

      logger.info('recordingSync: downloading', { filename, camera: camera.name });
      const buffer = await downloadFromShinobi(user.apiKey, user.groupKey, camera.monitorId, filename);

      // Guard: skip 0-byte buffers (Shinobi wrote an empty file on crash)
      if (!buffer || buffer.length === 0) {
        logger.warn('recordingSync: skipping 0-byte file', { filename });
        continue;
      }

      await s3Service.uploadRecording(user.id, group.name, camera.name, filename, buffer, 'video/mp4', recDate);
      _uploaded.add(s3Key);
      logger.info('recordingSync: uploaded to S3', { s3Key, bytes: buffer.length });
    } catch (err) {
      logger.warn('recordingSync: failed to upload recording', {
        camera: camera.name, error: err.message,
      });
    }
  }
}

async function runSync() {
  if (_syncRunning) {
    logger.debug('recordingSync: previous sync still active, skipping');
    return;
  }
  _syncRunning = true;
  logger.info('recordingSync: starting S3 sync pass');

  try {
    loadModels();
    const users = await User.findAll({
      where: { apiKey: { [Op.ne]: null }, isActive: true },
      attributes: ['id', 'apiKey', 'groupKey'],
    });

    for (const user of users) {
      if (!user.apiKey || !user.groupKey) continue;
      const groups = await CameraGroup.findAll({
        where: { userId: user.id },
        include: [{ model: Camera, as: 'cameras' }],
      });
      for (const group of groups) {
        for (const camera of group.cameras || []) {
          await syncCamera(user, group, camera);
        }
      }
    }
    logger.info('recordingSync: S3 sync pass complete');
  } catch (err) {
    logger.error('recordingSync: unexpected sync error', { error: err.message });
  } finally {
    _syncRunning = false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MONITOR WATCHDOG — auto-restart stopped/crashed monitors
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Watchdog logic for a single user.
 *
 * Shinobi returns each monitor with a `running` field:
 *   '1' (or 1) = currently streaming / recording
 *   '0' (or 0) = process is not running
 *
 * And a `mode` field:
 *   'record' = should be recording  ← this is what we configure
 *   'stop'   = deliberately stopped by admin → do NOT restart
 *   'start'  = HLS stream only (no recording)
 *
 * We restart a monitor only when:
 *   - mode is 'record' (means it SHOULD be running)
 *   - running is not '1' (means it ISN'T running)
 *   - cooldown has expired (≥ 3 min since last restart of this monitor)
 */
async function watchdogUser(user) {
  let monitors;
  try {
    monitors = await shinobiService.getCameras(user.apiKey, user.groupKey);
  } catch (err) {
    // Shinobi unreachable — silently skip (will retry next cycle)
    logger.debug('watchdog: Shinobi unreachable for user', { userId: user.id, error: err.message });
    return;
  }

  if (!Array.isArray(monitors) || monitors.length === 0) return;

  // Build a quick-lookup map: monitorId → monitor object
  const monitorMap = new Map(monitors.map((m) => [m.mid, m]));

  const groups = await CameraGroup.findAll({
    where: { userId: user.id },
    include: [{ model: Camera, as: 'cameras' }],
  });

  // RATE LIMITING: Only restart max 5 cameras per cycle to prevent Shinobi overload
  let restartsThisCycle = 0;
  const MAX_RESTARTS_PER_CYCLE = 5;

  for (const group of groups) {
    for (const camera of (group.cameras || [])) {
      // Stop if we've already restarted 5 cameras this cycle
      if (restartsThisCycle >= MAX_RESTARTS_PER_CYCLE) {
        logger.debug('watchdog: restart limit reached for this cycle', {
          restarted: restartsThisCycle,
          limit: MAX_RESTARTS_PER_CYCLE,
        });
        return;
      }

      const monitor = monitorMap.get(camera.monitorId);

      if (!monitor) {
        // Monitor not found in Shinobi — it may have been lost after a Shinobi restart.
        // Log but don't try to push config here — let the next pushRecordingConfig handle it.
        logger.warn('watchdog: monitor not found in Shinobi (will re-register on next boot)', {
          camera: camera.name, monitorId: camera.monitorId,
        });
        continue;
      }

      const mode = monitor.mode;  // 'record' | 'stop' | 'start'

      // Shinobi running field: '1'/1/true = explicitly running; '0'/0/false = explicitly stopped;
      // null/undefined = Shinobi can't determine state (common in some Shinobi versions).
      const isExplicitlyRunning = monitor.running === '1' || monitor.running === 1 || monitor.running === true;
      const isExplicitlyStopped = monitor.running === '0' || monitor.running === 0 || monitor.running === false;
      const unknownState        = !isExplicitlyRunning && !isExplicitlyStopped; // null/undefined

      // Skip cameras that are admin-disabled
      if (mode === 'stop') continue;

      // Skip cameras that Shinobi reports as explicitly running in record mode (healthy)
      if (isExplicitlyRunning && mode === 'record') continue;

      // Determine effective cooldown:
      // - Camera in wrong mode (mode=start) or explicitly stopped → use standard 45s cooldown
      // - Camera in record mode but unknown running state → use long 15-min cooldown to avoid
      //   restarting cameras that Shinobi simply can't report the running state for (a common
      //   Shinobi API quirk) which would otherwise cause continuous disruptive restarts.
      const needsImmediateAction = isExplicitlyStopped || mode === 'start';
      const effectiveCooldown    = needsImmediateAction ? RESTART_COOLDOWN_MS : 15 * 60 * 1000;

      const lastRestart = _lastRestart.get(camera.monitorId) || 0;
      const now = Date.now();
      const elapsed = now - lastRestart;

      if (elapsed < effectiveCooldown) {
        logger.debug('watchdog: camera cooldown active', {
          camera: camera.name,
          monitorId: camera.monitorId,
          cooldownRemainsSeconds: Math.ceil((effectiveCooldown - elapsed) / 1000),
          reason: unknownState ? 'unknown-running-state' : 'cooldown',
        });
        continue;
      }

      // Restart the monitor in record mode
      const reason = mode === 'start' ? 'wrong-mode(start→record)'
                   : isExplicitlyStopped ? 'explicitly-stopped'
                   : 'periodic-safety-check';
      logger.warn('watchdog: restarting monitor', {
        camera:    camera.name,
        monitorId: camera.monitorId,
        group:     group.name,
        mode,
        running:   monitor.running,
        reason,
      });

      _lastRestart.set(camera.monitorId, now);

      try {
        await shinobiService.startMonitor(user.apiKey, user.groupKey, camera.monitorId);
        restartsThisCycle++;
        logger.info('watchdog: monitor restarted successfully', {
          camera: camera.name, monitorId: camera.monitorId, restartsThisCycle,
        });

        // Add 2-second delay between restarts to prevent Shinobi overload
        if (restartsThisCycle < MAX_RESTARTS_PER_CYCLE) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (err) {
        logger.error('watchdog: failed to restart monitor', {
          camera: camera.name, monitorId: camera.monitorId, error: err.message,
        });
      }
    }
  }

  if (restartsThisCycle > 0) {
    logger.info('watchdog: cycle complete', {
      restarted: restartsThisCycle,
      userId: user.id,
    });
  }
}

async function runWatchdog() {
  if (_watchdogRunning) return; // previous check still in progress — skip
  _watchdogRunning = true;

  try {
    loadModels();
    const users = await User.findAll({
      where: { apiKey: { [Op.ne]: null }, isActive: true },
      attributes: ['id', 'apiKey', 'groupKey'],
    });

    for (const user of users) {
      if (!user.apiKey || !user.groupKey) continue;
      await watchdogUser(user);
    }
  } catch (err) {
    logger.error('watchdog: unexpected error', { error: err.message });
  } finally {
    _watchdogRunning = false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG PUSH — run once on boot to ensure all cameras are recording
// ─────────────────────────────────────────────────────────────────────────────

async function pushRecordingConfig() {
  logger.info('recordingSync: pushing recording config to all cameras in Shinobi…');
  loadModels();

  try {
    const users = await User.findAll({
      where: { apiKey: { [Op.ne]: null }, isActive: true },
      attributes: ['id', 'apiKey', 'groupKey'],
    });

    let pushed = 0;
    let failed = 0;

    for (const user of users) {
      if (!user.apiKey || !user.groupKey) continue;

      const groups = await CameraGroup.findAll({
        where: { userId: user.id },
        include: [{ model: Camera, as: 'cameras' }],
      });

      for (const group of groups) {
        for (const camera of (group.cameras || [])) {
          try {
            await shinobiService.stopMonitor(user.apiKey, user.groupKey, camera.monitorId);
            await shinobiService.addCamera(
              user.apiKey,
              user.groupKey,
              camera.monitorId,
              {
                name:     camera.name,
                host:     camera.host,
                port:     camera.port,
                path:     camera.path,
                username: camera.username,
                password: camera.password,
                type:     camera.type     || 'h264',
                width:    camera.width    || 1920,
                height:   camera.height   || 1080,
                fps:      camera.fps      || 25,
                groupKey: user.groupKey,
              }
            );
            // Start in RECORD mode after config push (not /start — that's HLS-only, no MP4 files)
            await new Promise((r) => setTimeout(r, 1500));
            await shinobiService.startMonitor(user.apiKey, user.groupKey, camera.monitorId);
            pushed++;
          } catch (e) {
            failed++;
            logger.warn('recordingSync: failed to push config to camera', {
              camera: camera.name, error: e.message,
            });
          }
        }
      }
    }

    logger.info(`recordingSync: config push complete — ${pushed} updated, ${failed} failed`);
  } catch (err) {
    logger.error('recordingSync: pushRecordingConfig error', { error: err.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// START / STOP
// ─────────────────────────────────────────────────────────────────────────────

function start() {
  if (_syncTimer || _watchdogTimer) return; // already started

  logger.info('recordingSync: service starting', {
    syncIntervalMin:      SYNC_INTERVAL_MS / 60000,
    watchdogIntervalSec:  WATCHDOG_INTERVAL_MS / 1000,
    restartCooldownSec:   RESTART_COOLDOWN_MS / 1000,
    maxRestartsPerCycle:  5,
  });

  // Boot sequence — staggered to avoid thundering herd on startup:
  //   DISABLED: pushRecordingConfig (was overwhelming Shinobi with 42 cameras)
  //   t+30s : first S3 sync run
  //   t+60s : first watchdog run (gradual restart - 5 cameras per 2-min cycle)

  // setTimeout(pushRecordingConfig, 10000); // DISABLED - use gradual watchdog instead

  setTimeout(() => {
    runSync();
    _syncTimer = setInterval(runSync, SYNC_INTERVAL_MS);
  }, 30000);

  setTimeout(() => {
    runWatchdog();
    _watchdogTimer = setInterval(runWatchdog, WATCHDOG_INTERVAL_MS);
  }, 60000);  // Start watchdog at t+60s instead of t+90s
}

function stop() {
  if (_syncTimer)     { clearInterval(_syncTimer);     _syncTimer     = null; }
  if (_watchdogTimer) { clearInterval(_watchdogTimer); _watchdogTimer = null; }
  logger.info('recordingSync: service stopped');
}

module.exports = { start, stop, runSync, runWatchdog, pushRecordingConfig };
