const { Locality, User, Tournament, Match, Team, Player } = require('../models');
const logger = require('../utils/logger');

/**
 * Ensures default localities exist (especially 'Kudei Village' and 'Rampur Village'),
 * auto-seeds default admin/scorer users and baseline teams/tournaments if the database
 * is freshly connected (e.g. MongoDB Atlas), and links any unassigned legacy records.
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

    // Ensure default demo users exist so fresh deployments (MongoDB Atlas) can log in immediately
    let admin = await User.findOne({ email: 'admin@cricket.local' });
    if (!admin) {
      admin = await User.create({
        name: 'Admin User',
        email: 'admin@cricket.local',
        password: 'Password123!',
        role: 'admin',
        locality: kudei._id,
      });
      logger.info('Auto-created default admin user: admin@cricket.local (Password123!)');
    }

    let scorer = await User.findOne({ email: 'scorer@cricket.local' });
    if (!scorer) {
      scorer = await User.create({
        name: 'Kudei Scorer',
        email: 'scorer@cricket.local',
        password: 'Password123!',
        role: 'scorer',
        locality: kudei._id,
      });
      logger.info('Auto-created default scorer user: scorer@cricket.local (Password123!)');
    }

    let rampurScorer = await User.findOne({ email: 'scorer.rampur@cricket.local' });
    if (!rampurScorer) {
      await User.create({
        name: 'Rampur Scorer',
        email: 'scorer.rampur@cricket.local',
        password: 'Password123!',
        role: 'scorer',
        locality: rampur._id,
      });
      logger.info('Auto-created default Rampur scorer user: scorer.rampur@cricket.local (Password123!)');
    }

    // If Kudei has no teams/tournaments yet, auto-seed baseline data so the village isn't empty
    const existingTeams = await Team.countDocuments({ locality: kudei._id });
    if (existingTeams === 0) {
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

      await Team.findByIdAndUpdate(mumbaiTigers._id, { $push: { players: { $each: [starBatsman._id, allRounder._id] } } });
      await Team.findByIdAndUpdate(delhiDragons._id, { $push: { players: fastBowlerA._id } });
      await Team.findByIdAndUpdate(chennaiChampions._id, { $push: { players: fastBowlerB._id } });

      const tournament = await Tournament.create({
        name: 'Kudei Premier League',
        format: 'league',
        matchType: 'T20',
        oversPerMatch: 20,
        locality: kudei._id,
        createdBy: admin._id,
        teams: [mumbaiTigers._id, delhiDragons._id, chennaiChampions._id],
        status: 'ongoing',
        startDate: new Date(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      });

      await Match.create({
        name: 'Mumbai Tigers vs Delhi Dragons - Match 1',
        mode: 'tournament',
        tournament: tournament._id,
        teamA: mumbaiTigers._id,
        teamB: delhiDragons._id,
        matchType: 'T20',
        overs: 20,
        createdBy: admin._id,
        locality: kudei._id,
        scorers: [scorer._id],
        status: 'scheduled',
      });

      logger.info('Auto-seeded baseline teams, players, tournament, and match for Kudei Village');
    }

    return { kudei, rampur };
  } catch (err) {
    logger.error(`Error in ensureDefaultLocalities: ${err.message}`);
  }
}

module.exports = {
  ensureDefaultLocalities,
};
