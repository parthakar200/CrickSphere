const express = require('express');
const router = express.Router();

const statisticsController = require('../controllers/statisticsController');
const { optionalAuthenticate } = require('../middleware/auth');

// Public viewer / spectator statistics routes
router.get('/overview', optionalAuthenticate, statisticsController.getOverview);
router.get('/batting-analytics', optionalAuthenticate, statisticsController.getBattingAnalytics);
router.get('/bowling-analytics', optionalAuthenticate, statisticsController.getBowlingAnalytics);
router.get('/team-analytics', optionalAuthenticate, statisticsController.getTeamAnalytics);

module.exports = router;
