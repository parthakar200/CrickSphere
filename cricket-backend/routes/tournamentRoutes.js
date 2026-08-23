const express = require('express');
const router = express.Router();

const tournamentController = require('../controllers/tournamentController');
const pointsTableController = require('../controllers/pointsTableController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createTournamentValidator,
  updateTournamentValidator,
  idParamValidator,
} = require('../validators/tournamentValidator');

router.use(authenticate);

router.get('/', tournamentController.getTournaments);
router.get('/:id', idParamValidator, validate, tournamentController.getTournamentById);
router.get('/:id/dashboard', idParamValidator, validate, tournamentController.getTournamentDashboard);
router.get('/:id/points-table', idParamValidator, validate, pointsTableController.getPointsTable);

router.post(
  '/',
  authorize('admin'),
  createTournamentValidator,
  validate,
  tournamentController.createTournament
);
router.patch(
  '/:id',
  authorize('admin'),
  updateTournamentValidator,
  validate,
  tournamentController.updateTournament
);
router.delete('/:id', authorize('admin'), idParamValidator, validate, tournamentController.deleteTournament);

router.post('/:id/teams', authorize('admin'), idParamValidator, validate, tournamentController.addTeamsToTournament);

module.exports = router;
