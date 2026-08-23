/**
 * Repair Career Stats (one-off maintenance script)
 * -----------------------------------------------------------------------
 * Fixes CareerStats documents that were silently zeroed out by a bug in
 * recomputeCareerStatsForPlayer(): the aggregate() pipelines used a raw
 * string player id (from the live-scoring path) instead of an ObjectId,
 * so $match matched nothing and runs/innings/etc. got saved as 0, even
 * though ball-by-ball BattingStats/BowlingStats rows were correct all along.
 *
 * This script does NOT touch Ball/Over/Innings/BattingStats/BowlingStats/
 * FieldingStats — those were never wrong. It just re-derives every
 * player's CareerStats document from that already-correct per-match data,
 * using the fixed aggregation logic.
 *
 * Safe to run multiple times (idempotent).
 *
 * Run with: node utils/repairCareerStats.js
 * (Make sure MONGO_URI in .env points at the database you want to repair.)
 * -----------------------------------------------------------------------
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { mongoUri } = require('../config/env');
const logger = require('./logger');

const { Player } = require('../models');
const { recomputeCareerStatsForPlayer } = require('../services/statsEngine');

async function run() {
  await mongoose.connect(mongoUri);
  logger.info('Connected to MongoDB for CareerStats repair');

  const players = await Player.find({}, '_id name');
  logger.info(`Found ${players.length} players — recomputing career stats for each`);

  let fixed = 0;
  for (const player of players) {
    // eslint-disable-next-line no-await-in-loop
    const stats = await recomputeCareerStatsForPlayer(player._id);
    fixed += 1;
    logger.info(
      `[${fixed}/${players.length}] ${player.name}: runs=${stats.batting.runs}, ` +
        `innings=${stats.batting.innings}, wickets=${stats.bowling.wickets}`
    );
  }

  logger.info('CareerStats repair complete');
  await mongoose.disconnect();
}

run().catch((err) => {
  logger.error(`CareerStats repair failed: ${err.message}`);
  process.exit(1);
});