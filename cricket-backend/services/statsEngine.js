/**
 * Statistics Engine
 * -----------------------------------------------------------------------
 * This is the single source of truth for turning ball-by-ball events into:
 *   1) Per-match BattingStats / BowlingStats / FieldingStats rows (scorecards)
 *   2) A continuously-aggregated CareerStats document per player that
 *      combines BOTH single matches and tournament matches.
 *
 * Design choice: rather than recomputing career totals from scratch on every
 * ball (expensive at scale), we update CareerStats incrementally using the
 * delta of each ball event. Derived fields that can't be computed as a simple
 * running delta (average, strike rate, "best figures") are recalculated from
 * the updated running totals on each write, which is O(1) per ball.
 * -----------------------------------------------------------------------
 */

const mongoose = require('mongoose');
const { BattingStats, BowlingStats, FieldingStats, CareerStats } = require('../models');

/**
 * Get-or-create the per-match batting/bowling stat row for a player.
 * `mode` and `tournament` are passed in so leaderboard queries can filter/
 * group without re-joining to Match every time.
 */
async function getOrCreateBattingRow({ player, match, innings, team, mode, tournament }) {
  let row = await BattingStats.findOne({ player, match, innings });
  if (!row) {
    row = await BattingStats.create({ player, match, innings, team, mode, tournament });
  }
  return row;
}

async function getOrCreateBowlingRow({ player, match, innings, team, mode, tournament }) {
  let row = await BowlingStats.findOne({ player, match, innings });
  if (!row) {
    row = await BowlingStats.create({ player, match, innings, team, mode, tournament });
  }
  return row;
}

async function getOrCreateFieldingRow({ player, match, team, mode, tournament }) {
  let row = await FieldingStats.findOne({ player, match });
  if (!row) {
    row = await FieldingStats.create({ player, match, team, mode, tournament });
  }
  return row;
}

async function getOrCreateCareerStats(player) {
  let stats = await CareerStats.findOne({ player });
  if (!stats) stats = await CareerStats.create({ player });
  return stats;
}

/**
 * Main entry point: called by the scoring service every time a ball is recorded.
 * `ball` is the saved Ball document; `context` carries match/innings/team/mode info.
 */
async function applyBallToStats(ball, context) {
  const { matchId, inningsId, battingTeamId, bowlingTeamId, mode, tournamentId } = context;

  // ---------- BATTING ----------
  const battingRow = await getOrCreateBattingRow({
    player: ball.striker,
    match: matchId,
    innings: inningsId,
    team: battingTeamId,
    mode,
    tournament: tournamentId,
  });

  const isLegalBatterBall = ball.extra.type !== 'wide'; // wides don't count as a ball faced
  if (isLegalBatterBall) {
    battingRow.ballsFaced += 1;
  }
  battingRow.runs += ball.runsScored;
  if (ball.isFour) battingRow.fours += 1;
  if (ball.isSix) battingRow.sixes += 1;

  if (ball.isWicket && String(ball.wicket.playerOut) === String(ball.striker)) {
    battingRow.isOut = true;
    battingRow.dismissalType = ball.wicket.dismissalType;
    if (ball.wicket.bowlerCredited) battingRow.bowlerOut = ball.bowler;
    if (ball.wicket.fielder) battingRow.fielderOut = ball.wicket.fielder;
  }
  await battingRow.save();

  // A run-out (or similar dismissal) can claim the NON-striker instead of the
  // striker — e.g. the striker hits the ball and the non-striker is run out
  // going for the run. That batsman's own BattingStats row must be updated too,
  // since it's a separate document from the striker's.
  if (ball.isWicket && String(ball.wicket.playerOut) !== String(ball.striker)) {
    const dismissedNonStrikerRow = await getOrCreateBattingRow({
      player: ball.wicket.playerOut,
      match: matchId,
      innings: inningsId,
      team: battingTeamId,
      mode,
      tournament: tournamentId,
    });
    dismissedNonStrikerRow.isOut = true;
    dismissedNonStrikerRow.dismissalType = ball.wicket.dismissalType;
    if (ball.wicket.fielder) dismissedNonStrikerRow.fielderOut = ball.wicket.fielder;
    // Run-outs (and similar) are never credited to the bowler, so bowlerOut is
    // intentionally left unset here.
    await dismissedNonStrikerRow.save();
  }

  // ---------- BOWLING ----------
  const bowlingRow = await getOrCreateBowlingRow({
    player: ball.bowler,
    match: matchId,
    innings: inningsId,
    team: bowlingTeamId,
    mode,
    tournament: tournamentId,
  });

  if (ball.isLegal) {
    bowlingRow.ballsBowled += 1;
    if (ball.totalRuns === 0) bowlingRow.dotBalls += 1;
  }
  if (ball.extra.type === 'wide') bowlingRow.wides += ball.extra.runs;
  if (ball.extra.type === 'no-ball') bowlingRow.noBalls += ball.extra.runs;

  // Runs conceded by the bowler = runs off the bat + wides + no-balls (NOT byes/leg-byes).
  const runsAgainstBowler =
    ball.runsScored + (ball.extra.type === 'wide' || ball.extra.type === 'no-ball' ? ball.extra.runs : 0);
  bowlingRow.runsConceded += runsAgainstBowler;

  if (ball.isWicket && ball.wicket.bowlerCredited) {
    bowlingRow.wickets += 1;
  }
  await bowlingRow.save();

  // ---------- FIELDING ----------
  if (ball.isWicket && ball.wicket.fielder) {
    const fieldingRow = await getOrCreateFieldingRow({
      player: ball.wicket.fielder,
      match: matchId,
      team: bowlingTeamId,
      mode,
      tournament: tournamentId,
    });

    if (ball.wicket.dismissalType === 'caught') fieldingRow.catches += 1;
    else if (ball.wicket.dismissalType === 'run-out') fieldingRow.runOuts += 1;
    else if (ball.wicket.dismissalType === 'stumped') fieldingRow.stumpings += 1;

    await fieldingRow.save();
  }

  return { battingRow, bowlingRow };
}

