
const { Team, Tournament, PointsTable } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { parseQueryOptions, buildPaginatedResponse } = require('../utils/queryHelpers');

// POST /api/teams
const createTeam = asyncHandler(async (req, res) => {
  const { name, shortName, logo, homeGround, coach, tournament } = req.body;

  if (tournament) {
    const t = await Tournament.findById(tournament);
    if (!t) throw ApiError.notFound('Tournament not found');
  }

  const team = await Team.create({
    name,
    shortName,
    logo,
    homeGround,
    coach,
    tournament: tournament || null,
    locality: req.body.locality || req.user?.locality || req.localityId,
    createdBy: req.user._id,
  });

  if (tournament) {
    await Tournament.findByIdAndUpdate(tournament, { $addToSet: { teams: team._id } });
    await PointsTable.findOneAndUpdate(
      { tournament, team: team._id },
      { $setOnInsert: { tournament, team: team._id } },
      { upsert: true }
    );
  }

  res.status(201).json({ success: true, data: team });
});

// GET /api/teams
const getTeams = asyncHandler(async (req, res) => {
  const { skip, limit, sort, page } = parseQueryOptions(req.query, { defaultSort: 'name' });

  const filter = {};
  if (req.query.tournament) filter.tournament = req.query.tournament;
  if (req.query.search) filter.name = { $regex: req.query.search, $options: 'i' };
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
  if (req.localityId) filter.locality = req.localityId;

  const [teams, total] = await Promise.all([
    Team.find(filter)
      .populate('captain', 'name role photo')
      .populate('tournament', 'name')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Team.countDocuments(filter),
  ]);

  res.json(buildPaginatedResponse(teams, total, page, limit));
});

// GET /api/teams/:id
const getTeamById = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.id)
    .populate('captain', 'name role photo')
    .populate('tournament', 'name logo')
    .lean();

  if (!team) throw ApiError.notFound('Team not found');
  res.json({ success: true, data: team });
});

// PATCH /api/teams/:id
const updateTeam = asyncHandler(async (req, res) => {
  const allowedFields = ['name', 'shortName', 'logo', 'homeGround', 'coach', 'captain', 'isActive'];
  const updates = {};
  allowedFields.forEach((f) => {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  });

  const team = await Team.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!team) throw ApiError.notFound('Team not found');

  res.json({ success: true, data: team });
});

// DELETE /api/teams/:id
const deleteTeam = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.id);
  if (!team) throw ApiError.notFound('Team not found');

  if (team.tournament) {
    await Tournament.findByIdAndUpdate(team.tournament, { $pull: { teams: team._id } });
  }
  await team.deleteOne();

  res.json({ success: true, message: 'Team deleted successfully' });
});

module.exports = {
  createTeam,
  getTeams,
  getTeamById,
  updateTeam,
  deleteTeam,
};