import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap } from 'rxjs';
import { LeaderboardPlayerSummary, LeaderboardRow, LeaderboardService } from '../../core/services/leaderboard.service';
import { TournamentService } from '../../core/services/tournament.service';
import { QueryParams } from '../../core/services/api.service';
import {
  normalizeBattingRows,
  normalizeBowlingRows,
  normalizeSimpleCountRows,
  normalizeFieldingRows,
  normalizeStrikeRateRows,
  normalizeEconomyRows,
} from '../../core/utils/leaderboard-normalize';

type LeaderboardTab =
  | 'most-runs'
  | 'best-strike-rate'
  | 'most-sixes'
  | 'most-fours'
  | 'most-wickets'
  | 'best-economy'
  | 'most-dot-balls'
  | 'best-bowling-average'
  | 'fielding';

const TAB_LABELS: Record<LeaderboardTab, string> = {
  'most-runs': 'Most Runs',
  'best-strike-rate': 'Best Strike Rate',
  'most-sixes': 'Most Sixes',
  'most-fours': 'Most Fours',
  'most-wickets': 'Most Wickets',
  'best-economy': 'Best Economy',
  'most-dot-balls': 'Most Dot Balls',
  'best-bowling-average': 'Best Bowling Average',
  fielding: 'Fielding',
};

@Component({
  selector: 'app-leaderboards',
  imports: [DecimalPipe],
  templateUrl: './leaderboards.html',
  styleUrl: './leaderboards.scss',
})
export class Leaderboards {
  private leaderboardService = inject(LeaderboardService);
  private tournamentService = inject(TournamentService);

  tabs = Object.keys(TAB_LABELS) as LeaderboardTab[];
  tabLabel = (tab: LeaderboardTab) => TAB_LABELS[tab];

  activeTab = signal<LeaderboardTab>('most-runs');
  selectedTournament = signal<string>(''); // '' = all-time career stats across everything
  isTournamentScoped = computed(() => !!this.selectedTournament());
  minBalls = signal(30);
  minOvers = signal(4);
  minWickets = signal(5);
  fieldingType = signal<'all' | 'catches' | 'runOuts' | 'stumpings'>('all');

  tournaments = toSignal(this.tournamentService.list({ limit: 100 }).pipe(catchError(() => of(null))), {
    initialValue: null,
  });

  private fetchParams = computed(() => ({
    tab: this.activeTab(),
    tournament: this.selectedTournament() || undefined,
    minBalls: this.minBalls(),
    minOvers: this.minOvers(),
    minWickets: this.minWickets(),
    type: this.fieldingType(),
    limit: 50,
  }));

  // Re-fetches whenever the active tab OR any filter signal changes, via one
  // combined params signal rather than nested observables. Each tab's own
  // filter inputs (minBalls/minOvers/minWickets/fieldingType) are harmless
  // extra query params on tabs that ignore them — the backend simply
  // doesn't read params it doesn't expect for a given endpoint.
  private rawRows = toSignal(
    toObservable(this.fetchParams).pipe(
      switchMap(({ tab, ...params }) => this.fetchForTab(tab, params).pipe(catchError(() => of([]))))
    ),
    { initialValue: [] as LeaderboardRow[] }
  );

  private fetchForTab(tab: LeaderboardTab, params: QueryParams) {
    switch (tab) {
      case 'most-runs':
        return this.leaderboardService.mostRuns(params).pipe(switchMap((r) => of(r.data)));
      case 'best-strike-rate':
        return this.leaderboardService.bestStrikeRate(params).pipe(switchMap((r) => of(r.data)));
      case 'most-sixes':
        return this.leaderboardService.mostSixes(params).pipe(switchMap((r) => of(r.data)));
      case 'most-fours':
        return this.leaderboardService.mostFours(params).pipe(switchMap((r) => of(r.data)));
      case 'most-wickets':
        return this.leaderboardService.mostWickets(params).pipe(switchMap((r) => of(r.data)));
      case 'best-economy':
        return this.leaderboardService.bestEconomy(params).pipe(switchMap((r) => of(r.data)));
      case 'most-dot-balls':
        return this.leaderboardService.mostDotBalls(params).pipe(switchMap((r) => of(r.data)));
      case 'best-bowling-average':
        return this.leaderboardService.bestBowlingAverage(params).pipe(switchMap((r) => of(r.data)));
      case 'fielding':
        return this.leaderboardService.fielding(params).pipe(switchMap((r) => of(r.data)));
    }
  }

  battingRows = () => (this.activeTab() === 'most-runs' ? normalizeBattingRows(this.rawRows()) : []);
  bowlingRows = () =>
    this.activeTab() === 'most-wickets' || this.activeTab() === 'best-bowling-average'
      ? normalizeBowlingRows(this.rawRows())
      : [];
  simpleCountRows = () => {
    const tab = this.activeTab();
    const field = tab === 'most-sixes' ? 'sixes' : tab === 'most-fours' ? 'fours' : 'dotBalls';
    return ['most-sixes', 'most-fours', 'most-dot-balls'].includes(tab)
      ? normalizeSimpleCountRows(this.rawRows(), field)
      : [];
  };
  fieldingRows = () => (this.activeTab() === 'fielding' ? normalizeFieldingRows(this.rawRows()) : []);
  strikeRateRows = () =>
    this.activeTab() === 'best-strike-rate' ? normalizeStrikeRateRows(this.rawRows()) : [];
  economyRows = () => (this.activeTab() === 'best-economy' ? normalizeEconomyRows(this.rawRows()) : []);

  playerName(player: LeaderboardPlayerSummary): string {
    return player?.name ?? 'Unknown';
  }

  teamLabel(player: LeaderboardPlayerSummary): string {
    const team = player?.team;
    if (!team) return '—';
    return typeof team === 'string' ? team : team.shortName;
  }
}
