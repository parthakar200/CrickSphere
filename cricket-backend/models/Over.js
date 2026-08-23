const mongoose = require('mongoose');
const { Schema } = mongoose;

const overSchema = new Schema(
  {
    innings: { type: Schema.Types.ObjectId, ref: 'Innings', required: true, index: true },
    overNumber: { type: Number, required: true }, // 1-indexed
    bowler: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
    balls: [{ type: Schema.Types.ObjectId, ref: 'Ball' }],

    runsConceded: { type: Number, default: 0 },
    wicketsTaken: { type: Number, default: 0 },
    isMaiden: { type: Boolean, default: false },
    isCompleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

overSchema.index({ innings: 1, overNumber: 1 }, { unique: true });

module.exports = mongoose.model('Over', overSchema);
