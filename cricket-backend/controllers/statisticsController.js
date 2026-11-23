const mongoose = require('mongoose');
const { BattingStats, BowlingStats, Match, Team, Player } = require('../models');
const asyncHandler = require('../utils/asyncHandler');

// Helper to resolve match filters scoped by tournament and locality
async function buildMatchFilter(localityId, tournamentId) {
  const filter = {};
  if (tournamentId) {
    filter.tournament = new mongoose.Types.ObjectId(tournamentId);
  }
  if (localityId) {
    const matchIds = await Match.find({ locality: localityId }).distinct('_id');
    filter.match = { $in: matchIds };
  }
  return filter;
}

// GET /api/statistics/overview  -> global numbers for the Statistics Center landing page
const getOverview = asyncHandler(async (req, res) => {
  const locFilter = req.localityId ? { locality: req.localityId } : {};
  const [totalPlayers, totalTeams, totalMatches, completedMatches] = await Promise.all([
    Player.countDocuments({ isActive: true, ...locFilter }),
    Team.countDocuments({ isActive: true, ...locFilter }),
    Match.countDocuments({ ...locFilter }),
    Match.countDocuments({ status: 'completed', ...locFilter }),
  ]);

  let matchQuery = {};
  if (req.localityId) {
    const localityMatchIds = await Match.find({ locality: req.localityId }).distinct('_id');
    matchQuery = { match: { $in: localityMatchIds } };
  }

  const [runsAgg] = await BattingStats.aggregate([
    { $match: matchQuery },
    { $group: { _id: null, totalRuns: { $sum: '$runs' }, totalSixes: { $sum: '$sixes' }, totalFours: { $sum: '$fours' } } },
  ]);
  const [wicketsAgg] = await BowlingStats.aggregate([
    { $match: matchQuery },
    { $group: { _id: null, totalWickets: { $sum: '$wickets' } } },
  ]);

  res.json({
    success: true,
    data: {
      totalPlayers,
      totalTeams,
      totalMatches,
      completedMatches,
      totalRuns: runsAgg?.totalRuns || 0,
      totalSixes: runsAgg?.totalSixes || 0,
      totalFours: runsAgg?.totalFours || 0,
      totalWickets: wicketsAgg?.totalWickets || 0,
    },
  });
});

// GET /api/statistics/batting-analytics  -> chart-ready data: top scorers, run distribution, SR analysis
const getBattingAnalytics = asyncHandler(async (req, res) => {
  const matchFilter = await buildMatchFilter(req.localityId, req.query.tournament);

  const topRunScorers = await BattingStats.aggregate([
    { $match: matchFilter },
    { $group: { _id: '$player', runs: { $sum: '$runs' } } },
    { $sort: { runs: -1 } },
    { $limit: 10 },
    { $lookup: { from: 'players', localField: '_id', foreignField: '_id', as: 'player' } },
    { $unwind: '$player' },
    { $project: { _id: 0, player: '$player.name', runs: 1 } },
  ]);

  // Run distribution buckets: 0s, 1-25, 26-50, 51-100, 100+
  const runDistribution = await BattingStats.aggregate([
    { $match: matchFilter },
    {
      $bucket: {
        groupBy: '$runs',
        boundaries: [0, 1, 26, 51, 101, 1000],
        default: 'other',
        output: { count: { $sum: 1 } },
      },
    },
  ]);

  const strikeRateAnalysis = await BattingStats.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: '$player',
        totalRuns: { $sum: '$runs' },
        totalBalls: { $sum: '$ballsFaced' },
        innings: { $sum: 1 },
      },
    },
    { $match: { totalBalls: { $gte: 6 } } },
    { $addFields: { avgSR: { $multiply: [{ $divide: ['$totalRuns', '$totalBalls'] }, 100] } } },
    { $sort: { avgSR: -1 } },
    { $limit: 10 },
    { $lookup: { from: 'players', localField: '_id', foreignField: '_id', as: 'player' } },
    { $unwind: '$player' },
    { $project: { _id: 0, player: '$player.name', avgSR: { $round: ['$avgSR', 2] }, innings: 1 } },
  ]);

  res.json({ success: true, data: { topRunScorers, runDistribution, strikeRateAnalysis } });
});

