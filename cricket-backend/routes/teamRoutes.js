
const express = require('express');
const router = express.Router();

const teamController = require('../controllers/teamController');
const squadController = require('../controllers/tournamentSquadController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createTeamValidator, updateTeamValidator, idParamValidator } = require('../validators/teamValidator');
const {
  squadParamValidator,
  addToSquadValidator,
  removeFromSquadValidator,
} = require('../validators/tournamentSquadValidator');

router.use(authenticate);

router.get('/', teamController.getTeams);
router.get('/:id', idParamValidator, validate, teamController.getTeamById);

router.post('/', authorize('admin'), createTeamValidator, validate, teamController.createTeam);
router.patch('/:id', authorize('admin'), updateTeamValidator, validate, teamController.updateTeam);
router.delete('/:id', authorize('admin'), idParamValidator, validate, teamController.deleteTeam);

// Squad management — only meaningful for tournament-scoped teams (team.tournament != null).
// Standalone teams (used in single matches) have no squad; see tournamentSquadController.js.
router.get('/:id/squad', squadParamValidator, validate, squadController.getSquad);
router.get('/:id/squad/taken', squadParamValidator, validate, squadController.getTournamentTakenPlayers);
router.post('/:id/squad', authorize('admin'), addToSquadValidator, validate, squadController.addToSquad);
router.delete(
  '/:id/squad/:playerId',
  authorize('admin'),
  removeFromSquadValidator,
  validate,
  squadController.removeFromSquad
);

module.exports = router;