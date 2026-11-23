const express = require('express');
const router = express.Router();

const playerController = require('../controllers/playerController');
const { authenticate, authorize, optionalAuthenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createPlayerValidator,
  updatePlayerValidator,
  idParamValidator,
} = require('../validators/playerValidator');

// Public viewer / spectator read routes
router.get('/', optionalAuthenticate, playerController.getPlayers);
router.get('/:id', optionalAuthenticate, idParamValidator, validate, playerController.getPlayerById);

// Protected admin routes
router.post('/', authenticate, authorize('admin'), createPlayerValidator, validate, playerController.createPlayer);
router.patch('/:id', authenticate, authorize('admin'), updatePlayerValidator, validate, playerController.updatePlayer);
router.delete('/:id', authenticate, authorize('admin'), idParamValidator, validate, playerController.deletePlayer);

router.post('/sync', authenticate, authorize('admin'), playerController.syncPlayersController);

module.exports = router;
