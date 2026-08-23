const mongoose = require('mongoose');
const { Schema } = mongoose;

const fieldingStatsSchema = new Schema(
  {
    player: { type: Schema.Types.ObjectId, ref: 'Player', required: true, index: true },
    match: { type: Schema.Types.ObjectId, ref: 'Match', required: true, index: true },
    team: { type: Schema.Types.ObjectId, ref: 'Team', required: true },

    mode: { type: String, enum: ['single', 'tournament'], required: true },
    tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', default: null, index: true },

    catches: { type: Number, default: 0 },
    runOuts: { type: Number, default: 0 },
    stumpings: { type: Number, default: 0 },
  },
  { timestamps: true }
);

fieldingStatsSchema.index({ player: 1, match: 1 }, { unique: true });
fieldingStatsSchema.index({ player: 1, mode: 1 });

fieldingStatsSchema.virtual('totalDismissals').get(function totalDismissals() {
  return this.catches + this.runOuts + this.stumpings;
});

fieldingStatsSchema.set('toJSON', { virtuals: true });
fieldingStatsSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('FieldingStats', fieldingStatsSchema);
