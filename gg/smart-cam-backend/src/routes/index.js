const { Router } = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const shinobiRoutes = require('./shinobi.routes');
const cameraGroupRoutes = require('./cameraGroup.routes');
const paymentRoutes = require('./payment.routes');
const subscriptionRoutes = require('./subscription.routes');
const streamRoutes = require('./stream.routes');

const router = Router();

router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/shinobi', shinobiRoutes);
router.use('/groups', cameraGroupRoutes);
router.use('/payment', paymentRoutes);
router.use('/subscription', subscriptionRoutes);
router.use('/stream', streamRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
