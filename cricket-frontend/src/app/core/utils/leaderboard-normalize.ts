import { CareerStats } from '../models';
import { LeaderboardPlayerSummary, LeaderboardRow } from '../services/leaderboard.service';

/**
 * The backend's leaderboard endpoints return ONE of two shapes depending on
 * whether a `?tournament=` filter was applied:
 *
 *  - No tournament filter -> a populated CareerStats document:
 *      { player, matchesPlayed, batting: { runs, strikeRate, ... }, bowling: {...}, fielding: {...} }
 *  - Tournament filter applied -> a flat Mongo aggregation row:
 *      { player, runs, ballsFaced, sixes, ... } (fields live at the top level,
 *      not nested under batting/bowling)
 *
 * `fielding?type=all` is a special case: it ALWAYS returns the flat shape,
 * even with no tournament filter, because it's computed via `.aggregate()`
 * rather than `.find()` on the backend.
 *
 * Rather than have every leaderboard table component branch on which shape
 * it received, every `normalize*` function below maps both shapes into one
 * flat row type so the templates can just read consistent field names.
 *
 * `RawRow` describes every optional field either shape might carry, on top
 * of the base `LeaderboardRow` type actually returned by LeaderboardService
 * — callers pass `LeaderboardRow[]` and each function casts internally,
 * rather than every call site needing its own unsafe cast.
 */
type RawRow = LeaderboardRow & {
  matches?: number;
  matchesPlayed?: number;
  innings?: number;
  runs?: number;
  ballsFaced?: number;
  highestScore?: number;
  fours?: number;
  sixes?: number;
  strikeRate?: number;
  wickets?: number;
  overs?: number;
  ballsBowled?: number;
  runsConceded?: number;
  economy?: number;
  average?: number;
  dotBalls?: number;
  catches?: number;
  runOuts?: number;
  stumpings?: number;
  total?: number;
  totalDismissals?: number;
  batting?: CareerStats['batting'];
  bowling?: CareerStats['bowling'];
  fielding?: CareerStats['fielding'];
};

export interface BattingLeaderboardRow {
  rank: number;
  player: LeaderboardPlayerSummary;
  matches: number;
  innings: number;
  runs: number;
  highestScore: number;
  average: number;
  strikeRate: number;
  fifties: number;
  hundreds: number;
  fours: number;
  sixes: number;
}

export interface BowlingLeaderboardRow {
  rank: number;
  player: LeaderboardPlayerSummary;
  matches: number;
  overs: number;
  wickets: number;
  average: number | null;
  economy: number;
}

export interface SimpleCountRow {
  rank: number;
  player: LeaderboardPlayerSummary;
  count: number;
}

export interface FieldingLeaderboardRow {
  rank: number;
  player: LeaderboardPlayerSummary;
  catches: number;
  runOuts: number;
  stumpings: number;
  total: number;
}

export interface StrikeRateRow {
  rank: number;
  player: LeaderboardPlayerSummary;
  runs: number;
  ballsFaced: number;
  strikeRate: number;
}

export interface EconomyRow {
  rank: number;
  player: LeaderboardPlayerSummary;
  overs: number;
  runsConceded: number;
  economy: number;
}

function isCareerStatsShape(row: RawRow): boolean {
  return row.batting !== undefined || row.bowling !== undefined;
}

export function normalizeBattingRows(rows: LeaderboardRow[]): BattingLeaderboardRow[] {
  return (rows as RawRow[]).map((row) => {
    if (isCareerStatsShape(row) && row.batting) {
      return {
        rank: row.rank,
        player: row.player,
        matches: row.matchesPlayed ?? 0,
        innings: row.batting.innings,
        runs: row.batting.runs,
        highestScore: row.batting.highestScore,
        average: row.batting.average,
        strikeRate: row.batting.strikeRate,
        fifties: row.batting.fifties,
        hundreds: row.batting.hundreds,
        fours: row.batting.fours,
        sixes: row.batting.sixes,
      };
    }
    // Flat tournament-scoped aggregation row.
    return {
      rank: row.rank,
      player: row.player,
      matches: row.matches ?? 0,
      innings: row.innings ?? 0,
      runs: row.runs ?? 0,
      highestScore: row.highestScore ?? 0,
      average: 0, // not computed by the tournament-scoped aggregation; omitted from the table in that mode
      strikeRate: row.strikeRate ?? (row.runs && row.ballsFaced ? (row.runs / row.ballsFaced) * 100 : 0),
      fifties: 0,
      hundreds: 0,
      fours: row.fours ?? 0,
      sixes: row.sixes ?? 0,
    };
  });
}

