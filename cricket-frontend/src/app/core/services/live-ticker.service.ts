import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { PaginatedResponse } from '../models/api.model';
import { Match } from '../models';

/**
 * Read-only helper for the topbar's live ticker. Deliberately separate from
 * a full MatchService (built when the Live Match Center feature lands) since
 * the ticker only ever needs a lightweight "what's live right now" list.
 */
@Injectable({ providedIn: 'root' })
export class LiveTickerService {
  private api = inject(ApiService);

  getLiveMatches(): Observable<Match[]> {
    return this.api
      .get<PaginatedResponse<Match>>('/matches', { status: 'live', limit: 10 })
      .pipe(map((res) => res.data));
  }
}
