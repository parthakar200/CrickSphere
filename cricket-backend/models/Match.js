const mongoose = require('mongoose');
const { Schema } = mongoose;

const MATCH_TYPES = ['T20', 'ODI', 'Test', 'Custom'];
const MATCH_MODES = ['single', 'tournament'];
const MATCH_STAGE = ['league', 'quarter-final', 'semi-final', 'final', 'eliminator'];
const MATCH_STATUS = ['scheduled', 'toss', 'live', 'innings-break', 'completed', 'abandoned', 'no-result'];

const matchSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },

    mode: { type: String, enum: MATCH_MODES, required: true, index: true },
    tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', default: null, index: true },
    stage: { type: String, enum: MATCH_STAGE, default: 'league' },

    teamA: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    teamB: { type: Schema.Types.ObjectId, ref: 'Team', required: true },

    matchType: { type: String, enum: MATCH_TYPES, default: 'T20' },
    overs: { type: Number, required: true, min: 1 },
    ballsPerOver: { type: Number, default: 6 },

    venue: { type: String, default: null },
    scheduledAt: { type: Date, default: Date.now },

    toss: {
      winner: { type: Schema.Types.ObjectId, ref: 'Team', default: null },
      decision: { type: String, enum: ['bat', 'bowl', null], default: null },
    },

    status: { type: String, enum: MATCH_STATUS, default: 'scheduled', index: true },

    innings: [{ type: Schema.Types.ObjectId, ref: 'Innings' }],
    currentInnings: { type: Number, default: 0 },

    teamAPlayingXI: [{ type: Schema.Types.ObjectId, ref: 'Player' }],
    teamBPlayingXI: [{ type: Schema.Types.ObjectId, ref: 'Player' }],

    result: {
      winner: { type: Schema.Types.ObjectId, ref: 'Team', default: null },
      winMargin: { type: String, default: null },
      isTie: { type: Boolean, default: false },
      isNoResult: { type: Boolean, default: false },
      playerOfTheMatch: { type: Schema.Types.ObjectId, ref: 'Player', default: null },
    },

    locality: { type: Schema.Types.ObjectId, ref: 'Locality', default: null, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    scorers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

matchSchema.index({ locality: 1, status: 1 });
matchSchema.index({ locality: 1, scheduledAt: -1 });
matchSchema.index({ mode: 1, status: 1 });
matchSchema.index({ tournament: 1, stage: 1 });
matchSchema.index({ teamA: 1, teamB: 1 });
matchSchema.index({ scheduledAt: -1 });

module.exports = mongoose.model('Match', matchSchema);
module.exports.MATCH_TYPES = MATCH_TYPES;
module.exports.MATCH_MODES = MATCH_MODES;
module.exports.MATCH_STATUS = MATCH_STATUS;
