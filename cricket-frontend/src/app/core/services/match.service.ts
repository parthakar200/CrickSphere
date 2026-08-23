
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService, QueryParams } from './api.service';
import { ApiResponse, PaginatedResponse } from '../models/api.model';
import { Innings, Match, MatchMode, MatchType, MatchScorecard } from '../models';
import { LiveScorecardData } from '../models/live-match.model';

export interface CreateMatchPayload {
  name: string;
  mode: MatchMode;
  tournament?: string;
  stage?: string;
  teamA: string;
  teamB: string;
  matchType?: MatchType;
  overs: number;
  ballsPerOver?: number;
  venue?: string;
  scheduledAt?: string;
}

export interface CompleteMatchPayload {
  winner?: string;
  winMargin?: string;
  isTie?: boolean;
  isNoResult?: boolean;
  playerOfTheMatch?: string;
}

export interface EligiblePlayers {
  teamA: import('../models').TeamRosterPlayer[];
  teamB: import('../models').TeamRosterPlayer[];
}

@Injectable({ providedIn: 'root' })
export class MatchService {
  private api = inject(ApiService);

  list(params?: QueryParams): Observable<PaginatedResponse<Match>> {
    return this.api.get<PaginatedResponse<Match>>('/matches', params);
  }

  getById(id: string): Observable<ApiResponse<Match>> {
    return this.api.get<ApiResponse<Match>>(`/matches/${id}`);
  }

  create(payload: CreateMatchPayload): Observable<ApiResponse<Match>> {
    return this.api.post<ApiResponse<Match>>('/matches', payload);
  }

  getEligiblePlayers(id: string): Observable<ApiResponse<EligiblePlayers>> {
    return this.api.get<ApiResponse<EligiblePlayers>>(`/matches/${id}/eligible-players`);
  }

  setPlayingXI(id: string, teamAPlayingXI: string[], teamBPlayingXI: string[]): Observable<ApiResponse<Match>> {
    return this.api.patch<ApiResponse<Match>>(`/matches/${id}/playing-xi`, { teamAPlayingXI, teamBPlayingXI });
  }

  setToss(id: string, winner: string, decision: 'bat' | 'bowl'): Observable<ApiResponse<{ match: Match; currentInnings: Innings }>> {
    return this.api.post<ApiResponse<{ match: Match; currentInnings: Innings }>>(`/matches/${id}/toss`, {
      winner,
      decision,
    });
  }

  startNextInnings(id: string): Observable<ApiResponse<{ match: Match; currentInnings: Innings }>> {
    return this.api.post<ApiResponse<{ match: Match; currentInnings: Innings }>>(`/matches/${id}/start-next-innings`);
  }

  completeMatch(id: string, payload: CompleteMatchPayload): Observable<ApiResponse<Match>> {
    return this.api.post<ApiResponse<Match>>(`/matches/${id}/complete`, payload);
  }

  reopenMatch(id: string): Observable<ApiResponse<Match>> {
    return this.api.post<ApiResponse<Match>>(`/matches/${id}/reopen`);
  }

  getLiveScorecard(id: string): Observable<LiveScorecardData> {
    return this.api
      .get<ApiResponse<LiveScorecardData>>(`/matches/${id}/live`)
      .pipe(map((res) => res.data));
  }

  getScorecard(id: string): Observable<MatchScorecard> {
    return this.api
      .get<ApiResponse<MatchScorecard>>(`/matches/${id}/scorecard`)
      .pipe(map((res) => res.data));
  }
}