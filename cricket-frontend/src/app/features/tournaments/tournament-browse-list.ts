import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { TournamentService } from '../../core/services/tournament.service';
import { Tournament } from '../../core/models';

@Component({
  selector: 'app-tournament-browse-list',
  imports: [RouterLink, DatePipe],
  templateUrl: './tournament-browse-list.html',
  styleUrl: './tournament-browse-list.scss',
})
export class TournamentBrowseList {
  private tournamentService = inject(TournamentService);

  private result = toSignal(this.tournamentService.list({ limit: 100 }).pipe(catchError(() => of(null))), {
    initialValue: null,
  });

  tournaments = () => this.result()?.data ?? [];

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
