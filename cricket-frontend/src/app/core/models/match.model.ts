
import { Team, TeamRosterPlayer } from './player.model';

export type TournamentFormat = 'knockout' | 'round-robin' | 'round-robin-knockout' | 'league';
export type TournamentStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
export type MatchType = 'T20' | 'ODI' | 'Test' | 'Custom';
export type MatchMode = 'single' | 'tournament';
export type MatchStatus =
  | 'scheduled'
  | 'toss'
  | 'live'
  | 'innings-break'
  | 'completed'
  | 'abandoned'
  | 'no-result';

export interface Tournament {
  _id: string;
  name: string;
  logo?: string | null;
  startDate: string;
  endDate: string;
  venue?: string | null;
  organizer?: string | null;
  format: TournamentFormat;
  matchType: MatchType;
  oversPerMatch: number;
  teams: Team[] | string[];
  status: TournamentStatus;
  pointsSystem: { win: number; tie: number; loss: number; noResult: number };
}

export interface Match {
  _id: string;
  name: string;
  mode: MatchMode;
  tournament?: Tournament | string | null;
  stage: string;
  teamA: Team | string;
  teamB: Team | string;
  matchType: MatchType;
  overs: number;
  ballsPerOver: number;
  venue?: string | null;
  scheduledAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  toss: { winner: string | null; decision: 'bat' | 'bowl' | null };
  status: MatchStatus;
  /**
   * The actual eligible players for this match — separate from a
   * tournament team's full squad (see TournamentSquad). Empty until set via
   * PATCH /matches/:id/playing-xi; the toss is blocked until both are
   * non-empty (see LiveMatch's needsPlayingXI gate). Populated with
   * TeamRosterPlayer objects by getLiveScorecard/getMatchById; plain
   * ObjectId strings would appear here only if some other endpoint
   * returned Match without that populate.
   */
  teamAPlayingXI: TeamRosterPlayer[] | string[];
  teamBPlayingXI: TeamRosterPlayer[] | string[];
  innings: Innings[] | string[];
  currentInnings: number;
  result: {
    winner: string | null;
    winMargin: string | null;
    isTie: boolean;
    isNoResult: boolean;
    playerOfTheMatch: string | null;
  };
}

/**
 * What GET /matches/:id/live populates onto each entry of `innings.overs`:
 * the Over document's own fields (bowler stays an unpopulated ObjectId
 * string — there's no nested populate selecting a name on it) plus its
 * `balls` fully populated (see live-match.model.ts for the Ball shape).
 */
export interface Over {
  _id: string;
  innings: string;
  overNumber: number;
  bowler: string;
  balls: import('./live-match.model').Ball[];
  runsConceded: number;
  wicketsTaken: number;
  isMaiden: boolean;
  isCompleted: boolean;
}

export interface Innings {
  _id: string;
  match: string;
  inningsNumber: number;
  battingTeam: Team | string;
  bowlingTeam: Team | string;
  totalRuns: number;
  totalWickets: number;
  totalOvers: number;
  totalBalls: number;
  extras: { wides: number; noBalls: number; byes: number; legByes: number; penalty: number };
  target: number | null;
  currentStrikerBatsman?: { _id: string; name: string } | string | null;
  currentNonStrikerBatsman?: { _id: string; name: string } | string | null;
  currentBowler?: { _id: string; name: string } | string | null;
  overs: Over[] | string[];
  fallOfWickets: Array<{
    wicketNumber: number;
    score: number;
    overs: number;
    playerOut: string;
    dismissalType: string;
  }>;
  partnerships: Array<{
    batsman1: string;
    batsman2: string;
    runs: number;
    balls: number;
    isActive: boolean;
  }>;
  isCompleted: boolean;
}

export interface PointsTableRow {
  _id: string;
  tournament: string;
  team: Team | string;
  played: number;
  won: number;
  lost: number;
  tied: number;
  noResult: number;
  points: number;
  netRunRate: number;
  position: number | null;
}