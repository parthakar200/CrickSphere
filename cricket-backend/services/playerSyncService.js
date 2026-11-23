const axios = require('axios');
const { Player, CareerStats } = require('../models');

function mapRole(role) {
  return {
    BAT: 'batsman',
    BWL: 'bowler',
    AR: 'all-rounder',
    WK: 'wicket-keeper',
  }[role] ?? 'batsman';
}

async function syncPlayers(createdByUserId) {
  const { data } = await axios.get(
    'https://node-backend-for-auction.onrender.com/api/players'
  );

  for (const p of data) {
    const player = await Player.findOneAndUpdate(
      { auctionPlayerId: p.id },
      {
        $set: {
          auctionPlayerId: p.id,
          name: p.name,
          photo: p.photo,
          role: mapRole(p.role),
        },
        // Only applied when a *new* document is inserted, so re-running sync
        // never clobbers who actually owns/edited an existing player record.
        $setOnInsert: { createdBy: createdByUserId },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );

    await CareerStats.findOneAndUpdate(
      { player: player._id },
      {},
      { upsert: true }
    );
  }
}


/**
 * Polls the auction app for new players every `intervalMs` (default: 10
 * minutes) so newly added players show up here without anyone clicking
 * "Sync" manually. Runs once immediately on startup, then on the interval.
 *
 * syncPlayers() needs a `createdByUserId` to attribute newly-inserted
 * players to (only used via $setOnInsert, so it never touches players that
 * already exist) — for an automatic run there's no "current admin" making
 * the request, so this attributes new players to the first admin account
 * found. That lookup is cached after the first successful run rather than
 * re-queried every cycle.
 */
function startAutoSync(intervalMs = 10 * 60 * 1000) {
  const { User } = require('../models');
  const logger = require('../utils/logger');

  let systemUserId = null;

  async function runOnce() {
    try {
      if (!systemUserId) {
        const admin = await User.findOne({ role: 'admin' }).select('_id');
        if (!admin) {
          logger.warn('Player auto-sync skipped: no admin user exists yet to attribute new players to.');
          return;
        }
        systemUserId = admin._id;
      }
      await syncPlayers(systemUserId);
      logger.info('Player auto-sync completed.');
    } catch (err) {
      logger.error(`Player auto-sync failed: ${err.message}`);
    }
  }

  runOnce();
  setInterval(runOnce, intervalMs);
}

module.exports = { syncPlayers, startAutoSync };