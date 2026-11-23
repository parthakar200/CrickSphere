
export type PlayerRole = 'batsman' | 'bowler' | 'all-rounder' | 'wicket-keeper';
export type BattingStyle = 'right-hand-bat' | 'left-hand-bat';
export type BowlingStyle =
  | 'right-arm-fast'
  | 'right-arm-medium'
  | 'right-arm-off-break'
  | 'right-arm-leg-break'
  | 'left-arm-fast'
  | 'left-arm-medium'
  | 'left-arm-orthodox'
  | 'left-arm-chinaman'
  | 'none';

/**
 * What the backend populates onto `team.captain` — `.populate('captain',
 * 'name role photo')`. Deliberately its own (even smaller) type rather than
 * reusing TeamRosterPlayer, which requires battingStyle/bowlingStyle that
 * the captain populate doesn't select.
 */
export interface TeamCaptainSummary {
  _id: string;
  name: string;
  role: PlayerRole;
  photo?: string | null;
}

export interface Team {
  _id: string;
  name: string;
  shortName: string;
  logo?: string | null;
  homeGround?: string | null;
  coach?: string | null;
  captain?: TeamCaptainSummary | string | null;
  tournament?: string | { _id: string; name: string } | null;
  isActive: boolean;
  createdAt: string;
}

export interface Player {
  _id: string;
  name: string;
  photo?: string | null;
  jerseyNumber?: number;
  dateOfBirth?: string | null;
  nationality?: string | null;
  role: PlayerRole;
  battingStyle: BattingStyle;
  bowlingStyle: BowlingStyle;
  isActive: boolean;
}

/**
 * What Match.teamAPlayingXI/teamBPlayingXI, TournamentSquad.player, and
 * GET /matches/:id/eligible-players all populate a player down to — see
 * matchController.js's `.populate('teamAPlayingXI', 'name role photo
 * jerseyNumber battingStyle bowlingStyle')` and
 * tournamentSquadController.js's equivalent populate. Notably missing
 * `isActive`, `dateOfBirth`, `nationality` compared to the full `Player`
 * model, so this is its own type rather than a (subtly wrong) reuse of
 * `Player`.
 */
export interface TeamRosterPlayer {
  _id: string;
  name: string;
  role: PlayerRole;
  photo?: string | null;
  jerseyNumber?: number;
  battingStyle: BattingStyle;
  bowlingStyle: BowlingStyle;
}

export interface CareerStats {
  player: string;
  matchesPlayed: number;
  singleMatchesPlayed: number;
  tournamentMatchesPlayed: number;
  batting: {
    innings: number;
    runs: number;
    ballsFaced: number;
    notOuts: number;
    highestScore: number;
    highestScoreIsNotOut: boolean;
    fours: number;
    sixes: number;
    fifties: number;
    hundreds: number;
    ducks: number;
    average: number;
    strikeRate: number;
  };
  bowling: {
    innings: number;
    ballsBowled: number;
    runsConceded: number;
    wickets: number;
    maidens: number;
    dotBalls: number;
    bestFigures: { wickets: number; runs: number; match: string | null };
    threeWicketHauls: number;
    fiveWicketHauls: number;
    average: number | null;
    economy: number;
    strikeRate: number | null;
  };
  fielding: {
    catches: number;
    runOuts: number;
    stumpings: number;
  };
}