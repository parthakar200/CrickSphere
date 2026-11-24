const axios = require('axios');
const { Player, CareerStats, Locality, Team, Tournament, TournamentSquad, User } = require('../models');
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
 * Fetches players and teams from kpl-auction backend.
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
        `Auction sync skipped: last synced ${Math.floor(elapsedMs / (60 * 1000))}m ago. ` +
        `Next sync in ~${remainingMinutes}m (limited to 4 times per day).`
      );
      return { skipped: true, reason: 'rate-limited', nextInMinutes: remainingMinutes };
    }
  }

  logger.info('Starting KPL auction sync (scheduled max 4 times/day)...');

  let playersData = [];
  let teamsData = [];

  // Try fetching /api/state first (returns both teams and players in 1 single HTTP request)
  try {
    const { data: stateData } = await axios.get(`${AUCTION_BASE_URL}/api/state`, { timeout: 30000 });
    if (stateData) {
      playersData = Array.isArray(stateData.players) ? stateData.players : [];
      teamsData = Array.isArray(stateData.teams) ? stateData.teams : [];
    }
  } catch (err) {
    logger.warn(`Failed to fetch /api/state from auction app: ${err.message}. Trying /api/players fallback...`);
    try {
      const { data } = await axios.get(`${AUCTION_BASE_URL}/api/players`, { timeout: 30000 });
      playersData = Array.isArray(data) ? data : [];
    } catch (playersErr) {
      logger.error(`Auction sync network error: ${playersErr.message}`);
      throw playersErr;
    }
  }

  // 1. Sync Players
  const playerMap = new Map();
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

    playerMap.set(p.id, player._id);

    await CareerStats.findOneAndUpdate(
      { player: player._id },
      {},
      { upsert: true }
    );
  }

  // 2. Sync Teams and Tournament Squads (if available in state response)
  if (teamsData.length > 0 && localityId) {
    const tournament = await Tournament.findOne({ locality: localityId, name: /Kudei Premier League/i });

    for (const t of teamsData) {
      const shortName = (t.name.split(' ')[0] || t.name).substring(0, 4).toUpperCase();
      const team = await Team.findOneAndUpdate(
        { name: t.name, locality: localityId },
        {
          $set: {
            shortName,
            locality: localityId,
            ...(tournament ? { tournament: tournament._id } : {}),
          },
          $setOnInsert: { createdBy: createdByUserId },
        },
        { upsert: true, new: true }
      );

      // Link players to team squad if tournament exists
      if (tournament && Array.isArray(t.players)) {
        for (const auctionPid of t.players) {
          const playerId = playerMap.get(auctionPid);
          if (playerId) {
            await TournamentSquad.findOneAndUpdate(
              { tournament: tournament._id, player: playerId },
              { $set: { team: team._id } },
              { upsert: true }
            );
          }
        }
      }
    }
  }

  // Record successful sync timestamp in DB to strictly throttle to 4 times/day
  if (kudei) {
    await Locality.updateOne({ _id: kudei._id }, { $set: { lastAuctionSyncedAt: new Date() } });
  }

  logger.info(`Auction sync finished successfully: ${playersData.length} players, ${teamsData.length} teams synced.`);
  return { success: true, playersCount: playersData.length, teamsCount: teamsData.length };
}

/**
 * Automatically syncs with kpl-auction backend at most 4 times a day (every 6 hours).
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
      logger.error(`Auction auto-sync failed: ${err.message}`);
    }
  }

  // Delay first check 2 minutes after startup to allow database connections to settle
  setTimeout(runOnce, 2 * 60 * 1000);

  // Periodically check every 30 minutes; sync will only execute if >= 6 hours have passed
  setInterval(runOnce, checkIntervalMs);
}

module.exports = { syncPlayers, startAutoSync };
