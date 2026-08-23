
const express = require('express');
const router = express.Router();

const matchController = require('../controllers/matchController');
const scoringController = require('../controllers/scoringController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createMatchValidator,
  tossValidator,
  playingXIValidator,
  idParamValidator,
} = require('../validators/matchValidator');
const { recordBallValidator } = require('../validators/scoringValidator');

router.use(authenticate);

router.get('/', matchController.getMatches);
router.get('/:id', idParamValidator, validate, matchController.getMatchById);
router.get('/:id/live', idParamValidator, validate, matchController.getLiveScorecard);
router.get('/:id/scorecard', idParamValidator, validate, matchController.getMatchScorecard);
router.get('/:id/eligible-players', idParamValidator, validate, matchController.getEligiblePlayers);

router.post('/', authorize('admin'), createMatchValidator, validate, matchController.createMatch);

router.patch(
  '/:id/playing-xi',
  authorize('admin', 'scorer'),
  playingXIValidator,
  validate,
  matchController.setPlayingXI
);

router.post('/:id/toss', authorize('admin', 'scorer'), tossValidator, validate, matchController.setToss);
router.post(
  '/:id/start-next-innings',
  authorize('admin', 'scorer'),
  idParamValidator,
  validate,
  matchController.startNextInnings
);
router.post('/:id/complete', authorize('admin', 'scorer'), idParamValidator, validate, matchController.completeMatch);
router.post('/:id/reopen', authorize('admin', 'scorer'), idParamValidator, validate, matchController.reopenMatch);

// Ball-by-ball scoring (REST fallback alongside the Socket.IO live channel)
router.post(
  '/:matchId/innings/:inningsId/ball',
  authorize('admin', 'scorer'),
  recordBallValidator,
  validate,
  scoringController.postBall
);
router.post(
  '/:matchId/innings/:inningsId/undo-last-ball',
  authorize('admin', 'scorer'),
  scoringController.postUndoLastBall
);
router.post(
  '/:matchId/innings/:inningsId/rotate-strike',
  authorize('admin', 'scorer'),
  scoringController.postRotateStrike
);

module.exports = router;