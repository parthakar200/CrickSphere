/**
 * Scoring Service
 * -----------------------------------------------------------------------
 * Orchestrates a single ball event end-to-end:
 *   1) Validate match/innings state
 *   2) Create the Ball document
 *   3) Update/Create the current Over
 *   4) Update Innings running totals, partnerships, fall of wickets
 *   5) Delegate to the Stats Engine to update Batting/Bowling/Fielding rows
 *   6) Incrementally refresh CareerStats for the players involved
 *
 * This is the function the Socket.IO live-scoring layer calls on every
 * delivery, and it's also what a REST "record ball" endpoint would call for
 * non-realtime / backfilled scoring.
 * -----------------------------------------------------------------------
 */

const { Match, Innings, Over, Ball, BattingStats, BowlingStats, FieldingStats } = require('../models');
const ApiError = require('../utils/ApiError');
const { applyBallToStats, recomputeCareerStatsForPlayers } = require('./statsEngine');

async function recordBall({ matchId, inningsId, payload, scoredByUserId }) {
  const match = await Match.findById(matchId);
  if (!match) throw ApiError.notFound('Match not found');

  const innings = await Innings.findById(inningsId);
  if (!innings) throw ApiError.notFound('Innings not found');
  if (innings.isCompleted) throw ApiError.badRequest('This innings has already been completed');
  if (String(innings.match) !== String(matchId)) {
    throw ApiError.badRequest('This innings does not belong to the specified match');
  }

  const {
    striker,
    nonStriker,
    bowler,
    runsScored = 0,
    extraType = 'none',
    extraRuns = 0,
    isWicket = false,
    wicket = {},
    wagonWheel = {},
    commentary = '',
  } = payload;

  if (!striker || !nonStriker || !bowler) {
    throw ApiError.badRequest('striker, nonStriker, and bowler are all required');
  }
  if (String(striker) === String(nonStriker)) {
    throw ApiError.badRequest('striker and nonStriker must be different players');
  }
  if (String(bowler) === String(striker) || String(bowler) === String(nonStriker)) {
    throw ApiError.badRequest('bowler cannot also be a batsman on strike in this delivery');
  }
  if (runsScored < 0 || runsScored > 6) {
    throw ApiError.badRequest('runsScored must be between 0 and 6');
  }
  if (extraRuns < 0) {
    throw ApiError.badRequest('extraRuns cannot be negative');
  }

  const maxLegalBalls = match.overs * match.ballsPerOver;
  if (innings.totalBalls >= maxLegalBalls) {
    throw ApiError.badRequest('This innings has already bowled its full quota of overs');
  }
  if (innings.totalWickets >= 10) {
    throw ApiError.badRequest('This innings is already all out');
  }

  const isLegal = extraType !== 'wide' && extraType !== 'no-ball';

  // Determine over number / ball-in-over from innings.totalBalls (legal balls only).
  const legalBallsSoFar = innings.totalBalls;
  const overNumber = Math.floor(legalBallsSoFar / match.ballsPerOver) + 1;
  const ballNumberInOver = (legalBallsSoFar % match.ballsPerOver) + 1;

  // Get or create the Over document for this overNumber.
  let over = await Over.findOne({ innings: innings._id, overNumber });
  if (!over) {
    over = await Over.create({ innings: innings._id, overNumber, bowler });
    innings.overs.push(over._id);
  }

  const totalRuns = runsScored + extraRuns;
  const isFour = runsScored === 4 && extraType === 'none';
  const isSix = runsScored === 6 && extraType === 'none';
  const isDotBall = totalRuns === 0;

  const ball = await Ball.create({
    match: matchId,
    innings: inningsId,
    over: over._id,
    overNumber,
    ballNumberInOver, // wides/no-balls reuse the same slot as the next legal delivery
    striker,
    nonStriker,
    bowler,
    runsScored,
    isLegal,
    extra: { type: extraType, runs: extraRuns },
    isWicket,
    wicket: isWicket
      ? {
          dismissalType: wicket.dismissalType || 'none',
          playerOut: wicket.playerOut || striker,
          fielder: wicket.fielder || null,
          bowlerCredited: wicket.bowlerCredited !== false,
        }
      : undefined,
    isFour,
    isSix,
    isDotBall,
    totalRuns,
    commentary,
    wagonWheel,
    scoredBy: scoredByUserId,
  });

  // ---- Update Over ----
  over.balls.push(ball._id);
  over.runsConceded += totalRuns;
  if (isWicket && ball.wicket.bowlerCredited) over.wicketsTaken += 1;
  if (isLegal && ballNumberInOver >= match.ballsPerOver) {
    over.isCompleted = true;
    over.isMaiden = over.runsConceded === 0;
  }
  await over.save();

  // ---- Update Innings ----
  innings.totalRuns += totalRuns;
  if (isLegal) innings.totalBalls += 1;
  innings.totalOvers = Number(
    (Math.floor(innings.totalBalls / match.ballsPerOver) + (innings.totalBalls % match.ballsPerOver) / 10).toFixed(1)
  );

  if (extraType === 'wide') innings.extras.wides += extraRuns;
  if (extraType === 'no-ball') innings.extras.noBalls += extraRuns;
  if (extraType === 'bye') innings.extras.byes += extraRuns;
  if (extraType === 'leg-bye') innings.extras.legByes += extraRuns;
  if (extraType === 'penalty') innings.extras.penalty += extraRuns;

  if (isWicket) {
    innings.totalWickets += 1;
    innings.fallOfWickets.push({
      wicketNumber: innings.totalWickets,
      score: innings.totalRuns,
      overs: innings.totalOvers,
      playerOut: ball.wicket.playerOut,
      dismissalType: ball.wicket.dismissalType,
    });

    // Close the active partnership.
    const activePartnership = innings.partnerships.find((p) => p.isActive);
    if (activePartnership) {
      activePartnership.isActive = false;
      activePartnership.endOver = innings.totalOvers;
    }
  }

  // Update / create the active partnership with this ball's runs (only batter runs count toward partnership).
  let activePartnership = innings.partnerships.find((p) => p.isActive);
  if (!activePartnership) {
    activePartnership = {
      batsman1: striker,
      batsman2: nonStriker,
      runs: 0,
      balls: 0,
      startOver: innings.totalOvers,
      isActive: true,
    };
    innings.partnerships.push(activePartnership);
    activePartnership = innings.partnerships[innings.partnerships.length - 1];
  }
  activePartnership.runs += runsScored + (extraType === 'bye' || extraType === 'leg-bye' ? extraRuns : 0);
  if (isLegal) activePartnership.balls += 1;

  innings.currentStrikerBatsman = striker;
  innings.currentNonStrikerBatsman = nonStriker;
  innings.currentBowler = bowler;

  // ---- Automatic strike rotation ----
  // Runs that move the batsmen between ends: runs off the bat, plus byes/leg-byes
  // (the batsmen still run for those). Wides/no-ball-extra-runs alone do not move
  // the batsmen (only any runs actually run on a no-ball, captured in runsScored, do).
  const runsThatRotateStrike =
    runsScored + (extraType === 'bye' || extraType === 'leg-bye' ? extraRuns : 0);
  const oddRunsRotate = runsThatRotateStrike % 2 === 1;
  const overJustCompleted = isLegal && ballNumberInOver >= match.ballsPerOver;

  if (oddRunsRotate) {
    const temp = innings.currentStrikerBatsman;
    innings.currentStrikerBatsman = innings.currentNonStrikerBatsman;
    innings.currentNonStrikerBatsman = temp;
  }
  // End-of-over rotation happens independently of (and after accounting for) the
  // odd-runs swap above, since both can apply on the same ball (e.g. a single on
  // the last ball of the over still results in a net rotation for the new over).
  if (overJustCompleted) {
    const temp = innings.currentStrikerBatsman;
    innings.currentStrikerBatsman = innings.currentNonStrikerBatsman;
    innings.currentNonStrikerBatsman = temp;
  }

  await innings.save();

  // ---- Auto-detect innings completion (all out, full quota of overs bowled,
  // or — for a chasing team — the target has been reached) ----
  // This does NOT auto-create the next innings or mark the Match completed — that
  // remains an explicit admin/scorer action (POST /start-next-innings or /complete),
  // since a Test match can also end via declaration, which only a human can decide.
  let inningsJustCompleted = false;
  const targetReached = innings.target != null && innings.totalRuns >= innings.target;
  if (innings.totalWickets >= 10 || innings.totalBalls >= maxLegalBalls || targetReached) {
    innings.isCompleted = true;
    inningsJustCompleted = true;
    await innings.save();
  }

  // ---- Stats Engine ----
  const battingTeamId = innings.battingTeam;
  const bowlingTeamId = innings.bowlingTeam;

  await applyBallToStats(ball, {
    matchId,
    inningsId,
    battingTeamId,
    bowlingTeamId,
    mode: match.mode,
    tournamentId: match.tournament,
  });

  const involvedPlayers = [striker, bowler];
  if (isWicket && ball.wicket.fielder) involvedPlayers.push(ball.wicket.fielder);
  if (isWicket && ball.wicket.playerOut) involvedPlayers.push(ball.wicket.playerOut);
  await recomputeCareerStatsForPlayers(involvedPlayers);

  return { ball, over, innings, inningsJustCompleted };
}

