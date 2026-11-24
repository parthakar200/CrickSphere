/**
 * Database Reset Script
 * -------------------------------------------------------------
 * Usage:
 *   node utils/resetDatabase.js --matches-only   (clears matches & resets stats, keeps players & teams)
 *   node utils/resetDatabase.js --keep-users     (clears matches, teams, tournaments; keeps villages & user logins)
 *   node utils/resetDatabase.js --all            (wipes all data clean)
 * -------------------------------------------------------------
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { mongoUri } = require('../config/env');
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
  TournamentSquad,
} = require('../models');

async function reset() {
  const mode = process.argv[2] || '--matches-only';

  const uri = mongoUri || process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI is not set in environment or config.');
    process.exit(1);
  }

  console.log(`Connecting to MongoDB...`);
  await mongoose.connect(uri);
  console.log(`Connected successfully. Running reset with mode: ${mode}`);

  if (mode === '--matches-only') {
    console.log('Deleting all matches, innings, overs, balls, and match stats...');
    await Promise.all([
      Match.deleteMany({}),
      Innings.deleteMany({}),
      Over.deleteMany({}),
      Ball.deleteMany({}),
      BattingStats.deleteMany({}),
      BowlingStats.deleteMany({}),
      FieldingStats.deleteMany({}),
      PointsTable.deleteMany({}),
    ]);

    console.log('Resetting all career stats to 0...');
    await CareerStats.updateMany(
      {},
      {
        $set: {
          matchesPlayed: 0,
          tournamentMatchesPlayed: 0,
          singleMatchesPlayed: 0,
          'batting.runs': 0,
          'batting.ballsFaced': 0,
          'batting.innings': 0,
          'batting.fours': 0,
          'batting.sixes': 0,
          'batting.highestScore': 0,
          'batting.highestScoreIsNotOut': false,
          'batting.fifties': 0,
          'batting.hundreds': 0,
          'batting.ducks': 0,
          'batting.notOuts': 0,
          'batting.average': 0,
          'batting.strikeRate': 0,
          'bowling.oversBowled': 0,
          'bowling.ballsBowled': 0,
          'bowling.runsConceded': 0,
          'bowling.wickets': 0,
          'bowling.maidens': 0,
          'bowling.dotBalls': 0,
          'bowling.foursConceded': 0,
          'bowling.sixesConceded': 0,
          'bowling.wides': 0,
          'bowling.noBalls': 0,
          'bowling.economy': 0,
          'bowling.average': 0,
          'bowling.strikeRate': 0,
          'bowling.threeWicketHauls': 0,
          'bowling.fiveWicketHauls': 0,
          'fielding.catches': 0,
          'fielding.runOuts': 0,
          'fielding.stumpings': 0,
        },
      }
    );
    console.log('Done! All matches deleted, career statistics reset to zero. Players, teams, and villages preserved.');
  } else if (mode === '--keep-users') {
    console.log('Wiping all matches, tournaments, squads, teams, and players (preserving villages and accounts)...');
    await Promise.all([
      Match.deleteMany({}),
      Innings.deleteMany({}),
      Over.deleteMany({}),
      Ball.deleteMany({}),
      BattingStats.deleteMany({}),
      BowlingStats.deleteMany({}),
      FieldingStats.deleteMany({}),
      PointsTable.deleteMany({}),
      TournamentSquad.deleteMany({}),
      Tournament.deleteMany({}),
      Team.deleteMany({}),
      Player.deleteMany({}),
      CareerStats.deleteMany({}),
    ]);
    console.log('Done! All tournament and match data removed. Villages & user logins preserved.');
  } else if (mode === '--all') {
    console.log('Wiping all collections completely...');
    await Promise.all([
      Match.deleteMany({}),
      Innings.deleteMany({}),
      Over.deleteMany({}),
      Ball.deleteMany({}),
      BattingStats.deleteMany({}),
      BowlingStats.deleteMany({}),
      FieldingStats.deleteMany({}),
      PointsTable.deleteMany({}),
      TournamentSquad.deleteMany({}),
      Tournament.deleteMany({}),
      Team.deleteMany({}),
      Player.deleteMany({}),
      CareerStats.deleteMany({}),
      User.deleteMany({}),
      Locality.deleteMany({}),
    ]);
    console.log('Done! Database wiped clean.');
  } else {
    console.log(`Unknown mode: ${mode}. Available modes: --matches-only, --keep-users, --all`);
  }

  await mongoose.disconnect();
  console.log('Disconnected from database.');
}

reset().catch((err) => {
  console.error('Error during database reset:', err);
  process.exit(1);
});
