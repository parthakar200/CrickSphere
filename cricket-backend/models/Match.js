// const mongoose = require('mongoose');
// const { Schema } = mongoose;

// const MATCH_TYPES = ['T20', 'ODI', 'Test', 'Custom'];
// const MATCH_MODES = ['single', 'tournament'];
// const MATCH_STAGE = ['league', 'quarter-final', 'semi-final', 'final', 'eliminator'];
// const MATCH_STATUS = ['scheduled', 'toss', 'live', 'innings-break', 'completed', 'abandoned', 'no-result'];

// const matchSchema = new Schema(
//   {
//     name: { type: String, required: true, trim: true, maxlength: 150 },

//     // Distinguishes a standalone match from one belonging to a tournament.
//     // This single flag is what lets the stats engine aggregate BOTH kinds together
//     // by always writing into the same BattingStats/BowlingStats/CareerStats documents.
//     mode: { type: String, enum: MATCH_MODES, required: true, index: true },
//     tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', default: null, index: true },
//     stage: { type: String, enum: MATCH_STAGE, default: 'league' },

//     teamA: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
//     teamB: { type: Schema.Types.ObjectId, ref: 'Team', required: true },

//     matchType: { type: String, enum: MATCH_TYPES, default: 'T20' },
//     overs: { type: Number, required: true, min: 1 }, // overs per innings; Test matches can set a large nominal value
//     ballsPerOver: { type: Number, default: 6 },

//     venue: { type: String, default: null },
//     scheduledAt: { type: Date, default: null },

//     toss: {
//       winner: { type: Schema.Types.ObjectId, ref: 'Team', default: null },
//       decision: { type: String, enum: ['bat', 'bowl', null], default: null },
//     },

//     status: { type: String, enum: MATCH_STATUS, default: 'scheduled', index: true },

//     innings: [{ type: Schema.Types.ObjectId, ref: 'Innings' }],

//     currentInnings: { type: Number, default: 0 }, // 1 or 2 (or 3/4 for Test)

//     result: {
//       winner: { type: Schema.Types.ObjectId, ref: 'Team', default: null },
//       winMargin: { type: String, default: null }, // e.g. "won by 5 wickets" / "won by 20 runs"
//       isTie: { type: Boolean, default: false },
//       isNoResult: { type: Boolean, default: false },
//       playerOfTheMatch: { type: Schema.Types.ObjectId, ref: 'Player', default: null },
//     },

//     createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
//     scorers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
//   },
//   { timestamps: true }
// );

// matchSchema.index({ mode: 1, status: 1 });
// matchSchema.index({ tournament: 1, stage: 1 });
// matchSchema.index({ teamA: 1, teamB: 1 });
// matchSchema.index({ scheduledAt: -1 });

// module.exports = mongoose.model('Match', matchSchema);
// module.exports.MATCH_TYPES = MATCH_TYPES;
// module.exports.MATCH_MODES = MATCH_MODES;
// module.exports.MATCH_STATUS = MATCH_STATUS;














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
    scheduledAt: { type: Date, default: null },

    toss: {
      winner: { type: Schema.Types.ObjectId, ref: 'Team', default: null },
      decision: { type: String, enum: ['bat', 'bowl', null], default: null },
    },

    status: { type: String, enum: MATCH_STATUS, default: 'scheduled', index: true },

    innings: [{ type: Schema.Types.ObjectId, ref: 'Innings' }],

    currentInnings: { type: Number, default: 0 },

    // The actual players eligible to take part in THIS match — distinct from
    // a tournament team's full TournamentSquad (which can be larger, e.g.
    // 15-18 registered players; only 11+ of them are picked here per match).
    // For 'single' mode matches there's no squad at all, so these are chosen
    // fresh from the entire player pool every time (see
    // matchController.js#setPlayingXI) with no persistent membership implied.
    // Empty until the scorer/admin sets them — see LiveMatch's
    // needsPlayingXI gate, which blocks the toss until both are non-empty.
    teamAPlayingXI: [{ type: Schema.Types.ObjectId, ref: 'Player' }],
    teamBPlayingXI: [{ type: Schema.Types.ObjectId, ref: 'Player' }],

    result: {
      winner: { type: Schema.Types.ObjectId, ref: 'Team', default: null },
      winMargin: { type: String, default: null },
      isTie: { type: Boolean, default: false },
      isNoResult: { type: Boolean, default: false },
      playerOfTheMatch: { type: Schema.Types.ObjectId, ref: 'Player', default: null },
    },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    scorers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

matchSchema.index({ mode: 1, status: 1 });
matchSchema.index({ tournament: 1, stage: 1 });
matchSchema.index({ teamA: 1, teamB: 1 });
matchSchema.index({ scheduledAt: -1 });

module.exports = mongoose.model('Match', matchSchema);
module.exports.MATCH_TYPES = MATCH_TYPES;
module.exports.MATCH_MODES = MATCH_MODES;
module.exports.MATCH_STATUS = MATCH_STATUS;