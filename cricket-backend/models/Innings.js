const mongoose = require('mongoose');
const { Schema } = mongoose;

const fallOfWicketSchema = new Schema(
  {
    wicketNumber: { type: Number, required: true },
    score: { type: Number, required: true },
    overs: { type: Number, required: true }, // e.g. 12.3
    playerOut: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
    dismissalType: { type: String },
  },
  { _id: false }
);

const partnershipSchema = new Schema(
  {
    batsman1: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
    batsman2: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
    runs: { type: Number, default: 0 },
    balls: { type: Number, default: 0 },
    startOver: { type: Number, default: 0 },
    endOver: { type: Number, default: null },
    isActive: { type: Boolean, default: true },
  },
  { _id: false }
);

const inningsSchema = new Schema(
  {
    match: { type: Schema.Types.ObjectId, ref: 'Match', required: true, index: true },
    inningsNumber: { type: Number, required: true }, // 1, 2, 3, 4
    battingTeam: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    bowlingTeam: { type: Schema.Types.ObjectId, ref: 'Team', required: true },

    totalRuns: { type: Number, default: 0 },
    totalWickets: { type: Number, default: 0 },
    totalOvers: { type: Number, default: 0 }, // completed overs as a decimal, e.g. 19.4
    totalBalls: { type: Number, default: 0 }, // legal balls bowled, used for run-rate math

    extras: {
      wides: { type: Number, default: 0 },
      noBalls: { type: Number, default: 0 },
      byes: { type: Number, default: 0 },
      legByes: { type: Number, default: 0 },
      penalty: { type: Number, default: 0 },
    },

    target: { type: Number, default: null }, // set for 2nd innings of limited-overs matches

    overs: [{ type: Schema.Types.ObjectId, ref: 'Over' }],

    currentStrikerBatsman: { type: Schema.Types.ObjectId, ref: 'Player', default: null },
    currentNonStrikerBatsman: { type: Schema.Types.ObjectId, ref: 'Player', default: null },
    currentBowler: { type: Schema.Types.ObjectId, ref: 'Player', default: null },

    fallOfWickets: [fallOfWicketSchema],
    partnerships: [partnershipSchema],

    isCompleted: { type: Boolean, default: false },
    isDeclared: { type: Boolean, default: false }, // Test match declarations
  },
  { timestamps: true }
);

inningsSchema.index({ match: 1, inningsNumber: 1 }, { unique: true });

module.exports = mongoose.model('Innings', inningsSchema);
