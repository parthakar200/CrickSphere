const mongoose = require('mongoose');
const { Schema } = mongoose;

const bowlingStatsSchema = new Schema(
  {
    player: { type: Schema.Types.ObjectId, ref: 'Player', required: true, index: true },
    match: { type: Schema.Types.ObjectId, ref: 'Match', required: true, index: true },
    innings: { type: Schema.Types.ObjectId, ref: 'Innings', required: true },
    team: { type: Schema.Types.ObjectId, ref: 'Team', required: true }, // bowling team

    mode: { type: String, enum: ['single', 'tournament'], required: true },
    tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', default: null, index: true },

    ballsBowled: { type: Number, default: 0 }, // legal deliveries only
    oversBowled: { type: Number, default: 0 }, // derived display value e.g. 4.2
    runsConceded: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    maidens: { type: Number, default: 0 },
    dotBalls: { type: Number, default: 0 },
    wides: { type: Number, default: 0 },
    noBalls: { type: Number, default: 0 },

    economy: { type: Number, default: 0 },
    average: { type: Number, default: null }, // null when wickets = 0 (i.e. undefined average)
  },
  { timestamps: true }
);

bowlingStatsSchema.index({ player: 1, match: 1, innings: 1 }, { unique: true });
bowlingStatsSchema.index({ player: 1, mode: 1 });
bowlingStatsSchema.index({ wickets: -1 });

bowlingStatsSchema.pre('save', function computeDerived(next) {
  this.oversBowled = Number((Math.floor(this.ballsBowled / 6) + (this.ballsBowled % 6) / 10).toFixed(1));
  const completedOvers = this.ballsBowled / 6;
  this.economy = completedOvers > 0 ? Number((this.runsConceded / completedOvers).toFixed(2)) : 0;
  this.average = this.wickets > 0 ? Number((this.runsConceded / this.wickets).toFixed(2)) : null;
  next();
});

module.exports = mongoose.model('BowlingStats', bowlingStatsSchema);
