const { Tournament, Team, Match, PointsTable, BattingStats, BowlingStats, TournamentSquad } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { parseQueryOptions, buildPaginatedResponse } = require('../utils/queryHelpers');

// POST /api/tournaments
const createTournament = asyncHandler(async (req, res) => {
  const {
    name,
    logo,
    startDate,
    endDate,
    venue,
    organizer,
    format,
    matchType,
    oversPerMatch,
    pointsSystem,
  } = req.body;

  const tournament = await Tournament.create({
    name,
    logo,
    startDate,
    endDate,
    venue,
    organizer,
    format,
    matchType,
    oversPerMatch,
    pointsSystem,
    createdBy: req.user._id,
  });

  res.status(201).json({ success: true, data: tournament });
});

// GET /api/tournaments
const getTournaments = asyncHandler(async (req, res) => {
  const { skip, limit, sort, page } = parseQueryOptions(req.query, { defaultSort: '-startDate' });

  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.search) filter.$text = { $search: req.query.search };

  const [tournaments, total] = await Promise.all([
    Tournament.find(filter).sort(sort).skip(skip).limit(limit).populate('teams', 'name shortName logo'),
    Tournament.countDocuments(filter),
  ]);

  res.json(buildPaginatedResponse(tournaments, total, page, limit));
});

// GET /api/tournaments/:id
const getTournamentById = asyncHandler(async (req, res) => {
  const tournament = await Tournament.findById(req.params.id).populate('teams', 'name shortName logo');
  if (!tournament) throw ApiError.notFound('Tournament not found');
  res.json({ success: true, data: tournament });
});

// PATCH /api/tournaments/:id
const updateTournament = asyncHandler(async (req, res) => {
  const allowedFields = [
    'name',
    'logo',
    'startDate',
    'endDate',
    'venue',
    'organizer',
    'format',
    'matchType',
    'oversPerMatch',
    'status',
    'pointsSystem',
    'isActive',
  ];
  const updates = {};
  allowedFields.forEach((f) => {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  });

  const tournament = await Tournament.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });
  if (!tournament) throw ApiError.notFound('Tournament not found');

  res.json({ success: true, data: tournament });
});

// DELETE /api/tournaments/:id
const deleteTournament = asyncHandler(async (req, res) => {
  const tournament = await Tournament.findById(req.params.id);
  if (!tournament) throw ApiError.notFound('Tournament not found');
  await tournament.deleteOne();
  res.json({ success: true, message: 'Tournament deleted successfully' });
});

// POST /api/tournaments/:id/teams  -> add team(s) to tournament
const addTeamsToTournament = asyncHandler(async (req, res) => {
  const { teamIds } = req.body; // array of team ObjectId strings
  if (!Array.isArray(teamIds) || teamIds.length === 0) {
    throw ApiError.badRequest('teamIds must be a non-empty array');
  }

  const tournament = await Tournament.findById(req.params.id);
  if (!tournament) throw ApiError.notFound('Tournament not found');

  await Tournament.findByIdAndUpdate(req.params.id, { $addToSet: { teams: { $each: teamIds } } });
  await Team.updateMany({ _id: { $in: teamIds } }, { tournament: req.params.id });

  // Seed a PointsTable row for each newly added team.
  for (const teamId of teamIds) {
    await PointsTable.findOneAndUpdate(
      { tournament: req.params.id, team: teamId },
      { $setOnInsert: { tournament: req.params.id, team: teamId } },
      { upsert: true }
    );
  }

  res.json({ success: true, message: 'Teams added to tournament' });
});

// GET /api/tournaments/:id/dashboard  -> overview numbers requested in spec
const getTournamentDashboard = asyncHandler(async (req, res) => {
  const tournamentId = req.params.id;
  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) throw ApiError.notFound('Tournament not found');

  const [totalTeams, totalMatches, squadPlayerIds] = await Promise.all([
    Team.countDocuments({ tournament: tournamentId }),
    Match.countDocuments({ tournament: tournamentId }),
    TournamentSquad.distinct('player', { tournament: tournamentId }),
  ]);

  const totalPlayers = squadPlayerIds.length;

  const [battingAgg] = await BattingStats.aggregate([
    { $match: { tournament: tournament._id } },
    {
      $group: {
        _id: null,
        totalRuns: { $sum: '$runs' },
        totalFours: { $sum: '$fours' },
        totalSixes: { $sum: '$sixes' },
      },
    },
  ]);

  const [bowlingAgg] = await BowlingStats.aggregate([
    { $match: { tournament: tournament._id } },
    { $group: { _id: null, totalWickets: { $sum: '$wickets' } } },
  ]);

  res.json({
    success: true,
    data: {
      tournament: { id: tournament._id, name: tournament.name, status: tournament.status },
      overview: {
        totalTeams,
        totalPlayers,
        totalMatches,
        totalRuns: battingAgg?.totalRuns || 0,
        totalWickets: bowlingAgg?.totalWickets || 0,
        totalSixes: battingAgg?.totalSixes || 0,
        totalFours: battingAgg?.totalFours || 0,
      },
    },
  });
});

module.exports = {
  createTournament,
  getTournaments,
  getTournamentById,
  updateTournament,
  deleteTournament,
  addTeamsToTournament,
  getTournamentDashboard,
};
