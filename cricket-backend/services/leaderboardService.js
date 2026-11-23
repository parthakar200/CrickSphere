/**
 * Leaderboard Service
 * -----------------------------------------------------------------------
 * Leaderboards read from CareerStats (rolled-up stats) or aggregate
 * per-match stats when a tournament or locality filter is active.
 * -----------------------------------------------------------------------
 */
const mongoose = require('mongoose');

const { CareerStats, BattingStats, BowlingStats, FieldingStats, Player, Match } = require('../models');

// Resolves the raw `team` ObjectId (grouped alongside the player) into a
// small { _id, name, shortName } object nested under player.team.
const resolveTeamStages = [
  {
    $lookup: {
      from: 'teams',
      localField: 'team',
      foreignField: '_id',
      as: '_team',
      pipeline: [{ $project: { name: 1, shortName: 1 } }],
    },
  },
  { $unwind: { path: '$_team', preserveNullAndEmptyArrays: true } },
  { $addFields: { 'player.team': { $ifNull: ['$_team', null] } } },
  { $project: { _team: 0, team: 0 } },
];

async function buildMatchFilter(tournamentId, localityId) {
  const filter = {};
  if (tournamentId) filter.tournament = new mongoose.Types.ObjectId(tournamentId);
  if (localityId) {
    const matchIds = await Match.find({ locality: localityId }).distinct('_id');
    filter.match = { $in: matchIds };
  }
  return filter;
}

async function getLocalityPlayerIds(localityId) {
  if (!localityId) return null;
  return Player.find({ locality: localityId }).distinct('_id');
}

// ---------------- BATTING ----------------

async function mostRuns({ tournamentId, localityId, limit = 50 }) {
  if (tournamentId || localityId) {
    const matchFilter = await buildMatchFilter(tournamentId, localityId);
    return BattingStats.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$player',
          team: { $last: '$team' },
          matches: { $addToSet: '$match' },
          innings: { $sum: 1 },
          runs: { $sum: '$runs' },
          ballsFaced: { $sum: '$ballsFaced' },
          highestScore: { $max: '$runs' },
          fours: { $sum: '$fours' },
          sixes: { $sum: '$sixes' },
          fifties: { $sum: { $cond: [{ $and: [{ $gte: ['$runs', 50] }, { $lt: ['$runs', 100] }] }, 1, 0] } },
          hundreds: { $sum: { $cond: [{ $gte: ['$runs', 100] }, 1, 0] } },
          notOuts: { $sum: { $cond: ['$isOut', 0, 1] } },
        },
      },
      { $addFields: { matches: { $size: '$matches' } } },
      { $sort: { runs: -1 } },
      { $limit: limit },
      { $lookup: { from: 'players', localField: '_id', foreignField: '_id', as: 'player' } },
      { $unwind: '$player' },
      ...resolveTeamStages,
    ]);
  }

  const rows = await CareerStats.find({ 'batting.runs': { $gt: 0 } })
    .sort({ 'batting.runs': -1 })
    .limit(limit)
    .populate('player', 'name photo');

  return rows;
}

async function bestStrikeRate({ tournamentId, localityId, minBalls = 30, limit = 50 }) {
  if (tournamentId || localityId) {
    const matchFilter = await buildMatchFilter(tournamentId, localityId);
    return BattingStats.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$player',
          runs: { $sum: '$runs' },
          ballsFaced: { $sum: '$ballsFaced' },
        },
      },
      { $match: { ballsFaced: { $gte: minBalls } } },
      { $addFields: { strikeRate: { $multiply: [{ $divide: ['$runs', '$ballsFaced'] }, 100] } } },
      { $sort: { strikeRate: -1 } },
      { $limit: limit },
      { $lookup: { from: 'players', localField: '_id', foreignField: '_id', as: 'player' } },
      { $unwind: '$player' },
    ]);
  }

  return CareerStats.find({ 'batting.ballsFaced': { $gte: minBalls } })
    .sort({ 'batting.strikeRate': -1 })
    .limit(limit)
    .populate('player', 'name photo team');
}

