
const { Match, Innings, Team, PointsTable, Tournament, BattingStats, BowlingStats, Player, TournamentSquad } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { parseQueryOptions, buildPaginatedResponse } = require('../utils/queryHelpers');
const { recomputeCareerStatsForPlayers } = require('../services/statsEngine');

// POST /api/matches
const createMatch = asyncHandler(async (req, res) => {
  const {
    name,
    mode,
    tournament,
    stage,
    teamA,
    teamB,
    matchType,
    overs,
    ballsPerOver,
    venue,
    scheduledAt,
  } = req.body;

  if (String(teamA) === String(teamB)) {
    throw ApiError.badRequest('teamA and teamB must be different teams');
  }

  const [teamADoc, teamBDoc] = await Promise.all([Team.findById(teamA), Team.findById(teamB)]);
  if (!teamADoc || !teamBDoc) throw ApiError.notFound('One or both teams not found');

  const match = await Match.create({
    name,
    mode,
    tournament: mode === 'tournament' ? tournament : null,
    stage: stage || 'league',
    teamA,
    teamB,
    matchType,
    overs,
    ballsPerOver: ballsPerOver || 6,
    venue,
    scheduledAt: scheduledAt || new Date(),
    locality: req.body.locality || req.user?.locality || req.localityId,
    createdBy: req.user._id,
    scorers: [req.user._id],
  });

  if (mode === 'tournament' && tournament) {
    await Tournament.findByIdAndUpdate(tournament, { $addToSet: { teams: { $each: [teamA, teamB] } } });
    await Team.updateMany({ _id: { $in: [teamA, teamB] }, tournament: null }, { tournament });
    for (const tid of [teamA, teamB]) {
      await PointsTable.findOneAndUpdate(
        { tournament, team: tid },
        { $setOnInsert: { tournament, team: tid } },
        { upsert: true }
      );
    }
  }

  res.status(201).json({ success: true, data: match });
});

// GET /api/matches
const getMatches = asyncHandler(async (req, res) => {
  const { skip, limit, sort, page } = parseQueryOptions(req.query, { defaultSort: '-scheduledAt' });

  const filter = {};
  if (req.query.mode) filter.mode = req.query.mode;
  if (req.query.tournament) filter.tournament = req.query.tournament;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.team) filter.$or = [{ teamA: req.query.team }, { teamB: req.query.team }];
  if (req.localityId) filter.locality = req.localityId;

  const [matches, total] = await Promise.all([
    Match.find(filter)
      .populate('teamA', 'name shortName logo')
      .populate('teamB', 'name shortName logo')
      .populate('tournament', 'name')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Match.countDocuments(filter),
  ]);

  res.json(buildPaginatedResponse(matches, total, page, limit));
});

// GET /api/matches/:id
const getMatchById = asyncHandler(async (req, res) => {
  const match = await Match.findById(req.params.id)
    .populate('teamA', 'name shortName logo')
    .populate('teamB', 'name shortName logo')
    .populate('tournament', 'name')
    .populate('teamAPlayingXI', 'name role photo jerseyNumber battingStyle bowlingStyle')
    .populate('teamBPlayingXI', 'name role photo jerseyNumber battingStyle bowlingStyle')
    .populate({
      path: 'innings',
      populate: { path: 'currentStrikerBatsman currentNonStrikerBatsman currentBowler', select: 'name' },
    })
    .lean();

  if (!match) throw ApiError.notFound('Match not found');
  res.json({ success: true, data: match });
});

// GET /api/matches/:id/eligible-players
// Who CAN be picked for each side's Playing XI in this match — the pool
// differs by mode, so the frontend doesn't need to know the rule itself:
//   - 'tournament' matches: each side's pool is that team's TournamentSquad
//     for this tournament (their registered, exclusive-to-this-tournament
//     roster).
//   - 'single' matches: no squad concept exists at all — the pool is every
//     active player in the system, for BOTH sides equally. The "can't play
//     for the team you're facing" rule isn't enforced by narrowing this
//     pool; it's enforced at save time in setPlayingXI below, by rejecting
//     any player who appears in both submitted lists.
const getEligiblePlayers = asyncHandler(async (req, res) => {
  const match = await Match.findById(req.params.id);
  if (!match) throw ApiError.notFound('Match not found');

  if (match.mode === 'tournament') {
    const [squadA, squadB] = await Promise.all([
      TournamentSquad.find({ team: match.teamA }).populate(
        'player',
        'name role photo jerseyNumber battingStyle bowlingStyle'
      ),
      TournamentSquad.find({ team: match.teamB }).populate(
        'player',
        'name role photo jerseyNumber battingStyle bowlingStyle'
      ),
    ]);
    return res.json({
      success: true,
      data: {
        teamA: squadA.map((s) => s.player),
        teamB: squadB.map((s) => s.player),
      },
    });
  }

  const allActivePlayers = await Player.find({ isActive: true, ...(req.localityId ? { locality: req.localityId } : {}) })
    .select('name role photo jerseyNumber battingStyle bowlingStyle')
    .sort('name');

  res.json({ success: true, data: { teamA: allActivePlayers, teamB: allActivePlayers } });
});

