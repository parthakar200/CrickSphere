
const mongoose = require('mongoose');
const { Schema } = mongoose;

const teamSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100, index: true },
    shortName: { type: String, required: true, trim: true, uppercase: true, maxlength: 6 },
    logo: { type: String, default: null },
    homeGround: { type: String, default: null },
    coach: { type: String, default: null },
    captain: { type: Schema.Types.ObjectId, ref: 'Player', default: null },
    // Tournament this team instance belongs to. null => a standalone/global team usable in single matches.
    tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', default: null, index: true },
    locality: { type: Schema.Types.ObjectId, ref: 'Locality', default: null, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

teamSchema.index({ name: 1, locality: 1, tournament: 1 }, { unique: true });
teamSchema.index({ shortName: 1, locality: 1, tournament: 1 });

module.exports = mongoose.model('Team', teamSchema);