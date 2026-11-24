import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap, tap } from 'rxjs';
import { TeamService } from '../../core/services/team.service';
import { LocalityService } from '../../core/services/locality.service';
import { Team } from '../../core/models';

@Component({
  selector: 'app-team-browse-list',
  imports: [RouterLink],
  templateUrl: './team-browse-list.html',
  styleUrl: './team-browse-list.scss',
})
export class TeamBrowseList {
  private teamService = inject(TeamService);
  private localityService = inject(LocalityService);

  isLoading = signal(true);
  private localityId$ = toObservable(this.localityService.selectedLocalityId);

  private result = toSignal(
    this.localityId$.pipe(
      tap(() => this.isLoading.set(true)),
      switchMap(() =>
        this.teamService.list({ limit: 200, isActive: true }).pipe(
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