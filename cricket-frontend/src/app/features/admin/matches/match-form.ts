import { Component, inject, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, finalize, of } from 'rxjs';
import { MatchService } from '../../../core/services/match.service';
import { TeamService } from '../../../core/services/team.service';
import { TournamentService } from '../../../core/services/tournament.service';
import { NotificationService } from '../../../core/services/notification.service';
import { MatchMode, MatchType, Team } from '../../../core/models';

const MATCH_TYPES: MatchType[] = ['T20', 'ODI', 'Test', 'Custom'];

const DEFAULT_OVERS_BY_TYPE: Record<MatchType, number> = {
  T20: 20,
  ODI: 50,
  Test: 90,
  Custom: 20,
};

/** Minimal inline team-creation form state for Team A / Team B */
interface InlineTeamForm {
  name: string;
  shortName: string;
  homeGround: string;
  loading: boolean;
  error: string;
}

function blankInlineTeam(): InlineTeamForm {
  return { name: '', shortName: '', homeGround: '', loading: false, error: '' };
}

@Component({
  selector: 'app-match-form',
  imports: [ReactiveFormsModule, FormsModule, RouterLink],
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

  /** Mutable local list of teams — starts from the server load, grows as inline teams are created */
  allTeams = signal<Team[]>([]);

  private _teamsLoaded = signal(false);

  constructor() {
    // Load all teams once and seed the mutable signal
    this.teamService.list({ limit: 200 }).pipe(catchError(() => of(null))).subscribe((res) => {
      this.allTeams.set(res?.data ?? []);
      this._teamsLoaded.set(true);
    });

    // Load tournaments
    this.tournamentService.list({ limit: 100 }).pipe(catchError(() => of(null))).subscribe((res) => {
      this._tournaments.set(res?.data ?? []);
    });
  }

  private _tournaments = signal<any[]>([]);
  tournaments = computed(() => this._tournaments());

  // ── Inline "quick-add team" panels ──────────────────────────────────────
  showInlineTeamA = signal(false);
  showInlineTeamB = signal(false);
  inlineTeamA = signal<InlineTeamForm>(blankInlineTeam());
  inlineTeamB = signal<InlineTeamForm>(blankInlineTeam());

  searchTeamA = signal('');
  searchTeamB = signal('');
  dropdownOpenTeamA = signal(false);
  dropdownOpenTeamB = signal(false);

  selectedTeamA = computed(() => {
    const id = this.form.controls.teamA.value;
    return this.allTeams().find((t) => t._id === id) || null;
  });

  selectedTeamB = computed(() => {
    const id = this.form.controls.teamB.value;
    return this.allTeams().find((t) => t._id === id) || null;
  });

  filteredTeamsA = computed(() => {
    const q = this.searchTeamA().toLowerCase().trim();
    const isTournament = this.isTournamentMode() && !!this.form.controls.tournament.value;
    const base = isTournament
      ? [...this.tournamentTeams(), ...this.otherTeams()]
      : this.allTeams();
    if (!q) return base;
    return base.filter((t) => t.name.toLowerCase().includes(q) || t.shortName.toLowerCase().includes(q));
  });

  filteredTeamsB = computed(() => {
    const q = this.searchTeamB().toLowerCase().trim();
    const isTournament = this.isTournamentMode() && !!this.form.controls.tournament.value;
    const base = isTournament
      ? [...this.tournamentTeams(), ...this.otherTeams()]
      : this.allTeams();
    if (!q) return base;
    return base.filter((t) => t.name.toLowerCase().includes(q) || t.shortName.toLowerCase().includes(q));
  });

  toggleDropdown(slot: 'A' | 'B', event?: MouseEvent): void {
    event?.stopPropagation();
    if (slot === 'A') {
      this.dropdownOpenTeamB.set(false);
      this.dropdownOpenTeamA.update((open) => !open);
    } else {
      this.dropdownOpenTeamA.set(false);
      this.dropdownOpenTeamB.update((open) => !open);
    }
  }

  selectTeam(slot: 'A' | 'B', team: Team): void {
    if (slot === 'A') {
      this.form.patchValue({ teamA: team._id });
      this.dropdownOpenTeamA.set(false);
      this.searchTeamA.set('');
    } else {
      this.form.patchValue({ teamB: team._id });
      this.dropdownOpenTeamB.set(false);
      this.searchTeamB.set('');
    }
  }

  createFromSearch(slot: 'A' | 'B', query: string): void {
    const short = query.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'NEW';
    if (slot === 'A') {
      this.dropdownOpenTeamA.set(false);
      this.showInlineTeamA.set(true);
      this.inlineTeamA.set({ name: query, shortName: short, homeGround: '', loading: false, error: '' });
    } else {
      this.dropdownOpenTeamB.set(false);
      this.showInlineTeamB.set(true);
      this.inlineTeamB.set({ name: query, shortName: short, homeGround: '', loading: false, error: '' });
    }
  }

  toggleInlineTeam(slot: 'A' | 'B'): void {
    if (slot === 'A') {
      this.showInlineTeamA.update((v) => !v);
      if (!this.showInlineTeamA()) this.inlineTeamA.set(blankInlineTeam());
    } else {
      this.showInlineTeamB.update((v) => !v);
      if (!this.showInlineTeamB()) this.inlineTeamB.set(blankInlineTeam());
    }
  }

  updateInlineTeam(slot: 'A' | 'B', patch: Partial<InlineTeamForm>): void {
    if (slot === 'A') this.inlineTeamA.update((f) => ({ ...f, ...patch }));
    else this.inlineTeamB.update((f) => ({ ...f, ...patch }));
  }

  createInlineTeam(slot: 'A' | 'B'): void {
    const form = slot === 'A' ? this.inlineTeamA() : this.inlineTeamB();
    if (!form.name.trim() || !form.shortName.trim()) {
      this.updateInlineTeam(slot, { error: 'Team name and short name are required.' });
      return;
    }
    if (form.shortName.trim().length > 6) {
      this.updateInlineTeam(slot, { error: 'Short name must be 6 characters or fewer.' });
      return;
    }

    const isTournament = this.form.controls.mode.value === 'tournament';
    const tournamentId = isTournament ? (this.form.controls.tournament.value || null) : null;

    if (isTournament && !tournamentId) {
      this.updateInlineTeam(slot, {
        error: 'Please select a tournament above first before creating a team for it.',
      });
      return;
    }

    this.updateInlineTeam(slot, { loading: true, error: '' });
    this.teamService.create({
      name: form.name.trim(),
      shortName: form.shortName.trim().toUpperCase(),
      homeGround: form.homeGround.trim() || undefined,
      tournament: tournamentId || undefined,
    }).subscribe({
      next: (res) => {
        const newTeam = res.data;
        // Add to local team list so it appears in dropdowns immediately and in teams section
        this.allTeams.update((teams) => [...teams, newTeam]);

        // If tournament was selected, also update local tournament data
        if (tournamentId) {
          this._tournaments.update((tournaments) =>
            tournaments.map((t) => {
              if (t._id === tournamentId) {
                const teams = Array.isArray(t.teams) ? [...t.teams, newTeam._id] : [newTeam._id];
                return { ...t, teams };
              }
              return t;
            })
          );
        }

        // Auto-select the new team in the right slot
        if (slot === 'A') {
          this.form.patchValue({ teamA: newTeam._id });
          this.showInlineTeamA.set(false);
          this.inlineTeamA.set(blankInlineTeam());
        } else {
          this.form.patchValue({ teamB: newTeam._id });
          this.showInlineTeamB.set(false);
          this.inlineTeamB.set(blankInlineTeam());
        }

        if (isTournament) {
          this.notifications.success(`Team "${newTeam.name}" created and added to tournament. You can bind players in Teams section.`);
        } else {
          this.notifications.success(`Team "${newTeam.name}" created as standalone team (single match — players are not bound).`);
        }
      },
      error: (err) => {
        const msg = err?.error?.message ?? 'Failed to create team. Please try again.';
        this.updateInlineTeam(slot, { loading: false, error: msg });
      },
    });
  }

  // ── Main match form ──────────────────────────────────────────────────────
  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    mode: ['single' as MatchMode, [Validators.required]],
    tournament: [''],
    teamA: ['', [Validators.required]],
    teamB: ['', [Validators.required]],
    matchType: ['T20' as MatchType],
    overs: [20, [Validators.required, Validators.min(1)]],
    venue: [''],
    scheduledAt: [''],
  });

  private selectedMode = toSignal(this.form.controls.mode.valueChanges, {
    initialValue: this.form.controls.mode.value,
  });
  private selectedTournamentId = toSignal(this.form.controls.tournament.valueChanges, {
    initialValue: this.form.controls.tournament.value,
  });

  isTournamentMode = computed(() => this.selectedMode() === 'tournament');

  /**
   * For tournament mode: teams enrolled in this tournament
   */
  tournamentTeams = computed(() => {
    const tournamentId = this.selectedTournamentId();
    if (!tournamentId) return [];

    const tournament = this.tournaments().find((t) => t._id === tournamentId);
    if (!tournament) return [];

    const tournamentTeamIds = new Set((tournament.teams || []).map((t: any) => (typeof t === 'string' ? t : t._id)));
    return this.allTeams().filter((t) => tournamentTeamIds.has(t._id));
  });

  /**
   * For tournament mode: teams not yet enrolled in this tournament
   */
  otherTeams = computed(() => {
    const tournamentId = this.selectedTournamentId();
    if (!tournamentId) return this.allTeams();

    const tournament = this.tournaments().find((t) => t._id === tournamentId);
    if (!tournament) return this.allTeams();

    const tournamentTeamIds = new Set((tournament.teams || []).map((t: any) => (typeof t === 'string' ? t : t._id)));
    return this.allTeams().filter((t) => !tournamentTeamIds.has(t._id));
  });

  onModeChange(mode: MatchMode): void {
    this.form.patchValue({ mode });
    if (mode === 'single') {
      this.form.patchValue({ tournament: '' });
    }
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
      scheduledAt: raw.scheduledAt ? new Date(raw.scheduledAt).toISOString() : new Date().toISOString(),
    };

    this.loading.set(true);
    this.matchService
      .create(payload)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => {
          const isTournament = raw.mode === 'tournament';
          this.notifications.success('Match created successfully');
          if (isTournament) {
            this.notifications.info('For tournament matches, you can bind players to squads via Admin > Teams > Manage squad');
          }
          this.router.navigateByUrl('/admin/matches');
        },
        error: () => undefined,
      });
  }
}
