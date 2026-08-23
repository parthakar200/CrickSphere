const express = require('express');
const router = express.Router();

const statisticsController = require('../controllers/statisticsController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/overview', statisticsController.getOverview);
router.get('/batting-analytics', statisticsController.getBattingAnalytics);
router.get('/bowling-analytics', statisticsController.getBowlingAnalytics);
router.get('/team-analytics', statisticsController.getTeamAnalytics);

module.exports = router;
