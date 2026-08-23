import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { interval, startWith, switchMap, catchError, of } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatchService } from '../../core/services/match.service';
import { Team } from '../../core/models';

@Component({
  selector: 'app-live-match-list',
  imports: [RouterLink],
  templateUrl: './live-match-list.html',
  styleUrl: './live-match-list.scss',
})
export class LiveMatchList {
  private matchService = inject(MatchService);

  // Polls every 15s so a match that just had its toss set (and is now
  // 'live') shows up here without a manual refresh.
  private liveMatchesResult = toSignal(
    interval(15000).pipe(
      startWith(0),
      switchMap(() => this.matchService.list({ status: 'live', limit: 50 })),
      catchError(() => of(null))
    ),
    { initialValue: null }
  );
  liveMatches = () => this.liveMatchesResult()?.data ?? [];

  private scheduledMatchesResult = toSignal(
    this.matchService.list({ status: 'scheduled', limit: 50 }).pipe(catchError(() => of(null))),
    { initialValue: null }
  );
  scheduledMatches = () => this.scheduledMatchesResult()?.data ?? [];

  private recentlyCompletedResult = toSignal(
    this.matchService.list({ status: 'completed', limit: 10, sort: '-updatedAt' }).pipe(catchError(() => of(null))),
    { initialValue: null }
  );
  recentlyCompleted = () => this.recentlyCompletedResult()?.data ?? [];

  teamLabel(team: Team | string): string {
    return typeof team === 'string' ? team : team.name;
  }
  
  winnerName(match: { teamA: Team | string; teamB: Team | string; result: { winner: string | null } }): string {
    const winner = match.result.winner;
    if (!winner) return '';
    const a = match.teamA;
    const b = match.teamB;
    if (typeof a !== 'string' && a._id === winner) return a.name;
    if (typeof b !== 'string' && b._id === winner) return b.name;
    return '';
  }
}
