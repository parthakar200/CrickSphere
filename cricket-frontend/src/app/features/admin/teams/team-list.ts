import { Component, computed, inject, signal } from '@angular/core';
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

  private teamsResult = refetchableList(() => this.teamService.list({ limit: 200 }), null);

  teams = () => this.teamsResult.data()?.data ?? [];

  activeTab = signal<'all' | 'tournament' | 'standalone'>('all');

  tournamentTeams = computed(() => this.teams().filter((t) => !!t.tournament));
  standaloneTeams = computed(() => this.teams().filter((t) => !t.tournament));

  getTournamentName(team: Team): string {
    if (!team.tournament) return '';
    if (typeof team.tournament === 'object' && 'name' in team.tournament && team.tournament.name) {
      return team.tournament.name;
    }
    return 'Tournament linked';
  }

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