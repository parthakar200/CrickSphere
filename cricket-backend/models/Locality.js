const mongoose = require('mongoose');
const { Schema } = mongoose;

const localitySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100, unique: true },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    description: { type: String, default: null },
    district: { type: String, default: null },
    state: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false },
    lastAuctionSyncedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Locality', localitySchema);