/**
 * Manual strike-rotation override. `recordBall` above already rotates strike
 * automatically based on runs scored and over completion — do NOT call this
 * after every ball, or you'll double-rotate. This exists only for a scorer
 * to correct a mistake (e.g. they marked the wrong batsman as on strike).
 */
async function rotateStrike(inningsId) {
  const innings = await Innings.findById(inningsId);
  if (!innings) throw ApiError.notFound('Innings not found');

  const temp = innings.currentStrikerBatsman;
  innings.currentStrikerBatsman = innings.currentNonStrikerBatsman;
  innings.currentNonStrikerBatsman = temp;
  await innings.save();
  return innings;
}

// In-memory per-innings lock so a concurrent recordBall call for the SAME
// innings can't interleave with an undo's delete-then-replay sequence and
// corrupt the rebuild. Single-process scope only (a multi-instance
// deployment would need a DB-level lock instead, e.g. a status flag on the
// Innings document). Deliberately NOT checked inside recordBall() itself —
// undoLastBall's own replay loop calls recordBall() directly while holding
// this lock, and recordBall() rejecting on that account would deadlock the
// very undo that's holding it. Instead, EXTERNAL entry points (the
// Socket.IO handler, the REST scoring controller) call isInningsLocked()
// themselves before invoking recordBall(), so the lock only ever blocks
// callers outside of undoLastBall.
const inningsLocks = new Set();

