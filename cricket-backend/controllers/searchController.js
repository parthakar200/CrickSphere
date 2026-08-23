const { Player, Team, Tournament, Match } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

// GET /api/search?q=virat&type=player|team|tournament|match (type optional = search all)
const search = asyncHandler(async (req, res) => {
  const { q, type } = req.query;
  if (!q || q.trim().length < 2) {
    throw ApiError.badRequest('Query parameter "q" must be at least 2 characters');
  }

  const regex = { $regex: q, $options: 'i' };
  const results = {};

  if (!type || type === 'player') {
    results.players = await Player.find({ name: regex }).select('name role photo team').limit(10).populate('team', 'name shortName');
  }
  if (!type || type === 'team') {
    results.teams = await Team.find({ name: regex }).select('name shortName logo').limit(10);
  }
  if (!type || type === 'tournament') {
    results.tournaments = await Tournament.find({ name: regex }).select('name logo status startDate').limit(10);
  }
  if (!type || type === 'match') {
    results.matches = await Match.find({ name: regex })
      .select('name teamA teamB status scheduledAt')
      .populate('teamA', 'name shortName')
      .populate('teamB', 'name shortName')
      .limit(10);
  }

  res.json({ success: true, data: results });
});

module.exports = { search };