// PATCH /api/matches/:id/playing-xi  { teamAPlayingXI: [playerId...], teamBPlayingXI: [playerId...] }
const setPlayingXI = asyncHandler(async (req, res) => {
  const { teamAPlayingXI, teamBPlayingXI } = req.body;

  const match = await Match.findById(req.params.id);
  if (!match) throw ApiError.notFound('Match not found');
  if (match.status !== 'scheduled' && match.status !== 'toss') {
    throw ApiError.badRequest('Playing XI can only be set before the toss');
  }

  const idsA = teamAPlayingXI.map(String);
  const idsB = teamBPlayingXI.map(String);

  // A player can never appear on both sides of the SAME match — the one
  // rule that's identical for single and tournament matches alike.
  const overlap = idsA.filter((id) => idsB.includes(id));
  if (overlap.length > 0) {
    throw ApiError.badRequest('The same player cannot appear in both teams\' Playing XI for one match');
  }

  if (match.mode === 'tournament') {
    const [squadA, squadB] = await Promise.all([
      TournamentSquad.find({ team: match.teamA }).select('player'),
      TournamentSquad.find({ team: match.teamB }).select('player'),
    ]);
    const squadAIds = new Set(squadA.map((s) => String(s.player)));
    const squadBIds = new Set(squadB.map((s) => String(s.player)));

    const invalidA = idsA.filter((id) => !squadAIds.has(id));
    const invalidB = idsB.filter((id) => !squadBIds.has(id));
    if (invalidA.length > 0 || invalidB.length > 0) {
      throw ApiError.badRequest('Every selected player must be registered to that team\'s squad for this tournament');
    }
  } else {
    const allIds = [...idsA, ...idsB];
    const activeCount = await Player.countDocuments({ _id: { $in: allIds }, isActive: true });
    if (activeCount !== allIds.length) {
      throw ApiError.badRequest('One or more selected players could not be found or are inactive');
    }
  }

  match.teamAPlayingXI = idsA;
  match.teamBPlayingXI = idsB;
  await match.save();

  const populated = await Match.findById(match._id)
    .populate('teamAPlayingXI', 'name role photo jerseyNumber battingStyle bowlingStyle')
    .populate('teamBPlayingXI', 'name role photo jerseyNumber battingStyle bowlingStyle');

  res.json({ success: true, data: populated });
});

// POST /api/matches/:id/toss
const setToss = asyncHandler(async (req, res) => {
  const { winner, decision } = req.body;

  const match = await Match.findById(req.params.id);
  if (!match) throw ApiError.notFound('Match not found');

  if (match.teamAPlayingXI.length === 0 || match.teamBPlayingXI.length === 0) {
    throw ApiError.badRequest('Both teams\' Playing XI must be set before the toss');
  }

  if (![String(match.teamA), String(match.teamB)].includes(String(winner))) {
    throw ApiError.badRequest('Toss winner must be one of the two playing teams');
  }

  match.toss = { winner, decision };
  match.status = 'live';
  await match.save();

  const battingTeam =
    decision === 'bat' ? winner : String(winner) === String(match.teamA) ? match.teamB : match.teamA;
  const bowlingTeam = String(battingTeam) === String(match.teamA) ? match.teamB : match.teamA;

  const innings1 = await Innings.create({
    match: match._id,
    inningsNumber: 1,
    battingTeam,
    bowlingTeam,
  });

  match.innings.push(innings1._id);
  match.currentInnings = 1;
  await match.save();

  res.json({ success: true, data: { match, currentInnings: innings1 } });
});

// POST /api/matches/:id/start-next-innings
const startNextInnings = asyncHandler(async (req, res) => {
  const match = await Match.findById(req.params.id).populate('innings');
  if (!match) throw ApiError.notFound('Match not found');

  const lastInnings = match.innings[match.innings.length - 1];
  if (!lastInnings) throw ApiError.badRequest('No prior innings found; run the toss first');
  if (!lastInnings.isCompleted) throw ApiError.badRequest('Current innings has not been completed yet');

  const nextInningsNumber = lastInnings.inningsNumber + 1;
  const battingTeam = lastInnings.bowlingTeam;
  const bowlingTeam = lastInnings.battingTeam;

  const newInnings = await Innings.create({
    match: match._id,
    inningsNumber: nextInningsNumber,
    battingTeam,
    bowlingTeam,
    target: nextInningsNumber === 2 ? lastInnings.totalRuns + 1 : null,
  });

  match.innings.push(newInnings._id);
  match.currentInnings = nextInningsNumber;
  match.status = 'live';
  await match.save();

  res.json({ success: true, data: { match, currentInnings: newInnings } });
});

