const express = require('express');
const router = express.Router();

const tournamentController = require('../controllers/tournamentController');
const pointsTableController = require('../controllers/pointsTableController');
const { authenticate, authorize, optionalAuthenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createTournamentValidator,
  updateTournamentValidator,
  idParamValidator,
} = require('../validators/tournamentValidator');

// Public viewer / spectator read routes
router.get('/', optionalAuthenticate, tournamentController.getTournaments);
router.get('/:id', optionalAuthenticate, idParamValidator, validate, tournamentController.getTournamentById);
router.get('/:id/dashboard', optionalAuthenticate, idParamValidator, validate, tournamentController.getTournamentDashboard);
router.get('/:id/points-table', optionalAuthenticate, idParamValidator, validate, pointsTableController.getPointsTable);

// Protected official / admin routes
router.post(
  '/',
  authenticate,
  authorize('admin'),
  createTournamentValidator,
  validate,
  tournamentController.createTournament
);
router.patch(
  '/:id',
  authenticate,
  authorize('admin'),
  updateTournamentValidator,
  validate,
  tournamentController.updateTournament
);
router.delete('/:id', authenticate, authorize('admin'), idParamValidator, validate, tournamentController.deleteTournament);

router.post('/:id/teams', authenticate, authorize('admin'), idParamValidator, validate, tournamentController.addTeamsToTournament);

module.exports = router;
