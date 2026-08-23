import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { TeamService } from '../../core/services/team.service';

@Component({
  selector: 'app-team-browse-list',
  imports: [RouterLink],
  templateUrl: './team-browse-list.html',
  styleUrl: './team-browse-list.scss',
})
export class TeamBrowseList {
  private teamService = inject(TeamService);

  private result = toSignal(this.teamService.list({ limit: 100, isActive: true }).pipe(catchError(() => of(null))), {
    initialValue: null,
  });

  teams = () => this.result()?.data ?? [];
}