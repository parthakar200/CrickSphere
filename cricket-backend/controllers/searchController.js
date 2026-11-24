const { Player, Team, Tournament, Match } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

// GET /api/search?q=virat&type=player|team|tournament|match (type optional = search all)
const search = asyncHandler(async (req, res) => {
  const { q, type } = req.query;
  if (!q || q.trim().length < 2) {
    throw ApiError.badRequest('Query parameter "q" must be at least 2 characters');
  }

  const regex = { $regex: q.trim(), $options: 'i' };
  const locFilter = req.localityId ? { locality: req.localityId } : {};

  // Run all searches concurrently in parallel with .lean() for maximum throughput
  const [players, teams, tournaments, matches] = await Promise.all([
    !type || type === 'player'
      ? Player.find({ name: regex, ...locFilter }).select('name role photo').limit(10).lean()
      : Promise.resolve([]),
    !type || type === 'team'
      ? Team.find({ name: regex, ...locFilter }).select('name shortName logo').limit(10).lean()
      : Promise.resolve([]),
    !type || type === 'tournament'
      ? Tournament.find({ name: regex, ...locFilter }).select('name logo status startDate').limit(10).lean()
      : Promise.resolve([]),
    !type || type === 'match'
      ? Match.find({ name: regex, ...locFilter })
          .select('name teamA teamB status scheduledAt')
          .populate('teamA', 'name shortName')
          .populate('teamB', 'name shortName')
          .limit(10)
          .lean()
      : Promise.resolve([]),
  ]);

  const results = {};
  if (!type || type === 'player') results.players = players;
  if (!type || type === 'team') results.teams = teams;
  if (!type || type === 'tournament') results.tournaments = tournaments;
  if (!type || type === 'match') results.matches = matches;

  res.json({ success: true, data: results });
});

module.exports = { search };