// GET /api/matches/:id/live  -> Cricbuzz-style live scorecard payload
const getLiveScorecard = asyncHandler(async (req, res) => {
  const match = await Match.findById(req.params.id)
    .populate('teamA', 'name shortName logo')
    .populate('teamB', 'name shortName logo')
    .populate('teamAPlayingXI', 'name role photo jerseyNumber battingStyle bowlingStyle')
    .populate('teamBPlayingXI', 'name role photo jerseyNumber battingStyle bowlingStyle')
    .populate({
      path: 'innings',
      populate: [
        { path: 'battingTeam', select: 'name shortName logo' },
        { path: 'bowlingTeam', select: 'name shortName logo' },
        { path: 'currentStrikerBatsman', select: 'name' },
        { path: 'currentNonStrikerBatsman', select: 'name' },
        { path: 'currentBowler', select: 'name' },
        {
          path: 'overs',
          populate: { path: 'balls', options: { sort: { createdAt: 1 } } },
        },
      ],
    });

  if (!match) throw ApiError.notFound('Match not found');

  const currentInnings = match.innings[match.innings.length - 1];

  let runRate = 0;
  let requiredRunRate = null;
  if (currentInnings && currentInnings.totalBalls > 0) {
    const oversFaced = currentInnings.totalBalls / match.ballsPerOver;
    runRate = Number((currentInnings.totalRuns / oversFaced).toFixed(2));

    if (currentInnings.target) {
      const ballsRemaining = match.overs * match.ballsPerOver - currentInnings.totalBalls;
      const runsNeeded = currentInnings.target - currentInnings.totalRuns;
      if (ballsRemaining > 0) {
        requiredRunRate = Number(((runsNeeded / ballsRemaining) * match.ballsPerOver).toFixed(2));
      }
    }
  }

  const allBalls = (currentInnings?.overs || []).flatMap((o) => o.balls);
  const recentBalls = allBalls.slice(-12);

  const activePartnership = currentInnings?.partnerships.find((p) => p.isActive) || null;

  const battingStats = currentInnings
    ? await BattingStats.find({ innings: currentInnings._id })
        .select('player runs ballsFaced fours sixes strikeRate isOut')
        .lean()
    : [];

  res.json({
    success: true,
    data: {
      match,
      currentInnings,
      runRate,
      requiredRunRate,
      recentBalls,
      activePartnership,
      battingStats,
    },
  });
});

// GET /api/matches/:id/scorecard
const getMatchScorecard = asyncHandler(async (req, res) => {
  const match = await Match.findById(req.params.id)
    .populate('teamA', 'name shortName logo')
    .populate('teamB', 'name shortName logo')
    .populate({
      path: 'innings',
      populate: [
        { path: 'battingTeam', select: 'name shortName logo' },
        { path: 'bowlingTeam', select: 'name shortName logo' },
      ],
    });

  if (!match) throw ApiError.notFound('Match not found');

  const inningsList = match.innings;

  const innings = await Promise.all(
    inningsList.map(async (inn) => {
      const [battingStats, bowlingStats] = await Promise.all([
        BattingStats.find({ innings: inn._id })
          .populate('player', 'name')
          .populate('bowlerOut', 'name')
          .populate('fielderOut', 'name')
          .select('player runs ballsFaced fours sixes strikeRate isOut dismissalType bowlerOut fielderOut battingPosition')
          .sort({ battingPosition: 1 })
          .lean(),
        BowlingStats.find({ innings: inn._id })
          .populate('player', 'name')
          .select('player oversBowled maidens runsConceded wickets economy dotBalls wides noBalls')
          .lean(),
      ]);

      return {
        _id: inn._id,
        inningsNumber: inn.inningsNumber,
        battingTeam: inn.battingTeam,
        bowlingTeam: inn.bowlingTeam,
        totalRuns: inn.totalRuns,
        totalWickets: inn.totalWickets,
        totalOvers: inn.totalOvers,
        extras: inn.extras,
        fallOfWickets: inn.fallOfWickets,
        isCompleted: inn.isCompleted,
        battingStats,
        bowlingStats,
      };
    })
  );

  res.json({
    success: true,
    data: {
      match,
      innings,
    },
  });
});

