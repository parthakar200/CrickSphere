const mongoose = require('mongoose');
const { Schema } = mongoose;

// Exactly ONE document per player. This is the canonical "career" record that
// satisfies the requirement: stats from single matches AND tournament matches
// must combine into one total. It is updated incrementally (not recomputed
// from scratch) every time a ball is scored or a match completes — see
// services/statsEngine.js: updateCareerStatsForPlayer().
//
// Best-figures / highest-score fields store a reference to the match they came
// from so the UI can link "Best Bowling: 5/20 vs Mumbai Tigers".
const careerStatsSchema = new Schema(
  {
    player: { type: Schema.Types.ObjectId, ref: 'Player', required: true, unique: true, index: true },

    // ---- Aggregate match/innings counts (these power "Matches" / "Innings" leaderboard columns) ----
    matchesPlayed: { type: Number, default: 0 },
    singleMatchesPlayed: { type: Number, default: 0 },
    tournamentMatchesPlayed: { type: Number, default: 0 },

    // ---- Batting career totals ----
    batting: {
      innings: { type: Number, default: 0 },
      runs: { type: Number, default: 0 },
      ballsFaced: { type: Number, default: 0 },
      notOuts: { type: Number, default: 0 },
      highestScore: { type: Number, default: 0 },
      highestScoreIsNotOut: { type: Boolean, default: false },
      highestScoreMatch: { type: Schema.Types.ObjectId, ref: 'Match', default: null },
      fours: { type: Number, default: 0 },
      sixes: { type: Number, default: 0 },
      fifties: { type: Number, default: 0 },
      hundreds: { type: Number, default: 0 },
      ducks: { type: Number, default: 0 },
      average: { type: Number, default: 0 },
      strikeRate: { type: Number, default: 0 },
    },

    // ---- Bowling career totals ----
    bowling: {
      innings: { type: Number, default: 0 }, // innings in which player bowled at least one ball
      ballsBowled: { type: Number, default: 0 },
      runsConceded: { type: Number, default: 0 },
      wickets: { type: Number, default: 0 },
      maidens: { type: Number, default: 0 },
      dotBalls: { type: Number, default: 0 },
      bestFigures: {
        wickets: { type: Number, default: 0 },
        runs: { type: Number, default: 0 },
        match: { type: Schema.Types.ObjectId, ref: 'Match', default: null },
      },
      threeWicketHauls: { type: Number, default: 0 },
      fiveWicketHauls: { type: Number, default: 0 },
      average: { type: Number, default: null },
      economy: { type: Number, default: 0 },
      strikeRate: { type: Number, default: null }, // balls per wicket
    },

    // ---- Fielding career totals ----
    fielding: {
      catches: { type: Number, default: 0 },
      runOuts: { type: Number, default: 0 },
      stumpings: { type: Number, default: 0 },
    },

    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

careerStatsSchema.index({ 'batting.runs': -1 });
careerStatsSchema.index({ 'bowling.wickets': -1 });
careerStatsSchema.index({ 'batting.strikeRate': -1 });
careerStatsSchema.index({ 'bowling.economy': 1 });

module.exports = mongoose.model('CareerStats', careerStatsSchema);
