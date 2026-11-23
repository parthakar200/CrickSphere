const express = require('express');
const router = express.Router();

const leaderboardController = require('../controllers/leaderboardController');
const { optionalAuthenticate } = require('../middleware/auth');

// Public viewer / spectator leaderboards
router.get('/most-runs', optionalAuthenticate, leaderboardController.mostRuns);
router.get('/best-strike-rate', optionalAuthenticate, leaderboardController.bestStrikeRate);
router.get('/most-sixes', optionalAuthenticate, leaderboardController.mostSixes);
router.get('/most-fours', optionalAuthenticate, leaderboardController.mostFours);
router.get('/most-wickets', optionalAuthenticate, leaderboardController.mostWickets);
router.get('/best-economy', optionalAuthenticate, leaderboardController.bestEconomy);
router.get('/most-dot-balls', optionalAuthenticate, leaderboardController.mostDotBalls);
router.get('/best-bowling-average', optionalAuthenticate, leaderboardController.bestBowlingAverage);
router.get('/fielding', optionalAuthenticate, leaderboardController.fielding);

module.exports = router;