async function mostSixes({ tournamentId, localityId, limit = 50 }) {
  if (tournamentId || localityId) {
    const matchFilter = await buildMatchFilter(tournamentId, localityId);
    return BattingStats.aggregate([
      { $match: matchFilter },
      { $group: { _id: '$player', team: { $last: '$team' }, sixes: { $sum: '$sixes' } } },
      { $sort: { sixes: -1 } },
      { $limit: limit },
      { $lookup: { from: 'players', localField: '_id', foreignField: '_id', as: 'player' } },
      { $unwind: '$player' },
      ...resolveTeamStages,
    ]);
  }

  return CareerStats.find({ 'batting.sixes': { $gt: 0 } })
    .sort({ 'batting.sixes': -1 })
    .limit(limit)
    .populate('player', 'name photo team');
}

async function mostFours({ tournamentId, localityId, limit = 50 }) {
  if (tournamentId || localityId) {
    const matchFilter = await buildMatchFilter(tournamentId, localityId);
    return BattingStats.aggregate([
      { $match: matchFilter },
      { $group: { _id: '$player', team: { $last: '$team' }, fours: { $sum: '$fours' } } },
      { $sort: { fours: -1 } },
      { $limit: limit },
      { $lookup: { from: 'players', localField: '_id', foreignField: '_id', as: 'player' } },
      { $unwind: '$player' },
      ...resolveTeamStages,
    ]);
  }

  return CareerStats.find({ 'batting.fours': { $gt: 0 } })
    .sort({ 'batting.fours': -1 })
    .limit(limit)
    .populate('player', 'name photo team');
}

// ---------------- BOWLING ----------------

async function mostWickets({ tournamentId, localityId, limit = 50 }) {
  if (tournamentId || localityId) {
    const matchFilter = await buildMatchFilter(tournamentId, localityId);
    return BowlingStats.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$player',
          team: { $last: '$team' },
          matches: { $addToSet: '$match' },
          ballsBowled: { $sum: '$ballsBowled' },
          runsConceded: { $sum: '$runsConceded' },
          wickets: { $sum: '$wickets' },
        },
      },
      {
        $addFields: {
          matches: { $size: '$matches' },
          overs: { $divide: ['$ballsBowled', 6] },
          average: {
            $cond: [{ $gt: ['$wickets', 0] }, { $divide: ['$runsConceded', '$wickets'] }, null],
          },
          economy: {
            $cond: [
              { $gt: ['$ballsBowled', 0] },
              { $divide: ['$runsConceded', { $divide: ['$ballsBowled', 6] }] },
              0,
            ],
          },
        },
      },
      { $sort: { wickets: -1 } },
      { $limit: limit },
      { $lookup: { from: 'players', localField: '_id', foreignField: '_id', as: 'player' } },
      { $unwind: '$player' },
      ...resolveTeamStages,
    ]);
  }

  return CareerStats.find({ 'bowling.wickets': { $gt: 0 } })
    .sort({ 'bowling.wickets': -1 })
    .limit(limit)
    .populate('player', 'name photo team');
}

async function bestEconomy({ tournamentId, localityId, minOvers = 4, limit = 50 }) {
  const minBalls = minOvers * 6;

  if (tournamentId || localityId) {
    const matchFilter = await buildMatchFilter(tournamentId, localityId);
    return BowlingStats.aggregate([
      { $match: matchFilter },
      { $group: { _id: '$player', team: { $last: '$team' }, ballsBowled: { $sum: '$ballsBowled' }, runsConceded: { $sum: '$runsConceded' } } },
      { $match: { ballsBowled: { $gte: minBalls } } },
      {
        $addFields: {
          overs: { $divide: ['$ballsBowled', 6] },
          economy: { $divide: ['$runsConceded', { $divide: ['$ballsBowled', 6] }] },
        },
      },
      { $sort: { economy: 1 } },
      { $limit: limit },
      { $lookup: { from: 'players', localField: '_id', foreignField: '_id', as: 'player' } },
      { $unwind: '$player' },
      ...resolveTeamStages,
    ]);
  }

  return CareerStats.find({ 'bowling.ballsBowled': { $gte: minBalls } })
    .sort({ 'bowling.economy': 1 })
    .limit(limit)
    .populate('player', 'name photo team');
}

