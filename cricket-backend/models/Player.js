
const mongoose = require('mongoose');
const { Schema } = mongoose;

const PLAYER_ROLES = ['batsman', 'bowler', 'all-rounder', 'wicket-keeper'];
const BATTING_STYLES = ['right-hand-bat', 'left-hand-bat'];
const BOWLING_STYLES = [
  'right-arm-fast',
  'right-arm-medium',
  'right-arm-off-break',
  'right-arm-leg-break',
  'left-arm-fast',
  'left-arm-medium',
  'left-arm-orthodox',
  'left-arm-chinaman',
  'none',
];

const playerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100, index: true },
    photo: { type: String, default: null },
    jerseyNumber: { type: Number, min: 0, max: 999 },
    dateOfBirth: { type: Date, default: null },
    nationality: { type: String, default: null },
    role: { type: String, enum: PLAYER_ROLES, required: true },
    battingStyle: { type: String, enum: BATTING_STYLES, default: 'right-hand-bat' },
    bowlingStyle: { type: String, enum: BOWLING_STYLES, default: 'none' },
    isActive: { type: Boolean, default: true },
    locality: { type: Schema.Types.ObjectId, ref: 'Locality', default: null, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    auctionPlayerId: { type: String, unique: true, sparse: true, index: true },
  },
  { timestamps: true }
);

playerSchema.index({ name: 'text' });
playerSchema.index({ locality: 1, role: 1 });
playerSchema.index({ locality: 1, name: 1 });

module.exports = mongoose.model('Player', playerSchema);
module.exports.PLAYER_ROLES = PLAYER_ROLES;
module.exports.BATTING_STYLES = BATTING_STYLES;
module.exports.BOWLING_STYLES = BOWLING_STYLES;