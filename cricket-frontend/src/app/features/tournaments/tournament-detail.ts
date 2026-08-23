import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { TournamentService } from '../../core/services/tournament.service';
import { MatchService } from '../../core/services/match.service';
import { Team } from '../../core/models';

@Component({
  selector: 'app-tournament-detail',
  imports: [RouterLink],
  templateUrl: './tournament-detail.html',
  styleUrl: './tournament-detail.scss',
})
export class TournamentDetail {
  private tournamentService = inject(TournamentService);
  private matchService = inject(MatchService);
  private route = inject(ActivatedRoute);

  private tournamentId = this.route.snapshot.paramMap.get('id')!;

  tournamentResult = toSignal(this.tournamentService.getById(this.tournamentId).pipe(catchError(() => of(null))), {
    initialValue: null,
  });
  tournament = () => this.tournamentResult()?.data ?? null;

  dashboardResult = toSignal(
    this.tournamentService.getDashboard(this.tournamentId).pipe(catchError(() => of(null))),
    { initialValue: null }
  );
  overview = () => this.dashboardResult()?.data?.overview ?? null;

  pointsTableResult = toSignal(
    this.tournamentService.getPointsTable(this.tournamentId).pipe(catchError(() => of(null))),
    { initialValue: null }
  );
  pointsTable = () => this.pointsTableResult()?.data ?? [];

  matchesResult = toSignal(
    this.matchService.list({ tournament: this.tournamentId, limit: 100 }).pipe(catchError(() => of(null))),
    { initialValue: null }
  );
  matches = () => this.matchesResult()?.data ?? [];

  teamLabel(team: Team | string): string {
    return typeof team === 'string' ? team : team.shortName;
  }

  nrrClass(nrr: number): string {
    if (nrr > 0) return 'tournament-detail__nrr--positive';
    if (nrr < 0) return 'tournament-detail__nrr--negative';
    return '';
  }
}
