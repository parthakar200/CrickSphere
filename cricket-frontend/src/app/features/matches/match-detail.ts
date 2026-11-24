import { Component, inject } from '@angular/core';
import { DatePipe, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { MatchService } from '../../core/services/match.service';
import { Team } from '../../core/models';
import { ScorecardBattingRow, ScorecardInnings } from '../../core/models/match-scorecard.model';

@Component({
  selector: 'app-match-detail',
  imports: [RouterLink, DatePipe],
  templateUrl: './match-detail.html',
  styleUrl: './match-detail.scss',
})
export class MatchDetail {
  private location = inject(Location);
  private router = inject(Router);
  private matchService = inject(MatchService);
  private route = inject(ActivatedRoute);

  private matchId = this.route.snapshot.paramMap.get('id')!;

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/matches/live']);
    }
  }

  result = toSignal(this.matchService.getScorecard(this.matchId).pipe(catchError(() => of(null))), {
    initialValue: null,
  });

  scorecard = () => this.result();
  match = () => this.scorecard()?.match ?? null;
  innings = () => this.scorecard()?.innings ?? [];

  teamName(team: Team | string): string {
    return typeof team === 'string' ? team : team.name;
  }

  /** "R/B (4s, 6s)" style dismissal line, e.g. "b Bulaa" / "c Bapu b Bulaa" / "run out (Bapu)" / "not out". */
  dismissalLine(row: ScorecardBattingRow): string {
    if (!row.isOut) return 'not out';
    const bowlerName = row.bowlerOut?.name ?? '';
    const fielderName = row.fielderOut?.name ?? '';
    switch (row.dismissalType) {
      case 'bowled':
        return `b ${bowlerName}`;
      case 'lbw':
        return `lbw b ${bowlerName}`;
      case 'caught':
        return fielderName ? `c ${fielderName} b ${bowlerName}` : `c & b ${bowlerName}`;
      case 'stumped':
        return `st ${fielderName} b ${bowlerName}`;
      case 'run-out':
        return fielderName ? `run out (${fielderName})` : 'run out';
      case 'hit-wicket':
        return `hit wicket b ${bowlerName}`;
      case 'retired-out':
        return 'retired out';
      case 'obstructing-field':
        return 'obstructing the field';
      case 'timed-out':
        return 'timed out';
      case 'handled-ball':
        return 'handled the ball';
      default:
        return 'out';
    }
  }

  statusBadgeClass(status: string): string {
    switch (status) {
      case 'live':
        return 'match-detail__badge--crimson';
      case 'completed':
        return 'match-detail__badge--purple';
      case 'scheduled':
      case 'toss':
        return 'match-detail__badge--amber';
      default:
        return 'match-detail__badge--emerald';
    }
  }

  didNotBat(inn: ScorecardInnings): boolean {
    return inn.battingStats.length === 0;
  }
}