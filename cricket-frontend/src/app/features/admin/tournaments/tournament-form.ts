import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, finalize, of } from 'rxjs';
import { TournamentService } from '../../../core/services/tournament.service';
import { TeamService } from '../../../core/services/team.service';
import { NotificationService } from '../../../core/services/notification.service';
import { MatchType, Team, TournamentFormat } from '../../../core/models';

const FORMATS: TournamentFormat[] = ['round-robin', 'knockout', 'round-robin-knockout', 'league'];
const MATCH_TYPES: MatchType[] = ['T20', 'ODI', 'Test', 'Custom'];

@Component({
  selector: 'app-tournament-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './tournament-form.html',
  styleUrl: '../admin-shared.scss',
})
export class TournamentForm {
  private fb = inject(FormBuilder);
  private tournamentService = inject(TournamentService);
  private teamService = inject(TeamService);
  private notifications = inject(NotificationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  private tournamentId = this.route.snapshot.paramMap.get('id');
  isEditMode = computed(() => !!this.tournamentId && this.tournamentId !== 'new');

  loading = signal(false);
  loadingExisting = signal(false);

  formats = FORMATS;
  matchTypes = MATCH_TYPES;

  // Only relevant in edit mode — lets an admin attach existing teams to an
  // already-created tournament. New tournaments are created team-less and
  // teams are added afterward (mirrors the backend's separate
  // POST /tournaments/:id/teams endpoint).
  private allTeamsResult = toSignal(this.teamService.list({ limit: 100 }).pipe(catchError(() => of(null))), {
    initialValue: null,
  });
  allTeams = () => this.allTeamsResult()?.data ?? [];
  selectedTeamIds = signal<Set<string>>(new Set());
  addingTeams = signal(false);

  currentTeams = signal<Team[]>([]);

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    startDate: ['', [Validators.required]],
    endDate: ['', [Validators.required]],
    venue: [''],
    organizer: [''],
    format: ['round-robin' as TournamentFormat],
    matchType: ['T20' as MatchType],
    oversPerMatch: [20],
  });

  constructor() {
    if (this.isEditMode() && this.tournamentId) {
      this.loadingExisting.set(true);
      this.tournamentService.getById(this.tournamentId).subscribe({
        next: (res) => {
          const t = res.data;
          this.form.patchValue({
            name: t.name,
            startDate: t.startDate?.slice(0, 10),
            endDate: t.endDate?.slice(0, 10),
            venue: t.venue ?? '',
            organizer: t.organizer ?? '',
            format: t.format,
            matchType: t.matchType,
            oversPerMatch: t.oversPerMatch,
          });
          this.currentTeams.set((t.teams as Team[]) ?? []);
          this.loadingExisting.set(false);
        },
        error: () => this.loadingExisting.set(false),
      });
    }
  }

  toggleTeamSelection(teamId: string): void {
    this.selectedTeamIds.update((set) => {
      const next = new Set(set);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  }

  isTeamAlreadyAdded(teamId: string): boolean {
    return this.currentTeams().some((t) => t._id === teamId);
  }

  addSelectedTeams(): void {
    if (!this.tournamentId || this.selectedTeamIds().size === 0) return;

    this.addingTeams.set(true);
    this.tournamentService
      .addTeams(this.tournamentId, [...this.selectedTeamIds()])
      .pipe(finalize(() => this.addingTeams.set(false)))
      .subscribe({
        next: () => {
          this.notifications.success('Teams added to tournament');
          const added = this.allTeams().filter((t) => this.selectedTeamIds().has(t._id));
          this.currentTeams.update((list) => [...list, ...added]);
          this.selectedTeamIds.set(new Set());
        },
        error: () => undefined,
      });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.getRawValue();
    this.loading.set(true);

    const request = this.isEditMode()
      ? this.tournamentService.update(this.tournamentId!, payload)
      : this.tournamentService.create(payload);

    request.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (res) => {
        this.notifications.success(this.isEditMode() ? 'Tournament updated' : 'Tournament created');
        if (!this.isEditMode() && 'data' in res) {
          // Right after creating, jump into edit mode so the admin can
          // immediately add teams to the new tournament.
          this.router.navigate(['/admin/tournaments', (res.data as { _id: string })._id, 'edit']);
        } else {
          this.router.navigateByUrl('/admin/tournaments');
        }
      },
      error: () => undefined,
    });
  }
}
