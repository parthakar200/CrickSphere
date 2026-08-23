
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService, QueryParams } from './api.service';
import { ApiResponse, PaginatedResponse } from '../models/api.model';
import { Team, SquadEntry } from '../models';

export interface CreateTeamPayload {
  name: string;
  shortName: string;
  logo?: string;
  homeGround?: string;
  coach?: string;
  tournament?: string;
}

export interface TakenPlayerEntry {
  playerId: string;
  teamId: string;
  teamName: string;
}


export type UpdateTeamPayload = Partial<CreateTeamPayload> & { captain?: string; isActive?: boolean };

@Injectable({ providedIn: 'root' })
export class TeamService {
  private api = inject(ApiService);

  list(params?: QueryParams): Observable<PaginatedResponse<Team>> {
    return this.api.get<PaginatedResponse<Team>>('/teams', params);
  }

  getById(id: string): Observable<ApiResponse<Team>> {
    return this.api.get<ApiResponse<Team>>(`/teams/${id}`);
  }

  create(payload: CreateTeamPayload): Observable<ApiResponse<Team>> {
    return this.api.post<ApiResponse<Team>>('/teams', payload);
  }

  update(id: string, payload: UpdateTeamPayload): Observable<ApiResponse<Team>> {
    return this.api.patch<ApiResponse<Team>>(`/teams/${id}`, payload);
  }

  delete(id: string): Observable<ApiResponse<null>> {
    return this.api.delete<ApiResponse<null>>(`/teams/${id}`);
  }

  /**
   * Squad management — only meaningful for a tournament-scoped team
   * (team.tournament != null). A standalone team (used in single matches)
   * has no squad at all; its Playing XI is picked fresh per match instead
   * (see MatchService.getEligiblePlayers/setPlayingXI).
   */
  getSquad(teamId: string): Observable<ApiResponse<SquadEntry[]>> {
    return this.api.get<ApiResponse<SquadEntry[]>>(`/teams/${teamId}/squad`);
  }

    getTournamentTakenPlayers(teamId: string): Observable<ApiResponse<TakenPlayerEntry[]>> {
    return this.api.get<ApiResponse<TakenPlayerEntry[]>>(`/teams/${teamId}/squad/taken`);
  }


  addToSquad(teamId: string, playerId: string): Observable<ApiResponse<SquadEntry>> {
    return this.api.post<ApiResponse<SquadEntry>>(`/teams/${teamId}/squad`, { playerId });
  }

  removeFromSquad(teamId: string, playerId: string): Observable<ApiResponse<null>> {
    return this.api.delete<ApiResponse<null>>(`/teams/${teamId}/squad/${playerId}`);
  }
}