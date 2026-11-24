

const { Player, CareerStats, TournamentSquad } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { parseQueryOptions, buildPaginatedResponse } = require('../utils/queryHelpers');

// POST /api/players
const createPlayer = asyncHandler(async (req, res) => {
  const { name, photo, jerseyNumber, dateOfBirth, nationality, role, battingStyle, bowlingStyle } = req.body;

  const player = await Player.create({
    name,
    photo,
    jerseyNumber,
    dateOfBirth,
    nationality,
    role,
    battingStyle,
    bowlingStyle,
    locality: req.body.locality || req.user?.locality || req.localityId,
    createdBy: req.user._id,
  });

  await CareerStats.create({ player: player._id });

  res.status(201).json({ success: true, data: player });
});

// GET /api/players
const getPlayers = asyncHandler(async (req, res) => {
  const { skip, limit, sort, page } = parseQueryOptions(req.query, { defaultSort: 'name' });

  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.search) filter.$text = { $search: req.query.search };
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
  if (req.localityId) filter.locality = req.localityId;

  const [players, total] = await Promise.all([
    Player.find(filter)
      .select('name photo role battingStyle bowlingStyle jerseyNumber isActive locality')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Player.countDocuments(filter),
  ]);

  res.json(buildPaginatedResponse(players, total, page, limit));
});

// GET /api/players/:id  -> full profile including career stats
const getPlayerById = asyncHandler(async (req, res) => {
  const [player, careerStats] = await Promise.all([
    Player.findById(req.params.id).lean(),
    CareerStats.findOne({ player: req.params.id }).lean(),
  ]);
  if (!player) throw ApiError.notFound('Player not found');

  res.json({ success: true, data: { player, careerStats: careerStats || null } });
});

// PATCH /api/players/:id
const updatePlayer = asyncHandler(async (req, res) => {
  const allowedFields = [
    'name',
    'photo',
    'jerseyNumber',
    'dateOfBirth',
    'nationality',
    'role',
    'battingStyle',
    'bowlingStyle',
    'isActive',
  ];
  const updates = {};
  allowedFields.forEach((f) => {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  });

  const existing = await Player.findById(req.params.id);
  if (!existing) throw ApiError.notFound('Player not found');

  if (!existing.createdBy) {
    existing.createdBy = req.user._id;
  }

  Object.assign(existing, updates);
  await existing.save();

  res.json({ success: true, data: existing });
});

// // DELETE /api/players/:id
// const deletePlayer = asyncHandler(async (req, res) => {
//   const player = await Player.findById(req.params.id);
//   if (!player) throw ApiError.notFound('Player not found');

//   await player.deleteOne();
//   await CareerStats.deleteOne({ player: player._id });

//   res.json({ success: true, message: 'Player deleted successfully' });
// });

// DELETE /api/players/:id
const deletePlayer = asyncHandler(async (req, res) => {
  const player = await Player.findById(req.params.id);
  if (!player) throw ApiError.notFound('Player not found');

  await player.deleteOne();
  await CareerStats.deleteOne({ player: player._id });
  await TournamentSquad.deleteMany({ player: player._id });

  res.json({ success: true, message: 'Player deleted successfully' });
});

const { syncPlayers } = require('../services/playerSyncService');

const syncPlayersController = asyncHandler(async (req, res) => {
  const result = await syncPlayers(req.user._id, { force: true });
  res.json({ success: true, message: 'Players synchronized successfully', data: result });
});

module.exports = { createPlayer, getPlayers, getPlayerById, updatePlayer, deletePlayer, syncPlayersController };