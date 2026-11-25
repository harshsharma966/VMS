const { Router } = require('express');
const router = Router();
const streamController = require('../controllers/stream.controller');
const authenticate = require('../middleware/authenticate');

router.get('/start/:monitorId', authenticate, streamController.startStream);
router.get('/stop/:monitorId', authenticate, streamController.stopStream);
router.get('/status/:monitorId', authenticate, streamController.getStreamStatus);

module.exports = router;
