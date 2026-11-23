const { Locality, User, Tournament, Match, Team, Player } = require('../models');
const logger = require('../utils/logger');

/**
 * Ensures default localities exist (especially 'Kudei Village')
 * and attaches any existing unassigned records (tournaments, matches,
 * teams, players, demo users) to Kudei Village.
 */
async function ensureDefaultLocalities() {
  try {
    let kudei = await Locality.findOne({ slug: 'kudei' });
    if (!kudei) {
      kudei = await Locality.create({
        name: 'Kudei Village',
        slug: 'kudei',
        description: 'Tournaments, matches, and players of Kudei Village',
        isDefault: true,
        isActive: true,
      });
      logger.info('Created default locality: Kudei Village');
    }

    // Ensure a second village is available for testing/demonstrating switching
    let rampur = await Locality.findOne({ slug: 'rampur' });
    if (!rampur) {
      rampur = await Locality.create({
        name: 'Rampur Village',
        slug: 'rampur',
        description: 'Tournaments, matches, and players of Rampur Village',
        isDefault: false,
        isActive: true,
      });
      logger.info('Created alternative locality: Rampur Village');
    }

    // Migrate any legacy unassigned records to Kudei Village
    const filter = { locality: { $in: [null, undefined] } };
    const [tCount, mCount, teamCount, pCount, uCount] = await Promise.all([
      Tournament.updateMany(filter, { locality: kudei._id }),
      Match.updateMany(filter, { locality: kudei._id }),
      Team.updateMany(filter, { locality: kudei._id }),
      Player.updateMany(filter, { locality: kudei._id }),
      User.updateMany(filter, { locality: kudei._id }),
    ]);

    if (tCount.modifiedCount || mCount.modifiedCount || teamCount.modifiedCount || pCount.modifiedCount) {
      logger.info(
        `Linked legacy data to Kudei Village: ${tCount.modifiedCount} tournaments, ${mCount.modifiedCount} matches, ${teamCount.modifiedCount} teams, ${pCount.modifiedCount} players, ${uCount.modifiedCount} users.`
      );
    }
    return { kudei, rampur };
  } catch (err) {
    logger.error(`Error in ensureDefaultLocalities: ${err.message}`);
  }
}

module.exports = {
  ensureDefaultLocalities,
};
