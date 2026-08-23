import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, finalize, of } from 'rxjs';
import { MatchService } from '../../../core/services/match.service';
import { TeamService } from '../../../core/services/team.service';
import { TournamentService } from '../../../core/services/tournament.service';
import { NotificationService } from '../../../core/services/notification.service';
import { MatchMode, MatchType } from '../../../core/models';

const MATCH_TYPES: MatchType[] = ['T20', 'ODI', 'Test', 'Custom'];

const DEFAULT_OVERS_BY_TYPE: Record<MatchType, number> = {
  T20: 20,
  ODI: 50,
  Test: 90,
  Custom: 20,
};

@Component({
  selector: 'app-match-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './match-form.html',
  styleUrl: '../admin-shared.scss',
})
export class MatchForm {
  private fb = inject(FormBuilder);
  private matchService = inject(MatchService);
  private teamService = inject(TeamService);
  private tournamentService = inject(TournamentService);
  private notifications = inject(NotificationService);
  private router = inject(Router);

  loading = signal(false);
  matchTypes = MATCH_TYPES;

  private allTeamsResult = toSignal(this.teamService.list({ limit: 100 }).pipe(catchError(() => of(null))), {
    initialValue: null,
  });
  private allTournamentsResult = toSignal(
    this.tournamentService.list({ limit: 100 }).pipe(catchError(() => of(null))),
    { initialValue: null }
  );
  tournaments = () => this.allTournamentsResult()?.data ?? [];

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    mode: ['single' as MatchMode, [Validators.required]],
    tournament: [''],
    teamA: ['', [Validators.required]],
    teamB: ['', [Validators.required]],
    matchType: ['T20' as MatchType],
    overs: [20, [Validators.required, Validators.min(1)]],
    venue: [''],
  });

  // Tracked as signals (rather than reading form.controls.mode.value directly
  // in a template-bound method) so `availableTeams` below is correctly
  // reactive to every mode/tournament change, not dependent on some other
  // change-detection pass happening to re-run it afterward.
  private selectedMode = toSignal(this.form.controls.mode.valueChanges, {
    initialValue: this.form.controls.mode.value,
  });
  private selectedTournamentId = toSignal(this.form.controls.tournament.valueChanges, {
    initialValue: this.form.controls.tournament.value,
  });

  /**
   * Team pool is filtered to the selected tournament's teams when mode is
   * 'tournament' (a match between teams that aren't actually IN that
   * tournament wouldn't make sense), and shows every team otherwise.
   */
  availableTeams = () => {
    const mode = this.selectedMode();
    const tournamentId = this.selectedTournamentId();
    const allTeams = this.allTeamsResult()?.data ?? [];

    if (mode !== 'tournament' || !tournamentId) return allTeams;

    const tournament = this.tournaments().find((t) => t._id === tournamentId);
    if (!tournament) return allTeams;

    const tournamentTeamIds = new Set(tournament.teams.map((t) => (typeof t === 'string' ? t : t._id)));
    return allTeams.filter((t) => tournamentTeamIds.has(t._id));
  };

  onModeChange(mode: MatchMode): void {
    this.form.patchValue({ mode });
    if (mode === 'single') {
      this.form.patchValue({ tournament: '' });
    }
    // Re-validate team selections since the available pool may have changed.
    this.form.patchValue({ teamA: '', teamB: '' });
  }

  onMatchTypeChange(matchType: MatchType): void {
    this.form.patchValue({ matchType, overs: DEFAULT_OVERS_BY_TYPE[matchType] });
  }

  submit(): void {
    if (this.form.controls.mode.value === 'tournament' && !this.form.controls.tournament.value) {
      this.notifications.error('Select a tournament for a tournament-mode match');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.form.controls.teamA.value === this.form.controls.teamB.value) {
      this.notifications.error('Team A and Team B must be different teams');
      return;
    }

    const raw = this.form.getRawValue();
    const payload = {
      ...raw,
      tournament: raw.mode === 'tournament' ? raw.tournament : undefined,
    };

    this.loading.set(true);
    this.matchService
      .create(payload)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.notifications.success('Match created');
          this.router.navigateByUrl('/admin/matches');
        },
        error: () => undefined,
      });
  }
}
