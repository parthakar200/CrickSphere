const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * One document per (tournament, player) — a player's single, exclusive team
 * commitment for that tournament. `tournament` is denormalized from the
 * team's own `tournament` field at squad-add time (see
 * tournamentSquadController.js#addToSquad) purely so the unique index below
 * can enforce exclusivity without a join: MongoDB itself rejects a second
 * insert for the same (tournament, player) pair, so "a player can only be on
 * one team per tournament" is a structural guarantee, not an app-level check
 * that could be forgotten in some code path.
 *
 * Deliberately does NOT exist for standalone (tournament: null) teams —
 * single matches have no persistent roster at all; who plays for whom is
 * decided fresh per match via Match.teamAPlayingXI/teamBPlayingXI, with no
 * cross-match exclusivity implied.
 */
const tournamentSquadSchema = new Schema(
  {
    tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true, index: true },
    team: { type: Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    player: { type: Schema.Types.ObjectId, ref: 'Player', required: true, index: true },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// The actual enforcement mechanism: one row per player per tournament, full stop.
tournamentSquadSchema.index({ tournament: 1, player: 1 }, { unique: true });
// Fast lookup of "who's on team X's squad" for eligible-players / Playing XI validation.
tournamentSquadSchema.index({ team: 1 });

module.exports = mongoose.model('TournamentSquad', tournamentSquadSchema);