import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatchService } from '../../../core/services/match.service';
import { Match, Team } from '../../../core/models';
import { refetchableList } from '../../../core/utils/refetchable-list';

@Component({
  selector: 'app-match-list',
  imports: [RouterLink, DatePipe],
  templateUrl: './match-list.html',
  styleUrl: '../admin-shared.scss',
})
export class MatchList {
  private matchService = inject(MatchService);

  private result = refetchableList(() => this.matchService.list({ limit: 100 }), null);

  matches = () => this.result.data()?.data ?? [];

  teamLabel(team: Team | string): string {
    return typeof team === 'string' ? team : team.shortName;
  }

  statusBadgeClass(status: Match['status']): string {
    switch (status) {
      case 'live':
        return 'admin-table__badge--crimson';
      case 'completed':
        return 'admin-table__badge--purple';
      case 'scheduled':
        return 'admin-table__badge--amber';
      default:
        return 'admin-table__badge--emerald';
    }
  }
}