async function mostDotBalls({ tournamentId, localityId, minOvers = 0, limit = 50 }) {
  const minBalls = minOvers * 6;

  if (tournamentId || localityId) {
    const matchFilter = await buildMatchFilter(tournamentId, localityId);
    return BowlingStats.aggregate([
      { $match: matchFilter },
      { $group: { _id: '$player', team: { $last: '$team' }, ballsBowled: { $sum: '$ballsBowled' }, dotBalls: { $sum: '$dotBalls' } } },
      { $match: { ballsBowled: { $gte: minBalls } } },
      { $sort: { dotBalls: -1 } },
      { $limit: limit },
      { $lookup: { from: 'players', localField: '_id', foreignField: '_id', as: 'player' } },
      { $unwind: '$player' },
      ...resolveTeamStages,
    ]);
  }

  return CareerStats.find({ 'bowling.dotBalls': { $gt: 0 }, 'bowling.ballsBowled': { $gte: minBalls } })
    .sort({ 'bowling.dotBalls': -1 })
    .limit(limit)
    .populate('player', 'name photo');
}

async function bestBowlingAverage({ tournamentId, localityId, minWickets = 5, limit = 50 }) {
  if (tournamentId || localityId) {
    const matchFilter = await buildMatchFilter(tournamentId, localityId);
    return BowlingStats.aggregate([
      { $match: matchFilter },
      { $group: { _id: '$player', team: { $last: '$team' }, wickets: { $sum: '$wickets' }, runsConceded: { $sum: '$runsConceded' } } },
      { $match: { wickets: { $gte: minWickets } } },
      { $addFields: { average: { $divide: ['$runsConceded', '$wickets'] } } },
      { $sort: { average: 1 } },
      { $limit: limit },
      { $lookup: { from: 'players', localField: '_id', foreignField: '_id', as: 'player' } },
      { $unwind: '$player' },
      ...resolveTeamStages,
    ]);
  }

  return CareerStats.find({ 'bowling.wickets': { $gte: minWickets } })
    .sort({ 'bowling.average': 1 })
    .limit(limit)
    .populate('player', 'name photo team');
}

// ---------------- FIELDING ----------------

async function fieldingLeaderboard({ tournamentId, localityId, type, limit = 50 }) {
  if (tournamentId || localityId) {
    const matchFilter = await buildMatchFilter(tournamentId, localityId);
    return FieldingStats.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$player',
          team: { $last: '$team' },
          catches: { $sum: '$catches' },
          runOuts: { $sum: '$runOuts' },
          stumpings: { $sum: '$stumpings' },
        },
      },
      { $addFields: { total: { $add: ['$catches', '$runOuts', '$stumpings'] } } },
      { $sort: type === 'all' ? { total: -1 } : { [type]: -1 } },
      { $limit: limit },
      { $lookup: { from: 'players', localField: '_id', foreignField: '_id', as: 'player' } },
      { $unwind: '$player' },
      ...resolveTeamStages,
    ]);
  }

  const sortField =
    type === 'all'
      ? null
      : type === 'catches'
      ? { 'fielding.catches': -1 }
      : type === 'runOuts'
      ? { 'fielding.runOuts': -1 }
      : { 'fielding.stumpings': -1 };

  if (type === 'all') {
    return CareerStats.aggregate([
      {
        $addFields: {
          totalDismissals: { $add: ['$fielding.catches', '$fielding.runOuts', '$fielding.stumpings'] },
        },
      },
      { $match: { totalDismissals: { $gt: 0 } } },
      { $sort: { totalDismissals: -1 } },
      { $limit: limit },
      { $lookup: { from: 'players', localField: 'player', foreignField: '_id', as: 'player' } },
      { $unwind: '$player' },
    ]);
  }

  return CareerStats.find().sort(sortField).limit(limit).populate('player', 'name photo team');
}

module.exports = {
  mostRuns,
  bestStrikeRate,
  mostSixes,
  mostFours,
  mostWickets,
  bestEconomy,
  mostDotBalls,
  bestBowlingAverage,
  fieldingLeaderboard,
};
