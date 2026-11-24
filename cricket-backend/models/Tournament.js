const mongoose = require('mongoose');
const { Schema } = mongoose;

const TOURNAMENT_FORMATS = ['knockout', 'round-robin', 'round-robin-knockout', 'league'];
const TOURNAMENT_STATUS = ['upcoming', 'ongoing', 'completed', 'cancelled'];

const tournamentSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 150, index: true },
    logo: { type: String, default: null },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    venue: { type: String, default: null },
    organizer: { type: String, default: null },
    format: { type: String, enum: TOURNAMENT_FORMATS, default: 'round-robin' },
    matchType: { type: String, enum: ['T20', 'ODI', 'Test', 'Custom'], default: 'T20' },
    oversPerMatch: { type: Number, default: 20 },
    teams: [{ type: Schema.Types.ObjectId, ref: 'Team' }],
    status: { type: String, enum: TOURNAMENT_STATUS, default: 'upcoming', index: true },
    pointsSystem: {
      win: { type: Number, default: 2 },
      tie: { type: Number, default: 1 },
      loss: { type: Number, default: 0 },
      noResult: { type: Number, default: 1 },
    },
    locality: { type: Schema.Types.ObjectId, ref: 'Locality', default: null, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

tournamentSchema.index({ locality: 1, status: 1 });
tournamentSchema.index({ status: 1, startDate: -1 });
tournamentSchema.index({ name: 'text' });

module.exports = mongoose.model('Tournament', tournamentSchema);
module.exports.TOURNAMENT_FORMATS = TOURNAMENT_FORMATS;
module.exports.TOURNAMENT_STATUS = TOURNAMENT_STATUS;
