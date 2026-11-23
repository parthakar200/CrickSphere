import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface SearchPlayer {
  _id: string;
  name: string;
  role: string;
  photo?: string | null;
  team?: { _id: string; name: string; shortName: string } | null;
}

export interface SearchTeam {
  _id: string;
  name: string;
  shortName: string;
  logo?: string | null;
}

export interface SearchTournament {
  _id: string;
  name: string;
  logo?: string | null;
  status: string;
  startDate?: string;
}

export interface SearchMatch {
  _id: string;
  name?: string;
  teamA: { _id: string; name: string; shortName: string } | string;
  teamB: { _id: string; name: string; shortName: string } | string;
  status: string;
  scheduledAt?: string;
}

export interface SearchResults {
  players?: SearchPlayer[];
  teams?: SearchTeam[];
  tournaments?: SearchTournament[];
  matches?: SearchMatch[];
}

export interface SearchResponse {
  success: boolean;
  data: SearchResults;
}

@Injectable({ providedIn: 'root' })
export class SearchService {
  private api = inject(ApiService);

  search(query: string, type?: string): Observable<SearchResponse> {
    return this.api.get<SearchResponse>('/search', { q: query, ...(type ? { type } : {}) });
  }
}
