import { Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap } from 'rxjs';
import { ChartConfiguration } from 'chart.js';
import { StatisticsService, StatisticsOverview } from '../../core/services/statistics.service';
import { LiveTickerService } from '../../core/services/live-ticker.service';
import { LocalityService } from '../../core/services/locality.service';
import { AuthService } from '../../core/services/auth.service';
import { StatCard } from '../../shared/components/stat-card/stat-card';
import { AppChart } from '../../shared/components/chart/chart';
import { Team } from '../../core/models';

const EMPTY_OVERVIEW: StatisticsOverview = {
  totalPlayers: 0,
  totalTeams: 0,
  totalMatches: 0,
  completedMatches: 0,
  totalRuns: 0,
  totalSixes: 0,
  totalFours: 0,
  totalWickets: 0,
};

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, StatCard, AppChart, DatePipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private statistics = inject(StatisticsService);
  private liveTicker = inject(LiveTickerService);
  private localityService = inject(LocalityService);
  auth = inject(AuthService);

  private localityId$ = toObservable(this.localityService.selectedLocalityId);

  overview = toSignal(
    this.localityId$.pipe(
      switchMap(() => this.statistics.getOverview().pipe(catchError(() => of(EMPTY_OVERVIEW))))
    ),
    { initialValue: EMPTY_OVERVIEW }
  );

  liveMatches = toSignal(
    this.localityId$.pipe(
      switchMap(() => this.liveTicker.getLiveMatches().pipe(catchError(() => of([]))))
    ),
    { initialValue: [] }
  );

  battingAnalytics = toSignal(
    this.localityId$.pipe(
      switchMap(() => this.statistics.getBattingAnalytics().pipe(catchError(() => of({ topRunScorers: [] }))))
    ),
    { initialValue: { topRunScorers: [] } }
  );

  bowlingAnalytics = toSignal(
    this.localityId$.pipe(
      switchMap(() => this.statistics.getBowlingAnalytics().pipe(catchError(() => of({ topWicketTakers: [] }))))
    ),
    { initialValue: { topWicketTakers: [] } }
  );

  runsChartData = computed<ChartConfiguration['data']>(() => {
    const rows = this.battingAnalytics().topRunScorers;
    return {
      labels: rows.map((r) => r.player),
      datasets: [
        {
          label: 'Runs',
          data: rows.map((r) => r.runs),
          backgroundColor: '#3B82F6',
          borderRadius: 6,
        },
      ],
    };
  });

  wicketsChartData = computed<ChartConfiguration['data']>(() => {
    const rows = this.bowlingAnalytics().topWicketTakers;
    return {
      labels: rows.map((r) => r.player),
      datasets: [
        {
          label: 'Wickets',
          data: rows.map((r) => r.wickets),
          backgroundColor: '#8B5CF6',
          borderRadius: 6,
        },
      ],
    };
  });

  teamLabel(team: Team | string): string {
    return typeof team === 'string' ? team : team.shortName;
  }
}
