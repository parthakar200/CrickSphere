import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/api.model';

export interface StatisticsOverview {
  totalPlayers: number;
  totalTeams: number;
  totalMatches: number;
  completedMatches: number;
  totalRuns: number;
  totalSixes: number;
  totalFours: number;
  totalWickets: number;
}

export interface BattingAnalytics {
  topRunScorers: Array<{ player: string; runs: number }>;
  runDistribution: Array<{ _id: number | string; count: number }>;
  strikeRateAnalysis: Array<{ player: string; avgSR: number; innings: number }>;
}

export interface BowlingAnalytics {
  topWicketTakers: Array<{ player: string; wickets: number }>;
  economyAnalysis: Array<{ player: string; avgEconomy: number }>;
  dotBallAnalysis: Array<{ player: string; dotBalls: number; dotBallPercentage: number }>;
}

export interface TeamAnalytics {
  teamComparison: Array<{ team: string; runs: number; fours: number; sixes: number }>;
  winPercentage: Array<{ team: string; wins: number; played: number; winPercentage: number }>;
}

@Injectable({ providedIn: 'root' })
export class StatisticsService {
  private api = inject(ApiService);

  getOverview(): Observable<StatisticsOverview> {
    return this.api.get<ApiResponse<StatisticsOverview>>('/statistics/overview').pipe(map((res) => res.data));
  }

  getBattingAnalytics(tournamentId?: string): Observable<BattingAnalytics> {
    return this.api
      .get<ApiResponse<BattingAnalytics>>('/statistics/batting-analytics', { tournament: tournamentId })
      .pipe(map((res) => res.data));
  }

  getBowlingAnalytics(tournamentId?: string): Observable<BowlingAnalytics> {
    return this.api
      .get<ApiResponse<BowlingAnalytics>>('/statistics/bowling-analytics', { tournament: tournamentId })
      .pipe(map((res) => res.data));
  }

  getTeamAnalytics(tournamentId?: string): Observable<TeamAnalytics> {
    return this.api
      .get<ApiResponse<TeamAnalytics>>('/statistics/team-analytics', { tournament: tournamentId })
      .pipe(map((res) => res.data));
  }
}