function isInningsLocked(inningsId) {
  return inningsLocks.has(String(inningsId));
}

function withInningsLock(inningsId, fn) {
  const key = String(inningsId);
  if (inningsLocks.has(key)) {
    throw ApiError.badRequest('Another scoring action is in progress for this innings — try again in a moment');
  }
  inningsLocks.add(key);
  return Promise.resolve()
    .then(fn)
    .finally(() => inningsLocks.delete(key));
}

/**
 * Undoes the single most recently recorded ball for an innings.
 *
 * Implementation: rather than hand-writing a reverse of every side effect
 * recordBall() has (over/innings totals, partnerships, fall of wickets,
 * strike rotation, per-match stats), which would be a second, separately
 * maintained mirror-image of that logic and easy to let drift out of sync
 * with it over time, this REPLAYS every ball except the last one through
 * recordBall() itself from a clean slate. That makes undo correct by
 * construction: the resulting state is always exactly what recordBall()
 * would have produced for that shorter sequence, because it's the same
 * code path, not a re-implementation of it.
 */
async function undoLastBall({ matchId, inningsId, scoredByUserId }) {
  return withInningsLock(inningsId, async () => {
    const innings = await Innings.findById(inningsId);
    if (!innings) throw ApiError.notFound('Innings not found');
    if (String(innings.match) !== String(matchId)) {
      throw ApiError.badRequest('This innings does not belong to the specified match');
    }

    const allBalls = await Ball.find({ innings: inningsId }).sort({ createdAt: 1 });
    if (allBalls.length === 0) {
      throw ApiError.badRequest('There are no balls recorded for this innings yet');
    }

    const undoneBall = allBalls[allBalls.length - 1];
    const ballsToReplay = allBalls.slice(0, -1).map((b) => ({
      striker: b.striker,
      nonStriker: b.nonStriker,
      bowler: b.bowler,
      runsScored: b.runsScored,
      extraType: b.extra.type,
      extraRuns: b.extra.runs,
      isWicket: b.isWicket,
      wicket: b.isWicket
        ? {
            dismissalType: b.wicket.dismissalType,
            playerOut: b.wicket.playerOut,
            fielder: b.wicket.fielder,
            bowlerCredited: b.wicket.bowlerCredited,
          }
        : undefined,
      commentary: b.commentary,
    }));

    // ---- Wipe this innings' Ball/Over/stats rows and reset its running totals ----
    await Ball.deleteMany({ innings: inningsId });
    await Over.deleteMany({ innings: inningsId });
    await BattingStats.deleteMany({ innings: inningsId });
    await BowlingStats.deleteMany({ innings: inningsId });
    await FieldingStats.deleteMany({ innings: inningsId });

    innings.overs = [];
    innings.totalRuns = 0;
    innings.totalWickets = 0;
    innings.totalOvers = 0;
    innings.totalBalls = 0;
    innings.extras = { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0 };
    innings.fallOfWickets = [];
    innings.partnerships = [];
    innings.currentStrikerBatsman = null;
    innings.currentNonStrikerBatsman = null;
    innings.currentBowler = null;
    innings.isCompleted = false; // must be false or recordBall() will reject every replayed ball
    await innings.save();

    // ---- Replay every remaining ball through the exact same forward path ----
    for (const payload of ballsToReplay) {
      // eslint-disable-next-line no-await-in-loop
      await recordBall({ matchId, inningsId, payload, scoredByUserId });
    }

    // ---- Full recompute (not incremental) for every player touched by ANY
    // of the original balls, including the undone one, since their stats
    // rows were wiped above and only partially rebuilt by the replay (the
    // undone ball's own contribution is correctly gone; everyone else's
    // stats need recomputing from the now-correct rebuilt rows). ----
    const involvedPlayers = new Set();
    for (const b of allBalls) {
      involvedPlayers.add(String(b.striker));
      involvedPlayers.add(String(b.bowler));
      if (b.isWicket && b.wicket.fielder) involvedPlayers.add(String(b.wicket.fielder));
      if (b.isWicket && b.wicket.playerOut) involvedPlayers.add(String(b.wicket.playerOut));
    }
    await recomputeCareerStatsForPlayers([...involvedPlayers]);

    const finalInnings = await Innings.findById(inningsId);
    return {
      undoneBall,
      innings: finalInnings,
      remainingBallCount: ballsToReplay.length,
    };
  });
}

module.exports = { recordBall, rotateStrike, undoLastBall, isInningsLocked };
