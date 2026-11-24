import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap, tap } from 'rxjs';
import { TournamentService } from '../../core/services/tournament.service';
import { LocalityService } from '../../core/services/locality.service';
import { Tournament } from '../../core/models';

export type TournamentTab = 'upcoming' | 'completed' | 'all';

@Component({
  selector: 'app-tournament-browse-list',
  imports: [RouterLink, DatePipe],
  templateUrl: './tournament-browse-list.html',
  styleUrl: './tournament-browse-list.scss',
})
export class TournamentBrowseList {
  private tournamentService = inject(TournamentService);
  private localityService = inject(LocalityService);

  activeTab = signal<TournamentTab>('upcoming');
  isLoading = signal(true);

  private localityId$ = toObservable(this.localityService.selectedLocalityId);

  private result = toSignal(
    this.localityId$.pipe(
      tap(() => this.isLoading.set(true)),
      switchMap(() =>
        this.tournamentService.list({ limit: 100 }).pipe(
          tap(() => this.isLoading.set(false)),
          catchError(() => {
            this.isLoading.set(false);
            return of(null);
          })
        )
      )
    ),
    { initialValue: null }
  );

  tournaments = () => this.result()?.data ?? [];

  upcomingTournaments = computed(() =>
    this.tournaments().filter(
      (t) => t.status === 'upcoming' || t.status === 'ongoing'
    )
  );

  completedTournaments = computed(() =>
    this.tournaments().filter((t) => t.status === 'completed')
  );

  displayedTournaments = computed(() => {
    switch (this.activeTab()) {
      case 'upcoming':
        return this.upcomingTournaments();
      case 'completed':
        return this.completedTournaments();
      default:
        return this.tournaments();
    }
  });

  statusBadgeClass(status: Tournament['status']): string {
    switch (status) {
      case 'ongoing':
        return 'tournament-card__badge--emerald';
      case 'completed':
        return 'tournament-card__badge--purple';
      case 'cancelled':
        return 'tournament-card__badge--crimson';
      default:
        return 'tournament-card__badge--amber';
    }
  }

  teamCount(tournament: Tournament): number {
    return tournament.teams?.length ?? 0;
  }
}
