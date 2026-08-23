import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { TeamService } from '../../core/services/team.service';
import { TeamRosterPlayer } from '../../core/models';

@Component({
  selector: 'app-team-detail',
  imports: [RouterLink],
  templateUrl: './team-detail.html',
  styleUrl: './team-detail.scss',
})
export class TeamDetail {
  private teamService = inject(TeamService);
  private route = inject(ActivatedRoute);

  private teamId = this.route.snapshot.paramMap.get('id')!;

  result = toSignal(this.teamService.getById(this.teamId).pipe(catchError(() => of(null))), {
    initialValue: null,
  });

  team = () => this.result()?.data ?? null;

  private squadResult = toSignal(
    this.teamService.getSquad(this.teamId).pipe(catchError(() => of(null))),
    { initialValue: null }
  );

  isStandalone = () => this.team() != null && !this.team()!.tournament;

  roster = (): TeamRosterPlayer[] => (this.squadResult()?.data ?? []).map((entry) => entry.player);

  roleBadgeClass(role: TeamRosterPlayer['role']): string {
    switch (role) {
      case 'batsman':
        return 'team-detail__badge--emerald';
      case 'bowler':
        return 'team-detail__badge--crimson';
      case 'wicket-keeper':
        return 'team-detail__badge--purple';
      default:
        return 'team-detail__badge--amber';
    }
  }
}