
const express = require('express');
const router = express.Router();

const teamController = require('../controllers/teamController');
const squadController = require('../controllers/tournamentSquadController');
const { authenticate, authorize, optionalAuthenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createTeamValidator, updateTeamValidator, idParamValidator } = require('../validators/teamValidator');
const {
  squadParamValidator,
  addToSquadValidator,
  removeFromSquadValidator,
} = require('../validators/tournamentSquadValidator');

// Public viewer / spectator read routes
router.get('/', optionalAuthenticate, teamController.getTeams);
router.get('/:id', optionalAuthenticate, idParamValidator, validate, teamController.getTeamById);
router.get('/:id/squad', optionalAuthenticate, squadParamValidator, validate, squadController.getSquad);
router.get('/:id/squad/taken', optionalAuthenticate, squadParamValidator, validate, squadController.getTournamentTakenPlayers);

// Protected admin routes
router.post('/', authenticate, authorize('admin'), createTeamValidator, validate, teamController.createTeam);
router.patch('/:id', authenticate, authorize('admin'), updateTeamValidator, validate, teamController.updateTeam);
router.delete('/:id', authenticate, authorize('admin'), idParamValidator, validate, teamController.deleteTeam);

router.post('/:id/squad', authenticate, authorize('admin'), addToSquadValidator, validate, squadController.addToSquad);
router.delete(
  '/:id/squad/:playerId',
  authenticate,
  authorize('admin'),
  removeFromSquadValidator,
  validate,
  squadController.removeFromSquad
);

module.exports = router;