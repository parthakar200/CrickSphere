
const express = require('express');
const router = express.Router();

const matchController = require('../controllers/matchController');
const scoringController = require('../controllers/scoringController');
const { authenticate, authorize, optionalAuthenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createMatchValidator,
  tossValidator,
  playingXIValidator,
  idParamValidator,
} = require('../validators/matchValidator');
const { recordBallValidator } = require('../validators/scoringValidator');

// Public viewer / spectator read routes
router.get('/', optionalAuthenticate, matchController.getMatches);
router.get('/:id', optionalAuthenticate, idParamValidator, validate, matchController.getMatchById);
router.get('/:id/live', optionalAuthenticate, idParamValidator, validate, matchController.getLiveScorecard);
router.get('/:id/scorecard', optionalAuthenticate, idParamValidator, validate, matchController.getMatchScorecard);
router.get('/:id/eligible-players', optionalAuthenticate, idParamValidator, validate, matchController.getEligiblePlayers);

// Protected official / admin & scorer routes
router.post('/', authenticate, authorize('admin'), createMatchValidator, validate, matchController.createMatch);

router.patch(
  '/:id/playing-xi',
  authenticate,
  authorize('admin', 'scorer'),
  playingXIValidator,
  validate,
  matchController.setPlayingXI
);

router.post('/:id/toss', authenticate, authorize('admin', 'scorer'), tossValidator, validate, matchController.setToss);
router.post(
  '/:id/start-next-innings',
  authenticate,
  authorize('admin', 'scorer'),
  idParamValidator,
  validate,
  matchController.startNextInnings
);
router.post('/:id/complete', authenticate, authorize('admin', 'scorer'), idParamValidator, validate, matchController.completeMatch);
router.post('/:id/reopen', authenticate, authorize('admin', 'scorer'), idParamValidator, validate, matchController.reopenMatch);

// Ball-by-ball scoring (REST fallback alongside the Socket.IO live channel)
router.post(
  '/:matchId/innings/:inningsId/ball',
  authenticate,
  authorize('admin', 'scorer'),
  recordBallValidator,
  validate,
  scoringController.postBall
);
router.post(
  '/:matchId/innings/:inningsId/undo-last-ball',
  authenticate,
  authorize('admin', 'scorer'),
  scoringController.postUndoLastBall
);
router.post(
  '/:matchId/innings/:inningsId/rotate-strike',
  authenticate,
  authorize('admin', 'scorer'),
  scoringController.postRotateStrike
);

module.exports = router;