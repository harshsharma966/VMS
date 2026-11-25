const { Router } = require('express');
const shinobiController = require('../controllers/shinobi.controller');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const shinobiValidation = require('../validations/shinobi.validation');

const router = Router();

router.get('/cameras', authenticate, shinobiController.getCameras);
router.get('/cameras/:monitorId', authenticate, shinobiController.getCamera);
router.post('/cameras', authenticate, validate(shinobiValidation.addCamera), shinobiController.addCamera);
router.put('/cameras/:monitorId', authenticate, validate(shinobiValidation.updateCamera), shinobiController.updateCamera);
router.delete('/cameras/:monitorId', authenticate, shinobiController.deleteCamera);
router.get('/recordings/:monitorId', authenticate, shinobiController.getRecordings);

module.exports = router;
