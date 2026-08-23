const mongoose = require('mongoose');
const { Schema } = mongoose;

// One document per player per innings batted. This is the source-of-truth row
// for scorecards. CareerStats is a separate, continuously-aggregated rollup
// computed FROM these rows (see services/statsEngine.js), which is what lets a
// player's totals span both single matches and tournament matches uniformly.
const battingStatsSchema = new Schema(
  {
    player: { type: Schema.Types.ObjectId, ref: 'Player', required: true, index: true },
    match: { type: Schema.Types.ObjectId, ref: 'Match', required: true, index: true },
    innings: { type: Schema.Types.ObjectId, ref: 'Innings', required: true },
    team: { type: Schema.Types.ObjectId, ref: 'Team', required: true },

    // Denormalized so leaderboard aggregations don't need to join back to Match every time.
    mode: { type: String, enum: ['single', 'tournament'], required: true },
    tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', default: null, index: true },

    runs: { type: Number, default: 0 },
    ballsFaced: { type: Number, default: 0 },
    fours: { type: Number, default: 0 },
    sixes: { type: Number, default: 0 },

    isOut: { type: Boolean, default: false },
    dismissalType: { type: String, default: 'not-out' },
    bowlerOut: { type: Schema.Types.ObjectId, ref: 'Player', default: null },
    fielderOut: { type: Schema.Types.ObjectId, ref: 'Player', default: null },

    battingPosition: { type: Number, default: null },

    strikeRate: { type: Number, default: 0 }, // (runs / ballsFaced) * 100, recalculated on update
  },
  { timestamps: true }
);

battingStatsSchema.index({ player: 1, match: 1, innings: 1 }, { unique: true });
battingStatsSchema.index({ player: 1, mode: 1 });
battingStatsSchema.index({ runs: -1 });

battingStatsSchema.pre('save', function computeStrikeRate(next) {
  this.strikeRate = this.ballsFaced > 0 ? Number(((this.runs / this.ballsFaced) * 100).toFixed(2)) : 0;
  next();
});

module.exports = mongoose.model('BattingStats', battingStatsSchema);
