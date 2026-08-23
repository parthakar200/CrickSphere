import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap } from 'rxjs';
import { ChartConfiguration } from 'chart.js';
import { StatisticsService } from '../../core/services/statistics.service';
import { TournamentService } from '../../core/services/tournament.service';
import { AppChart } from '../../shared/components/chart/chart';

const EMPTY_BATTING = { topRunScorers: [], runDistribution: [], strikeRateAnalysis: [] };
const EMPTY_BOWLING = { topWicketTakers: [], economyAnalysis: [], dotBallAnalysis: [] };
const EMPTY_TEAM = { teamComparison: [], winPercentage: [] };

const PALETTE = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#84CC16'];

@Component({
  selector: 'app-statistics',
  imports: [AppChart],
  templateUrl: './statistics.html',
  styleUrl: './statistics.scss',
})
export class Statistics {
  private statisticsService = inject(StatisticsService);
  private tournamentService = inject(TournamentService);

  selectedTournament = signal<string>('');
  activeSection = signal<'batting' | 'bowling' | 'team'>('batting');

  tournaments = toSignal(this.tournamentService.list({ limit: 100 }).pipe(catchError(() => of(null))), {
    initialValue: null,
  });

  batting = toSignal(
    toObservable(this.selectedTournament).pipe(
      switchMap((id) => this.statisticsService.getBattingAnalytics(id || undefined)),
      catchError(() => of(EMPTY_BATTING))
    ),
    { initialValue: EMPTY_BATTING }
  );

  bowling = toSignal(
    toObservable(this.selectedTournament).pipe(
      switchMap((id) => this.statisticsService.getBowlingAnalytics(id || undefined)),
      catchError(() => of(EMPTY_BOWLING))
    ),
    { initialValue: EMPTY_BOWLING }
  );

  team = toSignal(
    toObservable(this.selectedTournament).pipe(
      switchMap((id) => this.statisticsService.getTeamAnalytics(id || undefined)),
      catchError(() => of(EMPTY_TEAM))
    ),
    { initialValue: EMPTY_TEAM }
  );

  topRunScorersChart = computed<ChartConfiguration['data']>(() => ({
    labels: this.batting().topRunScorers.map((r) => r.player),
    datasets: [{ label: 'Runs', data: this.batting().topRunScorers.map((r) => r.runs), backgroundColor: '#3B82F6', borderRadius: 6 }],
  }));

  strikeRateChart = computed<ChartConfiguration['data']>(() => ({
    labels: this.batting().strikeRateAnalysis.map((r) => r.player),
    datasets: [{ label: 'Strike Rate', data: this.batting().strikeRateAnalysis.map((r) => r.avgSR), backgroundColor: '#8B5CF6', borderRadius: 6 }],
  }));

  runDistributionChart = computed<ChartConfiguration['data']>(() => {
    const dist = this.batting().runDistribution;
    const bucketLabels: Record<string, string> = { '0': '0', '1': '1-25', '26': '26-50', '51': '51-100', '101': '100+' };
    return {
      labels: dist.map((d) => bucketLabels[String(d._id)] ?? String(d._id)),
      datasets: [
        {
          label: 'Innings',
          data: dist.map((d) => d.count),
          backgroundColor: PALETTE,
        },
      ],
    };
  });

  topWicketTakersChart = computed<ChartConfiguration['data']>(() => ({
    labels: this.bowling().topWicketTakers.map((r) => r.player),
    datasets: [{ label: 'Wickets', data: this.bowling().topWicketTakers.map((r) => r.wickets), backgroundColor: '#EF4444', borderRadius: 6 }],
  }));

  economyChart = computed<ChartConfiguration['data']>(() => ({
    labels: this.bowling().economyAnalysis.map((r) => r.player),
    datasets: [{ label: 'Economy', data: this.bowling().economyAnalysis.map((r) => r.avgEconomy), backgroundColor: '#10B981', borderRadius: 6 }],
  }));

  dotBallChart = computed<ChartConfiguration['data']>(() => ({
    labels: this.bowling().dotBallAnalysis.map((r) => r.player),
    datasets: [{ label: 'Dot Ball %', data: this.bowling().dotBallAnalysis.map((r) => r.dotBallPercentage), backgroundColor: '#F59E0B', borderRadius: 6 }],
  }));

  teamComparisonChart = computed<ChartConfiguration['data']>(() => ({
    labels: this.team().teamComparison.map((r) => r.team),
    datasets: [
      { label: 'Runs', data: this.team().teamComparison.map((r) => r.runs), backgroundColor: '#3B82F6', borderRadius: 6 },
      { label: 'Fours', data: this.team().teamComparison.map((r) => r.fours), backgroundColor: '#8B5CF6', borderRadius: 6 },
      { label: 'Sixes', data: this.team().teamComparison.map((r) => r.sixes), backgroundColor: '#10B981', borderRadius: 6 },
    ],
  }));

  winPercentageChart = computed<ChartConfiguration['data']>(() => ({
    labels: this.team().winPercentage.map((r) => r.team),
    datasets: [{ label: 'Win %', data: this.team().winPercentage.map((r) => r.winPercentage), backgroundColor: PALETTE }],
  }));
}
