import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService, QueryParams } from './api.service';
import { ApiResponse, PaginatedResponse } from '../models/api.model';
import { MatchType, PointsTableRow, Tournament, TournamentFormat } from '../models';

export interface CreateTournamentPayload {
  name: string;
  startDate: string;
  endDate: string;
  venue?: string;
  organizer?: string;
  format?: TournamentFormat;
  matchType?: MatchType;
  oversPerMatch?: number;
  logo?: string;
}

export type UpdateTournamentPayload = Partial<CreateTournamentPayload> & {
  status?: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
};

export interface TournamentDashboard {
  tournament: { id: string; name: string; status: string };
  overview: {
    totalTeams: number;
    totalPlayers: number;
    totalMatches: number;
    totalRuns: number;
    totalWickets: number;
    totalSixes: number;
    totalFours: number;
  };
}

@Injectable({ providedIn: 'root' })
export class TournamentService {
  private api = inject(ApiService);

  list(params?: QueryParams): Observable<PaginatedResponse<Tournament>> {
    return this.api.get<PaginatedResponse<Tournament>>('/tournaments', params);
  }

  getById(id: string): Observable<ApiResponse<Tournament>> {
    return this.api.get<ApiResponse<Tournament>>(`/tournaments/${id}`);
  }

  create(payload: CreateTournamentPayload): Observable<ApiResponse<Tournament>> {
    return this.api.post<ApiResponse<Tournament>>('/tournaments', payload);
  }

  update(id: string, payload: UpdateTournamentPayload): Observable<ApiResponse<Tournament>> {
    return this.api.patch<ApiResponse<Tournament>>(`/tournaments/${id}`, payload);
  }

  delete(id: string): Observable<ApiResponse<null>> {
    return this.api.delete<ApiResponse<null>>(`/tournaments/${id}`);
  }

  addTeams(id: string, teamIds: string[]): Observable<ApiResponse<null>> {
    return this.api.post<ApiResponse<null>>(`/tournaments/${id}/teams`, { teamIds });
  }

  getDashboard(id: string): Observable<ApiResponse<TournamentDashboard>> {
    return this.api.get<ApiResponse<TournamentDashboard>>(`/tournaments/${id}/dashboard`);
  }

  getPointsTable(id: string): Observable<ApiResponse<PointsTableRow[]>> {
    return this.api.get<ApiResponse<PointsTableRow[]>>(`/tournaments/${id}/points-table`);
  }
}
