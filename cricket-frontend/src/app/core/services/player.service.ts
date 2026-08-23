
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService, QueryParams } from './api.service';
import { ApiResponse, PaginatedResponse } from '../models/api.model';
import { BattingStyle, BowlingStyle, CareerStats, Player, PlayerRole } from '../models';

export interface CreatePlayerPayload {
  name: string;
  role: PlayerRole;
  battingStyle?: BattingStyle;
  bowlingStyle?: BowlingStyle;
  jerseyNumber?: number;
  photo?: string;
  dateOfBirth?: string;
  nationality?: string;
}

export type UpdatePlayerPayload = Partial<CreatePlayerPayload> & { isActive?: boolean };

@Injectable({ providedIn: 'root' })
export class PlayerService {
  private api = inject(ApiService);

  list(params?: QueryParams): Observable<PaginatedResponse<Player>> {
    return this.api.get<PaginatedResponse<Player>>('/players', params);
  }

  getById(id: string): Observable<ApiResponse<{ player: Player; careerStats: CareerStats | null }>> {
    return this.api.get<ApiResponse<{ player: Player; careerStats: CareerStats | null }>>(`/players/${id}`);
  }

  create(payload: CreatePlayerPayload): Observable<ApiResponse<Player>> {
    return this.api.post<ApiResponse<Player>>('/players', payload);
  }

  update(id: string, payload: UpdatePlayerPayload): Observable<ApiResponse<Player>> {
    return this.api.patch<ApiResponse<Player>>(`/players/${id}`, payload);
  }

  delete(id: string): Observable<ApiResponse<null>> {
    return this.api.delete<ApiResponse<null>>(`/players/${id}`);
  }
}