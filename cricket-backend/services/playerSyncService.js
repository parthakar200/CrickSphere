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

module.exports = { syncPlayers };