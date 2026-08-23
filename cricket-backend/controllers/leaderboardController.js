const asyncHandler = require('../utils/asyncHandler');
const leaderboardService = require('../services/leaderboardService');

// Adds a 1-indexed `rank` field to any leaderboard result array.
function withRank(rows) {
  return rows.map((row, idx) => ({ rank: idx + 1, ...(row.toObject ? row.toObject() : row) }));
}

function getCommonParams(req) {
  return {
    tournamentId: req.query.tournament || null,
    limit: Math.min(parseInt(req.query.limit, 10) || 50, 200),
  };
}

// GET /api/leaderboards/most-runs
const mostRuns = asyncHandler(async (req, res) => {
  const rows = await leaderboardService.mostRuns(getCommonParams(req));
  res.json({ success: true, data: withRank(rows) });
});

// GET /api/leaderboards/best-strike-rate?minBalls=30
const bestStrikeRate = asyncHandler(async (req, res) => {
  const params = { ...getCommonParams(req), minBalls: parseInt(req.query.minBalls, 10) || 30 };
  const rows = await leaderboardService.bestStrikeRate(params);
  res.json({ success: true, data: withRank(rows) });
});

// GET /api/leaderboards/most-sixes
const mostSixes = asyncHandler(async (req, res) => {
  const rows = await leaderboardService.mostSixes(getCommonParams(req));
  res.json({ success: true, data: withRank(rows) });
});

// GET /api/leaderboards/most-fours
const mostFours = asyncHandler(async (req, res) => {
  const rows = await leaderboardService.mostFours(getCommonParams(req));
  res.json({ success: true, data: withRank(rows) });
});

// GET /api/leaderboards/most-wickets
const mostWickets = asyncHandler(async (req, res) => {
  const rows = await leaderboardService.mostWickets(getCommonParams(req));
  res.json({ success: true, data: withRank(rows) });
});

// GET /api/leaderboards/best-economy?minOvers=4
const bestEconomy = asyncHandler(async (req, res) => {
  const params = { ...getCommonParams(req), minOvers: parseInt(req.query.minOvers, 10) || 4 };
  const rows = await leaderboardService.bestEconomy(params);
  res.json({ success: true, data: withRank(rows) });
});

// GET /api/leaderboards/most-dot-balls?minOvers=4
const mostDotBalls = asyncHandler(async (req, res) => {
  const params = { ...getCommonParams(req), minOvers: parseInt(req.query.minOvers, 10) || 0 };
  const rows = await leaderboardService.mostDotBalls(params);
  res.json({ success: true, data: withRank(rows) });
});

// GET /api/leaderboards/best-bowling-average?minWickets=5
const bestBowlingAverage = asyncHandler(async (req, res) => {
  const params = { ...getCommonParams(req), minWickets: parseInt(req.query.minWickets, 10) || 5 };
  const rows = await leaderboardService.bestBowlingAverage(params);
  res.json({ success: true, data: withRank(rows) });
});

// GET /api/leaderboards/fielding?type=catches|runOuts|stumpings|all
const fielding = asyncHandler(async (req, res) => {
  const type = ['catches', 'runOuts', 'stumpings', 'all'].includes(req.query.type) ? req.query.type : 'all';
  const rows = await leaderboardService.fieldingLeaderboard({ ...getCommonParams(req), type });
  res.json({ success: true, data: withRank(rows) });
});

module.exports = {
  mostRuns,
  bestStrikeRate,
  mostSixes,
  mostFours,
  mostWickets,
  bestEconomy,
  mostDotBalls,
  bestBowlingAverage,
  fielding,
};
