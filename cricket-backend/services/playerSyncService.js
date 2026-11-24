const axios = require('axios');
const { Player, CareerStats, Locality, User } = require('../models');
const logger = require('../utils/logger');

// 4 times in a day = 24 / 4 = exactly once every 6 hours
const MIN_SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000;
const AUCTION_BASE_URL = 'https://node-backend-for-auction.onrender.com';

function mapRole(role) {
  return {
    BAT: 'batsman',
    BWL: 'bowler',
    AR: 'all-rounder',
    WK: 'wicket-keeper',
  }[role] ?? 'batsman';
}

/**
 * Fetches ONLY players from kpl-auction backend (no teams).
 * Rate-limited to at most 4 times a day (once every 6 hours) unless force=true.
 */
async function syncPlayers(createdByUserId, options = {}) {
  const force = options.force ?? false;
  const kudei = await Locality.findOne({ slug: 'kudei' });
  const localityId = kudei ? kudei._id : null;

  // Enforce max 4 times per day rate limit using DB-persisted timestamp
  if (!force && kudei && kudei.lastAuctionSyncedAt) {
    const elapsedMs = Date.now() - new Date(kudei.lastAuctionSyncedAt).getTime();
    if (elapsedMs < MIN_SYNC_INTERVAL_MS) {
      const remainingMinutes = Math.ceil((MIN_SYNC_INTERVAL_MS - elapsedMs) / (60 * 1000));
      logger.info(
        `Auction player sync skipped: last synced ${Math.floor(elapsedMs / (60 * 1000))}m ago. ` +
        `Next sync in ~${remainingMinutes}m (limited to 4 times per day).`
      );
      return { skipped: true, reason: 'rate-limited', nextInMinutes: remainingMinutes };
    }
  }

  logger.info('Starting KPL auction player sync (scheduled max 4 times/day)...');

  let playersData = [];

  // Strictly fetch only players
  try {
    const { data } = await axios.get(`${AUCTION_BASE_URL}/api/players`, { timeout: 30000 });
    playersData = Array.isArray(data) ? data : [];
  } catch (err) {
    logger.error(`Auction player sync network error: ${err.message}`);
    throw err;
  }

  // Upsert players and initialize career stats
  for (const p of playersData) {
    const updatePayload = {
      auctionPlayerId: p.id,
      name: p.name,
      photo: p.photo,
      role: mapRole(p.role),
    };
    if (localityId) {
      updatePayload.locality = localityId;
    }

    const player = await Player.findOneAndUpdate(
      { auctionPlayerId: p.id },
      {
        $set: updatePayload,
        $setOnInsert: { createdBy: createdByUserId, ...(localityId && { locality: localityId }) },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );

    await CareerStats.findOneAndUpdate(
      { player: player._id },
      {},
      { upsert: true }
    );
  }

  // Record successful sync timestamp in DB to strictly throttle to 4 times/day
  if (kudei) {
    await Locality.updateOne({ _id: kudei._id }, { $set: { lastAuctionSyncedAt: new Date() } });
  }

  logger.info(`Auction player sync finished successfully: ${playersData.length} players synced (teams untouched).`);
  return { success: true, playersCount: playersData.length };
}

/**
 * Automatically syncs players with kpl-auction backend at most 4 times a day (every 6 hours).
 * Respects lastAuctionSyncedAt from MongoDB so restarts don't trigger extra calls.
 */
function startAutoSync(checkIntervalMs = 30 * 60 * 1000) {
  let systemUserId = null;

  async function runOnce() {
    try {
      if (!systemUserId) {
        const admin = await User.findOne({ role: 'admin' }).select('_id');
        if (!admin) {
          logger.warn('Auction auto-sync skipped: no admin user exists yet.');
          return;
        }
        systemUserId = admin._id;
      }
      await syncPlayers(systemUserId, { force: false });
    } catch (err) {
      logger.error(`Auction player auto-sync failed: ${err.message}`);
    }
  }

  // Delay first check 2 minutes after startup to allow database connections to settle
  setTimeout(runOnce, 2 * 60 * 1000);

  // Periodically check every 30 minutes; sync will only execute if >= 6 hours have passed
  setInterval(runOnce, checkIntervalMs);
}

module.exports = { syncPlayers, startAutoSync };
