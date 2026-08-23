import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { TeamService } from '../../../core/services/team.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-team-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './team-form.html',
  styleUrl: '../admin-shared.scss',
})
export class TeamForm {
  private fb = inject(FormBuilder);
  private teamService = inject(TeamService);
  private notifications = inject(NotificationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  /** Present (and not the literal string 'new') only when editing an existing team. */
  private teamId = this.route.snapshot.paramMap.get('id');
  isEditMode = computed(() => !!this.teamId && this.teamId !== 'new');

  loading = signal(false);
  loadingExisting = signal(false);

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    shortName: ['', [Validators.required, Validators.maxLength(6)]],
    homeGround: [''],
    coach: [''],
  });

  constructor() {
    if (this.isEditMode() && this.teamId) {
      this.loadingExisting.set(true);
      this.teamService.getById(this.teamId).subscribe({
        next: (res) => {
          this.form.patchValue({
            name: res.data.name,
            shortName: res.data.shortName,
            homeGround: res.data.homeGround ?? '',
            coach: res.data.coach ?? '',
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

    const payload = this.form.getRawValue();
    this.loading.set(true);

    const request = this.isEditMode()
      ? this.teamService.update(this.teamId!, payload)
      : this.teamService.create(payload);

    request.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: () => {
        this.notifications.success(this.isEditMode() ? 'Team updated' : 'Team created');
        this.router.navigateByUrl('/admin/teams');
      },
      error: () => undefined,
    });
  }
}
