/**
 * Seed Script
 * -----------------------------------------------------------------------
 * Populates a fresh database with enough demo data to manually verify the
 * whole pipeline end-to-end, including the headline requirement from the
 * spec: a player's career runs must equal the sum of their runs across a
 * single match AND multiple tournament matches.
 *
 * Run with: npm run seed
 * (Make sure MONGO_URI in .env points to a database you're OK wiping —
 * this script drops all collections it touches before reseeding.)
 * -----------------------------------------------------------------------
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { mongoUri } = require('../config/env');
const logger = require('./logger');

const {
  Locality,
  User,
  Team,
  Player,
  Tournament,
  Match,
  Innings,
  Over,
  Ball,
  BattingStats,
  BowlingStats,
  FieldingStats,
  CareerStats,
  PointsTable,
} = require('../models');

const { recordBall } = require('../services/scoringService');
const { recomputeCareerStatsForPlayer } = require('../services/statsEngine');

async function wipeCollections() {
  await Promise.all(
    [
      Locality,
      User,
      Team,
      Player,
      Tournament,
      Match,
      Innings,
      Over,
      Ball,
      BattingStats,
      BowlingStats,
      FieldingStats,
      CareerStats,
      PointsTable,
    ].map((Model) => Model.deleteMany({}))
  );
  logger.info('Wiped all collections');
}

// Bowls a sequence of simple deliveries (all legal, no extras, no wickets),
// always crediting `strikerId` for every ball regardless of what the
// scoring engine's auto strike-rotation does internally.
//
// IMPORTANT: recordBall() auto-rotates innings.currentStrikerBatsman /
// currentNonStrikerBatsman after every ball (odd runs, end of over — see
// scoringService.js). That's correct real-match behavior. But for this
// seed script we want a deterministic, easy-to-verify total for one named
// player, so we deliberately pass `strikerId` as the striker on EVERY call
// rather than reading back whatever the engine just rotated onto strike.
// (An earlier version of this script read the rotated value back in a loop,
// which silently split the intended runs across both batsmen — caught via
// `npm run seed`'s own verification check, which is exactly what it's for.)
async function bowlSimpleOver({ matchId, inningsId, strikerId, nonStrikerId, bowlerId, runsPerBall, scorerId }) {
  for (const runs of runsPerBall) {
    await recordBall({
      matchId,
      inningsId,
      payload: {
        striker: strikerId,
        nonStriker: nonStrikerId,
        bowler: bowlerId,
        runsScored: runs,
        extraType: 'none',
        extraRuns: 0,
        isWicket: false,
      },
      scoredByUserId: scorerId,
    });
  }
}

async function seed() {
  await mongoose.connect(mongoUri);
  logger.info(`Connected to ${mongoUri} for seeding`);

  await wipeCollections();

  // ---- Localities ----
  const kudei = await Locality.create({
    name: 'Kudei Village',
    slug: 'kudei',
    description: 'Tournaments, matches, and players of Kudei Village',
    isDefault: true,
    isActive: true,
  });

  const rampur = await Locality.create({
    name: 'Rampur Village',
    slug: 'rampur',
    description: 'Tournaments, matches, and players of Rampur Village',
    isDefault: false,
    isActive: true,
  });
  logger.info('Created localities: Kudei Village (default) and Rampur Village');

  // ---- Users ----
  const admin = await User.create({
    name: 'Admin User',
    email: 'admin@cricket.local',
    password: 'Password123!',
    role: 'admin',
    locality: kudei._id,
  });
  const scorer = await User.create({
    name: 'Kudei Scorer',
    email: 'scorer@cricket.local',
    password: 'Password123!',
    role: 'scorer',
    locality: kudei._id,
  });
  await User.create({
    name: 'Rampur Scorer',
    email: 'scorer.rampur@cricket.local',
    password: 'Password123!',
    role: 'scorer',
    locality: rampur._id,
  });
  logger.info('Created demo users (admin@cricket.local / scorer@cricket.local / scorer.rampur@cricket.local, all password: Password123!)');

  // ---- Teams (Kudei Village) ----
  const mumbaiTigers = await Team.create({
    name: 'Mumbai Tigers',
    shortName: 'MUT',
    createdBy: admin._id,
    locality: kudei._id,
  });
  const delhiDragons = await Team.create({
    name: 'Delhi Dragons',
    shortName: 'DDR',
    createdBy: admin._id,
    locality: kudei._id,
  });
  const chennaiChampions = await Team.create({
    name: 'Chennai Champions',
    shortName: 'CHC',
    createdBy: admin._id,
    locality: kudei._id,
  });

  // ---- Players (Kudei Village) ----
  // "Star Batsman" is our stand-in for the Virat example in the spec:
  // 50 in a single match + 80 in a tournament match + 30 in another tournament match = 160 career runs.
  const starBatsman = await Player.create({
    name: 'Star Batsman',
    role: 'batsman',
    battingStyle: 'right-hand-bat',
    team: mumbaiTigers._id,
    createdBy: admin._id,
    locality: kudei._id,
  });
  const allRounder = await Player.create({
    name: 'All Rounder One',
    role: 'all-rounder',
    battingStyle: 'right-hand-bat',
    bowlingStyle: 'right-arm-medium',
    team: mumbaiTigers._id,
    createdBy: admin._id,
    locality: kudei._id,
  });
  const fastBowlerA = await Player.create({
    name: 'Fast Bowler A',
    role: 'bowler',
    bowlingStyle: 'right-arm-fast',
    team: delhiDragons._id,
    createdBy: admin._id,
    locality: kudei._id,
  });
  const fastBowlerB = await Player.create({
    name: 'Fast Bowler B',
    role: 'bowler',
    bowlingStyle: 'left-arm-fast',
    team: chennaiChampions._id,
    createdBy: admin._id,
    locality: kudei._id,
  });
  const wicketKeeper = await Player.create({
    name: 'Keeper Gloves',
    role: 'wicket-keeper',
    team: delhiDragons._id,
    createdBy: admin._id,
    locality: kudei._id,
  });

  await Team.findByIdAndUpdate(mumbaiTigers._id, { $push: { players: { $each: [starBatsman._id, allRounder._id] } } });
  await Team.findByIdAndUpdate(delhiDragons._id, { $push: { players: { $each: [fastBowlerA._id, wicketKeeper._id] } } });
  await Team.findByIdAndUpdate(chennaiChampions._id, { $push: { players: fastBowlerB._id } });

  for (const p of [starBatsman, allRounder, fastBowlerA, fastBowlerB, wicketKeeper]) {
    await CareerStats.create({ player: p._id });
  }

  // ---- SINGLE MATCH: Mumbai Tigers vs Delhi Dragons (Star Batsman scores 50) ----
  const singleMatch = await Match.create({
    name: 'Mumbai Tigers vs Delhi Dragons - Friendly',
    mode: 'single',
    teamA: mumbaiTigers._id,
    teamB: delhiDragons._id,
    matchType: 'T20',
    overs: 20,
    createdBy: admin._id,
    locality: kudei._id,
    scorers: [scorer._id],
    toss: { winner: mumbaiTigers._id, decision: 'bat' },
    status: 'live',
  });

  const singleInnings1 = await Innings.create({
    match: singleMatch._id,
    inningsNumber: 1,
    battingTeam: mumbaiTigers._id,
    bowlingTeam: delhiDragons._id,
  });
  singleMatch.innings.push(singleInnings1._id);
  singleMatch.currentInnings = 1;
  await singleMatch.save();

  // Star Batsman faces the first ball, partnered with All Rounder.
  await Innings.findByIdAndUpdate(singleInnings1._id, {
    currentStrikerBatsman: starBatsman._id,
    currentNonStrikerBatsman: allRounder._id,
    currentBowler: fastBowlerA._id,
  });

  // Bowl exactly 50 runs to Star Batsman across a mix of strike rotations.
  // (10 fours = 40 runs, plus 5 twos = 10 runs -> 50 runs total, kept simple.)
  await bowlSimpleOver({
    matchId: singleMatch._id,
    inningsId: singleInnings1._id,
    strikerId: starBatsman._id,
    nonStrikerId: allRounder._id,
    bowlerId: fastBowlerA._id,
    runsPerBall: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 2, 2, 2, 2, 2],
    scorerId: scorer._id,
  });

  await Match.findByIdAndUpdate(singleMatch._id, { status: 'completed', result: { winner: mumbaiTigers._id, winMargin: 'won by 50 runs' } });
  logger.info('Created single match with Star Batsman scoring 50 runs');

  // ---- TOURNAMENT ----
  const tournament = await Tournament.create({
    name: 'Demo Premier League 2026',
    startDate: new Date('2026-07-01'),
    endDate: new Date('2026-07-15'),
    format: 'round-robin',
    matchType: 'T20',
    oversPerMatch: 20,
    teams: [mumbaiTigers._id, delhiDragons._id, chennaiChampions._id],
    locality: kudei._id,
    createdBy: admin._id,
  });

  await Team.updateMany(
    { _id: { $in: [mumbaiTigers._id, delhiDragons._id, chennaiChampions._id] } },
    { tournament: tournament._id }
  );

  for (const teamId of [mumbaiTigers._id, delhiDragons._id, chennaiChampions._id]) {
    await PointsTable.create({ tournament: tournament._id, team: teamId });
  }

  // Tournament Match 1: Mumbai Tigers vs Chennai Champions (Star Batsman scores 80)
  const tMatch1 = await Match.create({
    name: 'Mumbai Tigers vs Chennai Champions - Tournament Match 1',
    mode: 'tournament',
    tournament: tournament._id,
    stage: 'league',
    teamA: mumbaiTigers._id,
    teamB: chennaiChampions._id,
    matchType: 'T20',
    overs: 20,
    createdBy: admin._id,
    locality: kudei._id,
    scorers: [scorer._id],
    toss: { winner: mumbaiTigers._id, decision: 'bat' },
    status: 'live',
  });

  const tMatch1Innings1 = await Innings.create({
    match: tMatch1._id,
    inningsNumber: 1,
    battingTeam: mumbaiTigers._id,
    bowlingTeam: chennaiChampions._id,
  });
  tMatch1.innings.push(tMatch1Innings1._id);
  await tMatch1.save();

  await Innings.findByIdAndUpdate(tMatch1Innings1._id, {
    currentStrikerBatsman: starBatsman._id,
    currentNonStrikerBatsman: allRounder._id,
    currentBowler: fastBowlerB._id,
  });

  // 80 runs: 14 fours (56) + 12 twos (24) = 80
  await bowlSimpleOver({
    matchId: tMatch1._id,
    inningsId: tMatch1Innings1._id,
    strikerId: starBatsman._id,
    nonStrikerId: allRounder._id,
    bowlerId: fastBowlerB._id,
    runsPerBall: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
    scorerId: scorer._id,
  });

  await Match.findByIdAndUpdate(tMatch1._id, {
    status: 'completed',
    result: { winner: mumbaiTigers._id, winMargin: 'won by 80 runs' },
  });
  logger.info('Created tournament match 1 with Star Batsman scoring 80 runs');

  // Tournament Match 2: Mumbai Tigers vs Delhi Dragons (Star Batsman scores 30)
  const tMatch2 = await Match.create({
    name: 'Mumbai Tigers vs Delhi Dragons - Tournament Match 2',
    mode: 'tournament',
    tournament: tournament._id,
    stage: 'league',
    teamA: mumbaiTigers._id,
    teamB: delhiDragons._id,
    matchType: 'T20',
    overs: 20,
    createdBy: admin._id,
    locality: kudei._id,
    scorers: [scorer._id],
    toss: { winner: mumbaiTigers._id, decision: 'bat' },
    status: 'live',
  });

  const tMatch2Innings1 = await Innings.create({
    match: tMatch2._id,
    inningsNumber: 1,
    battingTeam: mumbaiTigers._id,
    bowlingTeam: delhiDragons._id,
  });
  tMatch2.innings.push(tMatch2Innings1._id);
  await tMatch2.save();

  await Innings.findByIdAndUpdate(tMatch2Innings1._id, {
    currentStrikerBatsman: starBatsman._id,
    currentNonStrikerBatsman: allRounder._id,
    currentBowler: fastBowlerA._id,
  });

  // 30 runs: 5 fours (20) + 5 twos (10) = 30
  await bowlSimpleOver({
    matchId: tMatch2._id,
    inningsId: tMatch2Innings1._id,
    strikerId: starBatsman._id,
    nonStrikerId: allRounder._id,
    bowlerId: fastBowlerA._id,
    runsPerBall: [4, 4, 4, 4, 4, 2, 2, 2, 2, 2],
    scorerId: scorer._id,
  });

  await Match.findByIdAndUpdate(tMatch2._id, {
    status: 'completed',
    result: { winner: delhiDragons._id, winMargin: 'won by 5 wickets' },
  });
  logger.info('Created tournament match 2 with Star Batsman scoring 30 runs');

  // Final reconciliation pass (mirrors what matchController.completeMatch does on completion).
  await recomputeCareerStatsForPlayer(starBatsman._id);
  await recomputeCareerStatsForPlayer(allRounder._id);
  await recomputeCareerStatsForPlayer(fastBowlerA._id);
  await recomputeCareerStatsForPlayer(fastBowlerB._id);

  const finalCareerStats = await CareerStats.findOne({ player: starBatsman._id });
  logger.info('--------------------------------------------------');
  logger.info(`Star Batsman combined career runs: ${finalCareerStats.batting.runs} (expected 160 = 50 + 80 + 30)`);
  logger.info(`Star Batsman matches played: ${finalCareerStats.matchesPlayed} (1 single + 2 tournament)`);
  logger.info(`Star Batsman single matches: ${finalCareerStats.singleMatchesPlayed}, tournament matches: ${finalCareerStats.tournamentMatchesPlayed}`);
  logger.info('--------------------------------------------------');

  if (finalCareerStats.batting.runs !== 160) {
    logger.error('SEED VERIFICATION FAILED: expected 160 combined runs, got ' + finalCareerStats.batting.runs);
    process.exitCode = 1;
  } else {
    logger.info('SEED VERIFICATION PASSED: combined single + tournament stats aggregate correctly.');
  }

  await mongoose.disconnect();
}

seed().catch((err) => {
  logger.error(`Seed failed: ${err.message}\n${err.stack}`);
  process.exit(1);
});