// Internal helper: updates PointsTable rows + NRR after a tournament match completes.
async function updatePointsTableForMatch(match) {
  const tournament = await Tournament.findById(match.tournament);
  if (!tournament) return;

  const [inningsA, inningsB] = match.innings;
  if (!inningsA || !inningsB) return;

  const teamARow = await PointsTable.findOne({ tournament: tournament._id, team: match.teamA });
  const teamBRow = await PointsTable.findOne({ tournament: tournament._id, team: match.teamB });
  if (!teamARow || !teamBRow) return;

  const aBatted = String(inningsA.battingTeam) === String(match.teamA) ? inningsA : inningsB;
  const aBowled = String(inningsA.bowlingTeam) === String(match.teamA) ? inningsA : inningsB;
  const bBatted = String(inningsA.battingTeam) === String(match.teamB) ? inningsA : inningsB;
  const bBowled = String(inningsA.bowlingTeam) === String(match.teamB) ? inningsA : inningsB;

  teamARow.played += 1;
  teamBRow.played += 1;

  teamARow.runsScored += aBatted.totalRuns;
  teamARow.oversFaced += aBatted.totalOvers;
  teamARow.runsConceded += aBowled.totalRuns;
  teamARow.oversBowled += aBowled.totalOvers;

  teamBRow.runsScored += bBatted.totalRuns;
  teamBRow.oversFaced += bBatted.totalOvers;
  teamBRow.runsConceded += bBowled.totalRuns;
  teamBRow.oversBowled += bBowled.totalOvers;

  const { win, tie, loss, noResult } = tournament.pointsSystem;

  if (match.result.isNoResult) {
    teamARow.noResult += 1;
    teamBRow.noResult += 1;
    teamARow.points += noResult;
    teamBRow.points += noResult;
  } else if (match.result.isTie) {
    teamARow.tied += 1;
    teamBRow.tied += 1;
    teamARow.points += tie;
    teamBRow.points += tie;
  } else if (match.result.winner) {
    const winnerIsA = String(match.result.winner) === String(match.teamA);
    if (winnerIsA) {
      teamARow.won += 1;
      teamBRow.lost += 1;
      teamARow.points += win;
      teamBRow.points += loss;
    } else {
      teamBRow.won += 1;
      teamARow.lost += 1;
      teamBRow.points += win;
      teamARow.points += loss;
    }
  }

  const computeNrr = (row) => {
    const scoreRate = row.oversFaced > 0 ? row.runsScored / row.oversFaced : 0;
    const concedeRate = row.oversBowled > 0 ? row.runsConceded / row.oversBowled : 0;
    return Number((scoreRate - concedeRate).toFixed(3));
  };
  teamARow.netRunRate = computeNrr(teamARow);
  teamBRow.netRunRate = computeNrr(teamBRow);

  await Promise.all([teamARow.save(), teamBRow.save()]);

  const allRows = await PointsTable.find({ tournament: tournament._id }).sort({
    points: -1,
    netRunRate: -1,
  });
  await Promise.all(allRows.map((row, idx) => PointsTable.updateOne({ _id: row._id }, { position: idx + 1 })));
}

// POST /api/matches/:id/complete
const completeMatch = asyncHandler(async (req, res) => {
  const { winner, winMargin, isTie, isNoResult, playerOfTheMatch } = req.body;

  const match = await Match.findById(req.params.id).populate('innings');
  if (!match) throw ApiError.notFound('Match not found');

  match.status = 'completed';
  match.result = {
    winner: winner || null,
    winMargin,
    isTie: !!isTie,
    isNoResult: !!isNoResult,
    playerOfTheMatch,
  };
  match.innings.forEach((inn) => {
    inn.isCompleted = true;
  });
  await Promise.all(match.innings.map((inn) => inn.save()));
  await match.save();

  if (match.mode === 'tournament' && match.tournament) {
    await updatePointsTableForMatch(match);
  }

  const allInningsPlayers = new Set();
  for (const inn of match.innings) {
    if (inn.currentStrikerBatsman) allInningsPlayers.add(String(inn.currentStrikerBatsman));
    if (inn.currentNonStrikerBatsman) allInningsPlayers.add(String(inn.currentNonStrikerBatsman));
    if (inn.currentBowler) allInningsPlayers.add(String(inn.currentBowler));
  }
  await recomputeCareerStatsForPlayers([...allInningsPlayers]);

  res.json({ success: true, data: match });
});

// POST /api/matches/:id/reopen
const reopenMatch = asyncHandler(async (req, res) => {
  const match = await Match.findById(req.params.id);
  if (!match) throw ApiError.notFound('Match not found');
  if (match.status !== 'completed') {
    throw ApiError.badRequest('Only a completed match can be reopened');
  }

  match.status = 'live';
  match.result = {
    winner: null,
    winMargin: null,
    isTie: false,
    isNoResult: false,
    playerOfTheMatch: match.result.playerOfTheMatch,
  };
  await match.save();

  res.json({ success: true, data: match });
});

module.exports = {
  createMatch,
  getMatches,
  getMatchById,
  getEligiblePlayers,
  setPlayingXI,
  setToss,
  startNextInnings,
  getLiveScorecard,
  getMatchScorecard,
  completeMatch,
  reopenMatch,
};