// GET /api/statistics/bowling-analytics
const getBowlingAnalytics = asyncHandler(async (req, res) => {
  const matchFilter = await buildMatchFilter(req.localityId, req.query.tournament);

  const topWicketTakers = await BowlingStats.aggregate([
    { $match: matchFilter },
    { $group: { _id: '$player', wickets: { $sum: '$wickets' } } },
    { $sort: { wickets: -1 } },
    { $limit: 10 },
    { $lookup: { from: 'players', localField: '_id', foreignField: '_id', as: 'player' } },
    { $unwind: '$player' },
    { $project: { _id: 0, player: '$player.name', wickets: 1 } },
  ]);

  const economyAnalysis = await BowlingStats.aggregate([
    { $match: { ...matchFilter, ballsBowled: { $gte: 12 } } },
    { $group: { _id: '$player', avgEconomy: { $avg: '$economy' } } },
    { $sort: { avgEconomy: 1 } },
    { $limit: 10 },
    { $lookup: { from: 'players', localField: '_id', foreignField: '_id', as: 'player' } },
    { $unwind: '$player' },
    { $project: { _id: 0, player: '$player.name', avgEconomy: { $round: ['$avgEconomy', 2] } } },
  ]);

  const dotBallAnalysis = await BowlingStats.aggregate([
    { $match: matchFilter },
    { $group: { _id: '$player', dotBalls: { $sum: '$dotBalls' }, ballsBowled: { $sum: '$ballsBowled' } } },
    { $addFields: { dotBallPercentage: { $multiply: [{ $divide: ['$dotBalls', '$ballsBowled'] }, 100] } } },
    { $sort: { dotBalls: -1 } },
    { $limit: 10 },
    { $lookup: { from: 'players', localField: '_id', foreignField: '_id', as: 'player' } },
    { $unwind: '$player' },
    {
      $project: {
        _id: 0,
        player: '$player.name',
        dotBalls: 1,
        dotBallPercentage: { $round: ['$dotBallPercentage', 1] },
      },
    },
  ]);

  res.json({ success: true, data: { topWicketTakers, economyAnalysis, dotBallAnalysis } });
});

// GET /api/statistics/team-analytics
const getTeamAnalytics = asyncHandler(async (req, res) => {
  const matchFilter = await buildMatchFilter(req.localityId, req.query.tournament);

  const teamComparison = await BattingStats.aggregate([
    { $match: matchFilter },
    { $group: { _id: '$team', runs: { $sum: '$runs' }, fours: { $sum: '$fours' }, sixes: { $sum: '$sixes' } } },
    { $lookup: { from: 'teams', localField: '_id', foreignField: '_id', as: 'team' } },
    { $unwind: '$team' },
    { $project: { _id: 0, team: '$team.name', runs: 1, fours: 1, sixes: 1 } },
  ]);

  const matchQuery = { status: 'completed' };
  if (req.query.tournament) matchQuery.tournament = req.query.tournament;
  if (req.localityId) matchQuery.locality = req.localityId;

  const matches = await Match.find(matchQuery).select('teamA teamB result');

  const winTally = {};
  matches.forEach((m) => {
    if (m.result.winner) {
      const key = String(m.result.winner);
      winTally[key] = (winTally[key] || 0) + 1;
    }
  });

  const teamIds = Object.keys(winTally);
  const teams = await Team.find({ _id: { $in: teamIds } }).select('name');
  const winPercentage = teams.map((t) => {
    const teamMatches = matches.filter((m) => String(m.teamA) === String(t._id) || String(m.teamB) === String(t._id));
    const wins = winTally[String(t._id)] || 0;
    return {
      team: t.name,
      wins,
      played: teamMatches.length,
      winPercentage: teamMatches.length > 0 ? Number(((wins / teamMatches.length) * 100).toFixed(1)) : 0,
    };
  });

  res.json({ success: true, data: { teamComparison, winPercentage } });
});

module.exports = { getOverview, getBattingAnalytics, getBowlingAnalytics, getTeamAnalytics };
