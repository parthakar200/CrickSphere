const express = require('express');
const router = express.Router();
const localityController = require('../controllers/localityController');
const { authenticate, authorize } = require('../middleware/auth');

// Public endpoints — viewers and unauthenticated users can list and inspect localities
router.get('/', localityController.getLocalities);
router.get('/:idOrSlug', localityController.getLocalityByIdOrSlug);

// Public: anyone can register a new village to start their journey
router.post('/', localityController.createLocality);

// Admin-only: update village name or metadata (supports PATCH and PUT)
router.patch('/:id', authenticate, authorize('admin'), localityController.updateLocality);
router.put('/:id', authenticate, authorize('admin'), localityController.updateLocality);

module.exports = router;
