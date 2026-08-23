import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService, QueryParams } from './api.service';
import { ApiResponse } from '../models/api.model';

/**
 * The backend's leaderboard endpoints only ever populate `name`, `photo`,
 * and `team` on the player (see e.g. `.populate('player', 'name photo team')`
 * in leaderboardService.js) — NOT the full Player model (no role, batting/
 * bowling style, isActive). Row/normalizer types should reference this
 * summary shape, not the full `Player` model, or TypeScript will correctly
 * flag a mismatch wherever a row is actually constructed.
 */
export interface LeaderboardPlayerSummary {
  _id: string;
  name: string;
  photo?: string | null;
  team?: { name: string; shortName: string } | string;
}

export interface LeaderboardRow {
  rank: number;
  player: LeaderboardPlayerSummary;
  [key: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class LeaderboardService {
  private api = inject(ApiService);

  private get(path: string, params?: QueryParams): Observable<ApiResponse<LeaderboardRow[]>> {
    return this.api.get<ApiResponse<LeaderboardRow[]>>(path, params);
  }

  mostRuns(params?: QueryParams) {
    return this.get('/leaderboards/most-runs', params);
  }
  bestStrikeRate(params?: QueryParams) {
    return this.get('/leaderboards/best-strike-rate', params);
  }
  mostSixes(params?: QueryParams) {
    return this.get('/leaderboards/most-sixes', params);
  }
  mostFours(params?: QueryParams) {
    return this.get('/leaderboards/most-fours', params);
  }
  mostWickets(params?: QueryParams) {
    return this.get('/leaderboards/most-wickets', params);
  }
  bestEconomy(params?: QueryParams) {
    return this.get('/leaderboards/best-economy', params);
  }
  mostDotBalls(params?: QueryParams) {
    return this.get('/leaderboards/most-dot-balls', params);
  }
  bestBowlingAverage(params?: QueryParams) {
    return this.get('/leaderboards/best-bowling-average', params);
  }
  fielding(params?: QueryParams) {
    return this.get('/leaderboards/fielding', params);
  }
}
