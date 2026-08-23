const express = require('express');
const router = express.Router();

const playerController = require('../controllers/playerController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createPlayerValidator,
  updatePlayerValidator,
  idParamValidator,
} = require('../validators/playerValidator');

router.use(authenticate);

router.get('/', playerController.getPlayers);
router.get('/:id', idParamValidator, validate, playerController.getPlayerById);

router.post('/', authorize('admin'), createPlayerValidator, validate, playerController.createPlayer);
router.patch('/:id', authorize('admin'), updatePlayerValidator, validate, playerController.updatePlayer);
router.delete('/:id', authorize('admin'), idParamValidator, validate, playerController.deletePlayer);

router.post('/sync', authorize('admin'), playerController.syncPlayersController);

module.exports = router;