export function normalizeBowlingRows(rows: LeaderboardRow[]): BowlingLeaderboardRow[] {
  return (rows as RawRow[]).map((row) => {
    if (isCareerStatsShape(row) && row.bowling) {
      return {
        rank: row.rank,
        player: row.player,
        matches: row.matchesPlayed ?? 0,
        overs: Number((row.bowling.ballsBowled / 6).toFixed(1)),
        wickets: row.bowling.wickets,
        average: row.bowling.average,
        economy: row.bowling.economy,
      };
    }
    return {
      rank: row.rank,
      player: row.player,
      matches: row.matches ?? 0,
      overs: row.overs ?? (row.ballsBowled ? Number((row.ballsBowled / 6).toFixed(1)) : 0),
      wickets: row.wickets ?? 0,
      average: row.average ?? null,
      economy: row.economy ?? 0,
    };
  });
}

/** For most-sixes / most-fours / most-dot-balls — a single "count" stat per player. */
export function normalizeSimpleCountRows(
  rows: LeaderboardRow[],
  field: 'sixes' | 'fours' | 'dotBalls'
): SimpleCountRow[] {
  return (rows as RawRow[]).map((row) => {
    if (isCareerStatsShape(row)) {
      const count =
        field === 'dotBalls' ? row.bowling?.dotBalls ?? 0 : (row.batting?.[field] as number | undefined) ?? 0;
      return { rank: row.rank, player: row.player, count };
    }
    return { rank: row.rank, player: row.player, count: (row[field] as number | undefined) ?? 0 };
  });
}

export function normalizeStrikeRateRows(rows: LeaderboardRow[]): StrikeRateRow[] {
  return (rows as RawRow[]).map((row) => {
    if (isCareerStatsShape(row) && row.batting) {
      return {
        rank: row.rank,
        player: row.player,
        runs: row.batting.runs,
        ballsFaced: row.batting.ballsFaced,
        strikeRate: row.batting.strikeRate,
      };
    }
    return {
      rank: row.rank,
      player: row.player,
      runs: row.runs ?? 0,
      ballsFaced: row.ballsFaced ?? 0,
      strikeRate: row.strikeRate ?? 0,
    };
  });
}

export function normalizeEconomyRows(rows: LeaderboardRow[]): EconomyRow[] {
  return (rows as RawRow[]).map((row) => {
    if (isCareerStatsShape(row) && row.bowling) {
      return {
        rank: row.rank,
        player: row.player,
        overs: Number((row.bowling.ballsBowled / 6).toFixed(1)),
        runsConceded: row.bowling.runsConceded,
        economy: row.bowling.economy,
      };
    }
    return {
      rank: row.rank,
      player: row.player,
      overs: row.overs ?? 0,
      runsConceded: row.runsConceded ?? 0,
      economy: row.economy ?? 0,
    };
  });
}

export function normalizeFieldingRows(rows: LeaderboardRow[]): FieldingLeaderboardRow[] {
  return (rows as RawRow[]).map((row) => {
    if (isCareerStatsShape(row) && row.fielding) {
      return {
        rank: row.rank,
        player: row.player,
        catches: row.fielding.catches,
        runOuts: row.fielding.runOuts,
        stumpings: row.fielding.stumpings,
        total: row.fielding.catches + row.fielding.runOuts + row.fielding.stumpings,
      };
    }
    return {
      rank: row.rank,
      player: row.player,
      catches: row.catches ?? 0,
      runOuts: row.runOuts ?? 0,
      stumpings: row.stumpings ?? 0,
      total: row.total ?? row.totalDismissals ?? 0,
    };
  });
}
