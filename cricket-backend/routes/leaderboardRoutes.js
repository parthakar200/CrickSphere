const express = require('express');
const router = express.Router();

const leaderboardController = require('../controllers/leaderboardController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/most-runs', leaderboardController.mostRuns);
router.get('/best-strike-rate', leaderboardController.bestStrikeRate);
router.get('/most-sixes', leaderboardController.mostSixes);
router.get('/most-fours', leaderboardController.mostFours);
router.get('/most-wickets', leaderboardController.mostWickets);
router.get('/best-economy', leaderboardController.bestEconomy);
router.get('/most-dot-balls', leaderboardController.mostDotBalls);
router.get('/best-bowling-average', leaderboardController.bestBowlingAverage);
router.get('/fielding', leaderboardController.fielding);

module.exports = router;
