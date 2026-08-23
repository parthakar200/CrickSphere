
import { Innings, Match } from './match.model';

export type ExtraType = 'none' | 'wide' | 'no-ball' | 'bye' | 'leg-bye' | 'penalty';
export type DismissalType =
  | 'none'
  | 'bowled'
  | 'caught'
  | 'lbw'
  | 'run-out'
  | 'stumped'
  | 'hit-wicket'
  | 'retired-out'
  | 'obstructing-field'
  | 'timed-out'
  | 'handled-ball';

/**
 * Note: the backend's GET /matches/:id/live endpoint populates each Over's
 * `balls`, but does NOT further populate striker/nonStriker/bowler/wicket.*
 * on those Ball documents (see matchController.js#getLiveScorecard) — they
 * come through as raw ObjectId strings. The UI resolves those IDs against
 * the team rosters fetched separately (see live-match.ts), rather than
 * expecting names directly on the ball.
 */
export interface Ball {
  _id: string;
  match: string;
  innings: string;
  over: string;
  overNumber: number;
  ballNumberInOver: number;
  striker: string;
  nonStriker: string;
  bowler: string;
  runsScored: number;
  isLegal: boolean;
  extra: { type: ExtraType; runs: number };
  isWicket: boolean;
  wicket: {
    dismissalType: DismissalType;
    playerOut: string | null;
    fielder: string | null;
    bowlerCredited: boolean;
  };
  isFour: boolean;
  isSix: boolean;
  isDotBall: boolean;
  totalRuns: number;
  commentary?: string;
}

export interface BattingStatRow {
  player: string;
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  isOut: boolean;
}

export interface LiveScorecardData {
  match: Match;
  currentInnings: Innings | null;
  runRate: number;
  requiredRunRate: number | null;
  recentBalls: Ball[];
  activePartnership: Innings['partnerships'][number] | null;
  battingStats: BattingStatRow[];
}

export interface RecordBallPayload {
  striker: string;
  nonStriker: string;
  bowler: string;
  runsScored?: number;
  extraType?: ExtraType;
  extraRuns?: number;
  isWicket?: boolean;
  wicket?: {
    dismissalType?: DismissalType;
    playerOut?: string;
    fielder?: string;
    bowlerCredited?: boolean;
  };
  commentary?: string;
}