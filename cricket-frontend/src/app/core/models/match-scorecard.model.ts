import { DismissalType } from './live-match.model';
import { Innings, Match } from './match.model';

/**
 * Distinct from BattingStatRow in live-match.model.ts: that one comes from
 * GET /matches/:id/live, which only needs the CURRENT innings and leaves
 * `player` as a raw id (resolved separately against the roster). This one
 * comes from GET /matches/:id/scorecard (matchController.js#getMatchScorecard),
 * which populates `player`/`bowlerOut`/`fielderOut` with names directly,
 * since a full scorecard page has no separate roster fetch to resolve
 * against.
 */
export interface ScorecardBattingRow {
  _id: string;
  player: { _id: string; name: string };
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  isOut: boolean;
  dismissalType: DismissalType | 'not-out';
  bowlerOut: { _id: string; name: string } | null;
  fielderOut: { _id: string; name: string } | null;
  battingPosition: number | null;
}

export interface ScorecardBowlingRow {
  _id: string;
  player: { _id: string; name: string };
  oversBowled: number;
  maidens: number;
  runsConceded: number;
  wickets: number;
  economy: number;
  dotBalls: number;
  wides: number;
  noBalls: number;
}

export interface ScorecardInnings {
  _id: string;
  inningsNumber: number;
  battingTeam: Innings['battingTeam'];
  bowlingTeam: Innings['bowlingTeam'];
  totalRuns: number;
  totalWickets: number;
  totalOvers: number;
  extras: Innings['extras'];
  fallOfWickets: Innings['fallOfWickets'];
  isCompleted: boolean;
  battingStats: ScorecardBattingRow[];
  bowlingStats: ScorecardBowlingRow[];
}

export interface MatchScorecard {
  match: Match;
  innings: ScorecardInnings[];
}