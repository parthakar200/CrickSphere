const { Team, Player, TournamentSquad } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/teams/:id/squad
const getSquad = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.id);
  if (!team) throw ApiError.notFound('Team not found');
  if (!team.tournament) throw ApiError.badRequest('Standalone teams (used in single matches) do not have a squad');

  const squad = await TournamentSquad.find({ team: team._id })
    .populate('player', 'name role photo jerseyNumber battingStyle bowlingStyle')
    .sort({ joinedAt: 1 });

  // Self-heal: a squad entry can end up pointing at a player that was
  // deleted elsewhere without going through the cascade in deletePlayer
  // (e.g. data from before that cascade existed). Drop those orphaned rows
  // here so they don't keep breaking the client, and clean them up in the
  // DB so this doesn't need to run again for the same entry.
  const valid = squad.filter((entry) => entry.player);
  const orphaned = squad.filter((entry) => !entry.player);
  if (orphaned.length > 0) {
    await TournamentSquad.deleteMany({ _id: { $in: orphaned.map((o) => o._id) } });
  }

  res.json({ success: true, data: valid });
});


// GET /api/teams/:id/squad/taken -> every player already registered to
// ANY team's squad in this team's tournament, with which team has them.
// Used by the admin "add player" picker so it can show taken players as
// disabled instead of either hiding them or letting them be double-booked.
const getTournamentTakenPlayers = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.id);
  if (!team) throw ApiError.notFound('Team not found');
  if (!team.tournament) throw ApiError.badRequest('Standalone teams do not have a squad');

  const squads = await TournamentSquad.find({ tournament: team.tournament })
    .populate('team', 'name shortName')
    .select('player team');

  const taken = squads
    .filter((entry) => entry.team && entry.player)
    .map((entry) => ({
      playerId: entry.player.toString(),
      teamId: entry.team._id.toString(),
      teamName: entry.team.name,
    }));

  res.json({ success: true, data: taken });
});


// POST /api/teams/:id/squad  { playerId }
const addToSquad = asyncHandler(async (req, res) => {
  const { playerId } = req.body;

  const team = await Team.findById(req.params.id);
  if (!team) throw ApiError.notFound('Team not found');
  if (!team.tournament) {
    throw ApiError.badRequest('Standalone teams (used in single matches) do not have a squad — Playing XI is picked per match instead');
  }

  const player = await Player.findById(playerId);
  if (!player) throw ApiError.notFound('Player not found');

  try {
    const entry = await TournamentSquad.create({
      tournament: team.tournament,
      team: team._id,
      player: playerId,
    });
    res.status(201).json({ success: true, data: entry });
  } catch (err) {
    if (err.code === 11000) {
      const existing = await TournamentSquad.findOne({ tournament: team.tournament, player: playerId }).populate(
        'team',
        'name'
      );
      throw ApiError.conflict(
        `${player.name} is already registered to ${existing?.team?.name ?? 'another team'} for this tournament`
      );
    }
    throw err;
  }
});

// DELETE /api/teams/:id/squad/:playerId
const removeFromSquad = asyncHandler(async (req, res) => {
  const { id, playerId } = req.params;

  const team = await Team.findById(id);
  if (!team) throw ApiError.notFound('Team not found');

  const deleted = await TournamentSquad.findOneAndDelete({ team: id, player: playerId });
  if (!deleted) throw ApiError.notFound('This player is not on this team\'s squad');

  res.json({ success: true, message: 'Player removed from squad' });
});

module.exports = { getSquad, addToSquad, removeFromSquad, getTournamentTakenPlayers };