const { Router } = require('express');
const ctrl = require('../controllers/cameraGroup.controller');
const authenticate = require('../middleware/authenticate');

const router = Router();

// All routes require login
router.use(authenticate);

// ── Group CRUD ──────────────────────────────────────────────
// GET    /api/groups              → list all groups (with cameras)
// POST   /api/groups              → create group + auto-provision cameras
// GET    /api/groups/:groupId     → get one group + its cameras
// PUT    /api/groups/:groupId     → update group
// DELETE /api/groups/:groupId     → delete group + all cameras

router.get('/', ctrl.listGroups);
router.post('/', ctrl.createGroup);
router.get('/:groupId', ctrl.getGroup);
router.put('/:groupId', ctrl.updateGroup);
router.delete('/:groupId', ctrl.deleteGroup);
// Force-sync camera statuses from Shinobi (frontend "Refresh" button)
router.post('/:groupId/sync', ctrl.syncGroup);
// Remove a single camera channel (e.g. channel that doesn't exist on the physical device)
router.delete('/:groupId/cameras/:monitorId', ctrl.deleteCameraFromGroup);
// Re-apply FFmpeg/Shinobi config to all cameras (use after changing shinobi.service.js settings)
router.post('/:groupId/reconfigure', ctrl.reconfigureGroup);

// ── S3 Recordings ────────────────────────────────────────────
// GET /api/groups/:groupId/recordings              → all cameras in group
// GET /api/groups/:groupId/cameras/:monitorId/recordings  → single camera

router.get('/:groupId/recordings', ctrl.getGroupRecordings);
router.get('/:groupId/cameras/:monitorId/recordings', ctrl.getCameraRecordings);
// GET /api/groups/:groupId/recordings/play?key=<s3-key>     → fresh 7-day playback URL (called per-video on click)
router.get('/:groupId/recordings/play', ctrl.getRecordingPlayUrl);
// GET /api/groups/:groupId/recordings/stream?key=<s3-key>  → proxy S3 bytes with Range support (used by <video> src)
router.get('/:groupId/recordings/stream', ctrl.streamRecording);
// GET /api/groups/:groupId/recordings/thumbnail?key=<s3-key>  → first-frame JPEG thumbnail (cached 24 h)
router.get('/:groupId/recordings/thumbnail', ctrl.getThumbnailForRecording);
// GET /api/groups/:groupId/recordings/download?key=<s3-key>   → forced-download signed URL
router.get('/:groupId/recordings/download', ctrl.getRecordingDownloadUrl);

module.exports = router;
