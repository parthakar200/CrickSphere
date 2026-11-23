import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { TeamService } from '../../core/services/team.service';
import { Team } from '../../core/models';

@Component({
  selector: 'app-team-browse-list',
  imports: [RouterLink],
  templateUrl: './team-browse-list.html',
  styleUrl: './team-browse-list.scss',
})
export class TeamBrowseList {
  private teamService = inject(TeamService);

  private result = toSignal(this.teamService.list({ limit: 200, isActive: true }).pipe(catchError(() => of(null))), {
    initialValue: null,
  });

  teams = () => this.result()?.data ?? [];

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
}