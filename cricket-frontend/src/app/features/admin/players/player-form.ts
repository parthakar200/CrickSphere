
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { PlayerService } from '../../../core/services/player.service';
import { NotificationService } from '../../../core/services/notification.service';
import { BattingStyle, BowlingStyle, PlayerRole } from '../../../core/models';

const PLAYER_ROLES: PlayerRole[] = ['batsman', 'bowler', 'all-rounder', 'wicket-keeper'];
const BATTING_STYLES: BattingStyle[] = ['right-hand-bat', 'left-hand-bat'];
const BOWLING_STYLES: BowlingStyle[] = [
  'none',
  'right-arm-fast',
  'right-arm-medium',
  'right-arm-off-break',
  'right-arm-leg-break',
  'left-arm-fast',
  'left-arm-medium',
  'left-arm-orthodox',
  'left-arm-chinaman',
];

@Component({
  selector: 'app-player-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './player-form.html',
  styleUrl: '../admin-shared.scss',
})
export class PlayerForm {
  private fb = inject(FormBuilder);
  private playerService = inject(PlayerService);
  private notifications = inject(NotificationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  private playerId = this.route.snapshot.paramMap.get('id');
  isEditMode = computed(() => !!this.playerId && this.playerId !== 'new');

  loading = signal(false);
  loadingExisting = signal(false);

  roles = PLAYER_ROLES;
  battingStyles = BATTING_STYLES;
  bowlingStyles = BOWLING_STYLES;

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    role: ['batsman' as PlayerRole, [Validators.required]],
    battingStyle: ['right-hand-bat' as BattingStyle],
    bowlingStyle: ['none' as BowlingStyle],
    jerseyNumber: [null as number | null],
  });

  constructor() {
    if (this.isEditMode() && this.playerId) {
      this.loadingExisting.set(true);
      this.playerService.getById(this.playerId).subscribe({
        next: (res) => {
          const player = res.data.player;
          this.form.patchValue({
            name: player.name,
            role: player.role,
            battingStyle: player.battingStyle,
            bowlingStyle: player.bowlingStyle,
            jerseyNumber: player.jerseyNumber ?? null,
          });
          this.loadingExisting.set(false);
        },
        error: () => this.loadingExisting.set(false),
      });
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload = {
      ...raw,
      jerseyNumber: raw.jerseyNumber ?? undefined,
    };

    this.loading.set(true);
    const request = this.isEditMode()
      ? this.playerService.update(this.playerId!, payload)
      : this.playerService.create(payload);

    request.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: () => {
        this.notifications.success(this.isEditMode() ? 'Player updated' : 'Player created');
        this.router.navigateByUrl('/admin/players');
      },
      error: () => undefined,
    });
  }
}