
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TeamService } from '../../../core/services/team.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Team } from '../../../core/models';
import { refetchableList } from '../../../core/utils/refetchable-list';

@Component({
  selector: 'app-team-list',
  imports: [RouterLink],
  templateUrl: './team-list.html',
  styleUrl: '../admin-shared.scss',
})
export class TeamList {
  private teamService = inject(TeamService);
  private notifications = inject(NotificationService);

  private teamsResult = refetchableList(() => this.teamService.list({ limit: 100 }), null);

  teams = () => this.teamsResult.data()?.data ?? [];

  deleteTeam(team: Team): void {
    if (!confirm(`Delete "${team.name}"? This cannot be undone.`)) return;

    this.teamService.delete(team._id).subscribe({
      next: () => {
        this.notifications.success(`${team.name} deleted`);
        this.teamsResult.refresh();
      },
      error: () => undefined,
    });
  }
}