const asyncHandler = require('../middleware/asyncHandler');
const { Camera, User } = require('../models');
const streamService = require('../services/stream.service');
const AppError = require('../utils/AppError');

/**
 * Start HLS stream for a camera.
 * GET /api/stream/start/:monitorId
 *
 * Tells Shinobi to start the monitor and returns the HLS URL.
 */
const startStream = asyncHandler(async (req, res) => {
  const { monitorId } = req.params;

  const [camera, user] = await Promise.all([
    Camera.findOne({ where: { userId: req.user.id, monitorId } }),
    User.findByPk(req.user.id),
  ]);

  if (!camera) throw new AppError('Camera not found', 404);

  const streamInfo = await streamService.startStream(camera, user);

  res.json({
    ok: true,
    monitorId,
    hlsUrl:    streamInfo.hlsUrl,
    streamUrl: streamInfo.hlsUrl,
    provider:  streamInfo.provider,
    message:   'Stream started',
  });
});

/**
 * Stop HLS stream via Shinobi.
 * GET /api/stream/stop/:monitorId
 */
const stopStream = asyncHandler(async (req, res) => {
  const { monitorId } = req.params;

  const [camera, user] = await Promise.all([
    Camera.findOne({ where: { userId: req.user.id, monitorId } }),
    User.findByPk(req.user.id),
  ]);

  if (!camera) throw new AppError('Camera not found', 404);

  await streamService.stopStream(monitorId, user);

  res.json({ ok: true, monitorId, message: 'Stream stopped' });
});

/**
 * Get stream status for a camera.
 * GET /api/stream/status/:monitorId
 */
const getStreamStatus = asyncHandler(async (req, res) => {
  const { monitorId } = req.params;

  const [camera, user] = await Promise.all([
    Camera.findOne({ where: { userId: req.user.id, monitorId } }),
    User.findByPk(req.user.id),
  ]);

  if (!camera) throw new AppError('Camera not found', 404);

  const isActive = streamService.isStreamActive(camera);
  const hlsUrl = isActive ? streamService.getHlsUrl(user.apiKey, user.groupKey, monitorId) : null;

  res.json({
    ok: true,
    monitorId,
    isActive,
    hlsUrl,
    streamUrl: hlsUrl,
    provider:  isActive ? 'shinobi' : null,
  });
});

module.exports = { startStream, stopStream, getStreamStatus };