/**
 * Recompute and persist a single player's CareerStats by summing across ALL
 * of their BattingStats / BowlingStats / FieldingStats rows, irrespective of
 * `mode`. This is the function that satisfies the "combine single + tournament"
 * requirement: it never filters by mode, it always sums everything.
 *
 * Called: (a) incrementally after each ball for the players involved, and
 * (b) as a full recompute (idempotent) when a match is finalized, to correct
 * for any mid-match edits a scorer made.
 */
async function recomputeCareerStatsForPlayer(playerId) {
  // `.aggregate()` pipelines are sent to MongoDB as-is and do NOT get Mongoose's
  // automatic string -> ObjectId casting the way `.find()`/`.findOne()`/`.distinct()`
  // do. Callers here can legitimately pass either a string id (e.g. the live-scoring
  // path in recomputeCareerStatsForPlayers, which stringifies ids to dedupe them) or
  // a real ObjectId (e.g. seed.js), so normalize explicitly before any $match stage.
  const playerObjectId = new mongoose.Types.ObjectId(String(playerId));

  const [battingAgg] = await BattingStats.aggregate([
    { $match: { player: playerObjectId } },
    {
      $group: {
        _id: null,
        innings: { $sum: 1 },
        runs: { $sum: '$runs' },
        ballsFaced: { $sum: '$ballsFaced' },
        notOuts: { $sum: { $cond: ['$isOut', 0, 1] } },
        fours: { $sum: '$fours' },
        sixes: { $sum: '$sixes' },
        fifties: { $sum: { $cond: [{ $and: [{ $gte: ['$runs', 50] }, { $lt: ['$runs', 100] }] }, 1, 0] } },
        hundreds: { $sum: { $cond: [{ $gte: ['$runs', 100] }, 1, 0] } },
        ducks: { $sum: { $cond: [{ $and: ['$isOut', { $eq: ['$runs', 0] }] }, 1, 0] } },
      },
    },
  ]);

  const highestScoreRow = await BattingStats.findOne({ player: playerObjectId }).sort({ runs: -1 }).limit(1);

  const [bowlingAgg] = await BowlingStats.aggregate([
    { $match: { player: playerObjectId } },
    {
      $group: {
        _id: null,
        innings: { $sum: { $cond: [{ $gt: ['$ballsBowled', 0] }, 1, 0] } },
        ballsBowled: { $sum: '$ballsBowled' },
        runsConceded: { $sum: '$runsConceded' },
        wickets: { $sum: '$wickets' },
        maidens: { $sum: '$maidens' },
        dotBalls: { $sum: '$dotBalls' },
        threeWicketHauls: { $sum: { $cond: [{ $gte: ['$wickets', 3] }, 1, 0] } },
        fiveWicketHauls: { $sum: { $cond: [{ $gte: ['$wickets', 5] }, 1, 0] } },
      },
    },
  ]);

  const bestFiguresRow = await BowlingStats.findOne({ player: playerObjectId })
    .sort({ wickets: -1, runsConceded: 1 })
    .limit(1);

  const [fieldingAgg] = await FieldingStats.aggregate([
    { $match: { player: playerObjectId } },
    {
      $group: {
        _id: null,
        catches: { $sum: '$catches' },
        runOuts: { $sum: '$runOuts' },
        stumpings: { $sum: '$stumpings' },
      },
    },
  ]);

  const allMatchIds = await BattingStats.distinct('match', { player: playerObjectId });
  const allBowlingMatchIds = await BowlingStats.distinct('match', { player: playerObjectId });
  const allFieldingMatchIds = await FieldingStats.distinct('match', { player: playerObjectId });
  const matchesPlayed = new Set([
    ...allMatchIds.map(String),
    ...allBowlingMatchIds.map(String),
    ...allFieldingMatchIds.map(String),
  ]).size;

  // A player may appear in a match purely as a bowler/fielder (no batting row),
  // so single/tournament counts must be derived from the union of all three stat
  // types, not from BattingStats alone.
  const [singleBatting, singleBowling, singleFielding, tournamentBatting, tournamentBowling, tournamentFielding] =
    await Promise.all([
      BattingStats.distinct('match', { player: playerObjectId, mode: 'single' }),
      BowlingStats.distinct('match', { player: playerObjectId, mode: 'single' }),
      FieldingStats.distinct('match', { player: playerObjectId, mode: 'single' }),
      BattingStats.distinct('match', { player: playerObjectId, mode: 'tournament' }),
      BowlingStats.distinct('match', { player: playerObjectId, mode: 'tournament' }),
      FieldingStats.distinct('match', { player: playerObjectId, mode: 'tournament' }),
    ]);
  const singleCount = new Set(
    [...singleBatting, ...singleBowling, ...singleFielding].map(String)
  );
  const tournamentCount = new Set(
    [...tournamentBatting, ...tournamentBowling, ...tournamentFielding].map(String)
  );

  const batting = {
    innings: battingAgg?.innings || 0,
    runs: battingAgg?.runs || 0,
    ballsFaced: battingAgg?.ballsFaced || 0,
    notOuts: battingAgg?.notOuts || 0,
    highestScore: highestScoreRow?.runs || 0,
    highestScoreIsNotOut: highestScoreRow ? !highestScoreRow.isOut : false,
    highestScoreMatch: highestScoreRow?.match || null,
    fours: battingAgg?.fours || 0,
    sixes: battingAgg?.sixes || 0,
    fifties: battingAgg?.fifties || 0,
    hundreds: battingAgg?.hundreds || 0,
    ducks: battingAgg?.ducks || 0,
    average: 0,
    strikeRate: 0,
  };
  const dismissals = batting.innings - batting.notOuts;
  batting.average = dismissals > 0 ? Number((batting.runs / dismissals).toFixed(2)) : batting.runs;
  batting.strikeRate =
    batting.ballsFaced > 0 ? Number(((batting.runs / batting.ballsFaced) * 100).toFixed(2)) : 0;

  const bowling = {
    innings: bowlingAgg?.innings || 0,
    ballsBowled: bowlingAgg?.ballsBowled || 0,
    runsConceded: bowlingAgg?.runsConceded || 0,
    wickets: bowlingAgg?.wickets || 0,
    maidens: bowlingAgg?.maidens || 0,
    dotBalls: bowlingAgg?.dotBalls || 0,
    bestFigures: bestFiguresRow
      ? { wickets: bestFiguresRow.wickets, runs: bestFiguresRow.runsConceded, match: bestFiguresRow.match }
      : { wickets: 0, runs: 0, match: null },
    threeWicketHauls: bowlingAgg?.threeWicketHauls || 0,
    fiveWicketHauls: bowlingAgg?.fiveWicketHauls || 0,
    average: null,
    economy: 0,
    strikeRate: null,
  };
  bowling.average = bowling.wickets > 0 ? Number((bowling.runsConceded / bowling.wickets).toFixed(2)) : null;
  const oversBowledDecimal = bowling.ballsBowled / 6;
  bowling.economy = oversBowledDecimal > 0 ? Number((bowling.runsConceded / oversBowledDecimal).toFixed(2)) : 0;
  bowling.strikeRate =
    bowling.wickets > 0 ? Number((bowling.ballsBowled / bowling.wickets).toFixed(2)) : null;

  const fielding = {
    catches: fieldingAgg?.catches || 0,
    runOuts: fieldingAgg?.runOuts || 0,
    stumpings: fieldingAgg?.stumpings || 0,
  };

  const careerStats = await getOrCreateCareerStats(playerId);
  careerStats.matchesPlayed = matchesPlayed;
  careerStats.singleMatchesPlayed = singleCount.size;
  careerStats.tournamentMatchesPlayed = tournamentCount.size;
  careerStats.batting = batting;
  careerStats.bowling = bowling;
  careerStats.fielding = fielding;
  careerStats.lastUpdated = new Date();

  await careerStats.save();
  return careerStats;
}

/**
 * Convenience used by the live scoring socket handler: after each ball, only
 * recompute career stats for the small set of players actually involved
 * (striker, bowler, fielder) rather than every player in the system.
 */
async function recomputeCareerStatsForPlayers(playerIds) {
  const uniqueIds = [...new Set(playerIds.map(String))];
  const results = [];
  for (const id of uniqueIds) {
    results.push(await recomputeCareerStatsForPlayer(id));
  }
  return results;
}

module.exports = {
  applyBallToStats,
  recomputeCareerStatsForPlayer,
  recomputeCareerStatsForPlayers,
};