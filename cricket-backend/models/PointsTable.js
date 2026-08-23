const mongoose = require('mongoose');
const { Schema } = mongoose;

const pointsTableSchema = new Schema(
  {
    tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true, index: true },
    team: { type: Schema.Types.ObjectId, ref: 'Team', required: true },

    played: { type: Number, default: 0 },
    won: { type: Number, default: 0 },
    lost: { type: Number, default: 0 },
    tied: { type: Number, default: 0 },
    noResult: { type: Number, default: 0 },

    points: { type: Number, default: 0 },

    // Net Run Rate inputs, retained so NRR can be recalculated without replaying every match
    runsScored: { type: Number, default: 0 },
    oversFaced: { type: Number, default: 0 }, // decimal overs faced while batting
    runsConceded: { type: Number, default: 0 },
    oversBowled: { type: Number, default: 0 }, // decimal overs bowled

    netRunRate: { type: Number, default: 0 },

    position: { type: Number, default: null },
  },
  { timestamps: true }
);

pointsTableSchema.index({ tournament: 1, team: 1 }, { unique: true });
pointsTableSchema.index({ tournament: 1, points: -1, netRunRate: -1 });

module.exports = mongoose.model('PointsTable', pointsTableSchema);
