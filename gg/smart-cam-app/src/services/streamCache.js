/**
 * streamCache — persistent HLS stream manager
 *
 * Keeps HLS.js instances alive across component mounts/unmounts so that
 * switching between cameras does NOT restart the stream. Switching back to
 * a camera that was already opened reattaches the existing HLS instance
 * instantly with zero loading delay.
 */

import api from '@/services/api';
import Hls from 'hls.js';

// monitorId → { hlsUrl, hls, lastVideoEl }
const registry = new Map();

// monitorId → in-flight Promise (dedup concurrent calls)
const inFlight = new Map();

function createHlsInstance() {
  return new Hls({
    enableWorker:                true,
    lowLatencyMode:              false,
    autoStartLoad:               false,
    startPosition:               -1,
    backBufferLength:            5,
    maxBufferLength:             6,
    maxMaxBufferLength:          10,
    liveSyncDurationCount:       2,
    liveMaxLatencyDurationCount: 5,
    manifestLoadingTimeOut:      10000,
    manifestLoadingMaxRetry:     30,
    manifestLoadingRetryDelay:   1000,
    levelLoadingTimeOut:         10000,
    levelLoadingMaxRetry:        10,
    fragLoadingTimeOut:          10000,
    fragLoadingMaxRetry:         6,
  });
}

/**
 * Remove a camera from the registry (e.g. after HLS fatal error).
 * Next acquireStream call will create a fresh instance.
 */
export function evictStream(monitorId) {
  registry.delete(monitorId);
}

/**
 * Get (or create) a running HLS instance for a camera.
 * Returns { hls, hlsUrl, fresh } where fresh=true means it was just created.
 */
export async function acquireStream(monitorId) {
  if (!monitorId) throw new Error('monitorId is required');

  // Already have a live instance — return it immediately
  if (registry.has(monitorId)) {
    return { ...registry.get(monitorId), fresh: false };
  }

  // Deduplicate concurrent requests for the same monitorId
  if (inFlight.has(monitorId)) {
    await inFlight.get(monitorId);
    return { ...registry.get(monitorId), fresh: false };
  }

  const promise = api.get(`/stream/start/${monitorId}`)
    .then(({ data }) => {
      const hlsUrl = data.hlsUrl || data.streamUrl;
      const hls = createHlsInstance();
      registry.set(monitorId, { hlsUrl, hls });
      inFlight.delete(monitorId);
    })
    .catch((err) => {
      inFlight.delete(monitorId);
      throw err;
    });

  inFlight.set(monitorId, promise);
  await promise;
  return { ...registry.get(monitorId), fresh: true };
}

/**
 * Detach HLS from video element without destroying it.
 * Call on component unmount — stream keeps running in background.
 */
export function detachStream(monitorId) {
  const entry = registry.get(monitorId);
  if (!entry) return;
  try { entry.hls.detachMedia(); } catch (_) {}
}

/**
 * Destroy all HLS instances — call when leaving the live view page.
 */
export function releaseAllStreams() {
  for (const { hls } of registry.values()) {
    try { hls.destroy(); } catch (_) {}
  }
  registry.clear();
  inFlight.clear();
}

// Legacy compat — used by old code
export function getStreamUrls(monitorId) {
  return acquireStream(monitorId).then(({ hlsUrl }) => ({ hlsUrl }));
}
export function releaseStream() {} // no-op — streams stay alive
