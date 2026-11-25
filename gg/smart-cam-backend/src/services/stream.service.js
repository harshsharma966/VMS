/**
 * Stream Service — Shinobi VMS
 *
 * Live streaming is handled entirely by Shinobi VMS.
 * The browser plays HLS directly from Shinobi:
 *   http://localhost:8443/{apiKey}/hls/{groupKey}/{monitorId}/s.m3u8
 */

const logger = require('../config/logger');
const shinobiService = require('./shinobi.service');
const config = require('../config/env');

class StreamService {
  /**
   * Start HLS stream for a camera via Shinobi.
   * Tells Shinobi to start the monitor and returns the HLS URL.
   * @param {Object} camera  — Camera model instance
   * @param {Object} user    — User model instance (needs apiKey + groupKey)
   * @returns {{ hlsUrl: string, provider: string }}
   */
  async startStream(camera, user) {
    const { monitorId } = camera;
    // Only call startMonitor if camera is NOT already running.
    // Calling /record on an already-recording camera restarts its FFmpeg process,
    // clearing HLS segments and breaking the stream for anyone currently watching.
    if (camera.status !== 'online') {
      await shinobiService.startMonitor(user.apiKey, user.groupKey, monitorId);
    }
    const hlsUrl = this.getHlsUrl(user.apiKey, user.groupKey, monitorId);
    logger.info(`[Stream] HLS URL for ${monitorId}: ${hlsUrl}`);
    return { hlsUrl, provider: 'shinobi' };
  }

  /**
   * Stop HLS stream via Shinobi.
   */
  async stopStream(monitorId, user) {
    await shinobiService.stopMonitor(user.apiKey, user.groupKey, monitorId);
    logger.info(`[Stream] Stopped Shinobi stream for ${monitorId}`);
  }

  /**
   * Build the Shinobi HLS playlist URL for a monitor.
   */
  getHlsUrl(apiKey, groupKey, monitorId) {
    // Use publicUrl when set (HTTPS deployments — avoids mixed content with direct Shinobi port).
    // SHINOBI_PUBLIC_URL points to the Nginx /shinobi/ proxy (e.g. https://domain.com/shinobi).
    const base = config.shinobi.publicUrl || config.shinobi.url || 'http://localhost:8443';
    return `${base}/${apiKey}/hls/${groupKey}/${monitorId}/s.m3u8`;
  }

  /**
   * Check whether a camera stream is active (based on camera DB status).
   * The authoritative status comes from Shinobi via the sync mechanism.
   */
  isStreamActive(camera) {
    return camera && camera.status === 'online';
  }
}

module.exports = new StreamService();
