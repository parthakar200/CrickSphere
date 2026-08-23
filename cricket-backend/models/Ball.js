const mongoose = require('mongoose');
const { Schema } = mongoose;

const EXTRA_TYPES = ['none', 'wide', 'no-ball', 'bye', 'leg-bye', 'penalty'];
const DISMISSAL_TYPES = [
  'none',
  'bowled',
  'caught',
  'lbw',
  'run-out',
  'stumped',
  'hit-wicket',
  'retired-out',
  'obstructing-field',
  'timed-out',
  'handled-ball',
];

const ballSchema = new Schema(
  {
    match: { type: Schema.Types.ObjectId, ref: 'Match', required: true, index: true },
    innings: { type: Schema.Types.ObjectId, ref: 'Innings', required: true, index: true },
    over: { type: Schema.Types.ObjectId, ref: 'Over', required: true, index: true },

    overNumber: { type: Number, required: true }, // 1-indexed, denormalized for fast queries
    ballNumberInOver: { type: Number, required: true }, // 1-6 normally; legal balls only increment this

    striker: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
    nonStriker: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
    bowler: { type: Schema.Types.ObjectId, ref: 'Player', required: true },

    runsScored: { type: Number, default: 0 }, // runs off the bat only
    isLegal: { type: Boolean, default: true }, // false for wide/no-ball (does not count toward over's 6 balls)

    extra: {
      type: { type: String, enum: EXTRA_TYPES, default: 'none' },
      runs: { type: Number, default: 0 },
    },

    isWicket: { type: Boolean, default: false },
    wicket: {
      dismissalType: { type: String, enum: DISMISSAL_TYPES, default: 'none' },
      playerOut: { type: Schema.Types.ObjectId, ref: 'Player', default: null },
      fielder: { type: Schema.Types.ObjectId, ref: 'Player', default: null },
      bowlerCredited: { type: Boolean, default: true },
    },

    isFour: { type: Boolean, default: false },
    isSix: { type: Boolean, default: false },
    isDotBall: { type: Boolean, default: false },

    totalRuns: { type: Number, default: 0 }, // runsScored + extra.runs, i.e. what gets added to team score

    commentary: { type: String, default: '', maxlength: 500 },

    wagonWheel: {
      x: { type: Number, default: null },
      y: { type: Number, default: null },
      zone: { type: Number, default: null },
    },

    scoredBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

ballSchema.index({ match: 1, innings: 1, overNumber: 1, ballNumberInOver: 1 });
ballSchema.index({ striker: 1 });
ballSchema.index({ bowler: 1 });
ballSchema.index({ 'wicket.playerOut': 1 });

module.exports = mongoose.model('Ball', ballSchema);
module.exports.EXTRA_TYPES = EXTRA_TYPES;
module.exports.DISMISSAL_TYPES = DISMISSAL_TYPES;
