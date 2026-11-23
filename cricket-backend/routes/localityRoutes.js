const express = require('express');
const router = express.Router();
const localityController = require('../controllers/localityController');
const { authenticate, authorize } = require('../middleware/auth');

// Public endpoints — viewers and unauthenticated users can list and inspect localities
router.get('/', localityController.getLocalities);
router.get('/:idOrSlug', localityController.getLocalityByIdOrSlug);

// Public: anyone can register a new village to start their journey
router.post('/', localityController.createLocality);

module.exports = router;
