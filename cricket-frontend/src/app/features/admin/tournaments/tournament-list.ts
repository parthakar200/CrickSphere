import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TournamentService } from '../../../core/services/tournament.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Tournament } from '../../../core/models';
import { refetchableList } from '../../../core/utils/refetchable-list';

@Component({
  selector: 'app-tournament-list',
  imports: [RouterLink, DatePipe],
  templateUrl: './tournament-list.html',
  styleUrl: '../admin-shared.scss',
})
export class TournamentList {
  private tournamentService = inject(TournamentService);
  private notifications = inject(NotificationService);

  private result = refetchableList(() => this.tournamentService.list({ limit: 100 }), null);

  tournaments = () => this.result.data()?.data ?? [];

  statusBadgeClass(status: Tournament['status']): string {
    switch (status) {
      case 'ongoing':
        return 'admin-table__badge--emerald';
      case 'completed':
        return 'admin-table__badge--purple';
      case 'cancelled':
        return 'admin-table__badge--crimson';
      default:
        return 'admin-table__badge--amber';
    }
  }

  teamCount(tournament: Tournament): number {
    return tournament.teams?.length ?? 0;
  }

  deleteTournament(tournament: Tournament): void {
    if (!confirm(`Delete "${tournament.name}"? This cannot be undone.`)) return;

    this.tournamentService.delete(tournament._id).subscribe({
      next: () => {
        this.notifications.success(`${tournament.name} deleted`);
        this.result.refresh();
      },
      error: () => undefined,
    });
  }
}
