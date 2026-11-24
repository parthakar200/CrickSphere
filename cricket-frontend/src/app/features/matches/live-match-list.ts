import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { interval, startWith, switchMap, catchError, of, tap } from 'rxjs';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatchService } from '../../core/services/match.service';
import { LocalityService } from '../../core/services/locality.service';
import { Team } from '../../core/models';

@Component({
  selector: 'app-live-match-list',
  imports: [RouterLink, DatePipe],
  templateUrl: './live-match-list.html',
  styleUrl: './live-match-list.scss',
})
export class LiveMatchList {
  private matchService = inject(MatchService);
  private localityService = inject(LocalityService);

  isLoading = signal(true);
  private localityId$ = toObservable(this.localityService.selectedLocalityId);

  // Polls every 15s and re-triggers immediately when village changes
  private liveMatchesResult = toSignal(
    this.localityId$.pipe(
      tap(() => this.isLoading.set(true)),
      switchMap(() =>
        interval(15000).pipe(
          startWith(0),
          switchMap(() =>
            this.matchService.list({ status: 'live', limit: 50 }).pipe(
              tap(() => this.isLoading.set(false)),
              catchError(() => {
                this.isLoading.set(false);
                return of(null);
              })
            )
          )
        )
      )
    ),
    { initialValue: null }
  );
  liveMatches = () => this.liveMatchesResult()?.data ?? [];

  private scheduledMatchesResult = toSignal(
    this.localityId$.pipe(
      switchMap(() => this.matchService.list({ status: 'scheduled', limit: 50 }).pipe(catchError(() => of(null))))
    ),
    { initialValue: null }
  );
  scheduledMatches = () => this.scheduledMatchesResult()?.data ?? [];

  private recentlyCompletedResult = toSignal(
    this.localityId$.pipe(
      switchMap(() => this.matchService.list({ status: 'completed', limit: 10, sort: '-updatedAt' }).pipe(catchError(() => of(null))))
    ),
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
