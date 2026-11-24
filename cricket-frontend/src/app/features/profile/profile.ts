import { Component, inject, signal, computed, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LocalityService } from '../../core/services/locality.service';
import { NotificationService } from '../../core/services/notification.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-profile',
  imports: [FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile {
  readonly auth = inject(AuthService);
  readonly localityService = inject(LocalityService);
  private notifications = inject(NotificationService);
  private router = inject(Router);

  currentUser = this.auth.currentUser;
  isAdmin = computed(() => this.currentUser()?.role === 'admin');

  villageName = signal('');
  villageDistrict = signal('');
  villageState = signal('');
  saving = signal(false);

  constructor() {
    effect(() => {
      const loc = this.localityService.selectedLocality();
      if (loc) {
        this.villageName.set(loc.name);
        this.villageDistrict.set(loc.district || '');
        this.villageState.set(loc.state || '');
      }
    });
  }

  saveVillage(): void {
    if (!this.isAdmin()) {
      this.notifications.error('Only administrators can edit the village name.');
      return;
    }

    const locId = this.localityService.selectedLocalityId();
    if (!locId) {
      this.notifications.error('No village selected.');
      return;
    }

    const name = this.villageName().trim();
    if (!name) {
      this.notifications.error('Village name cannot be empty.');
      return;
    }

    this.saving.set(true);
    this.localityService
      .updateLocality(locId, {
        name,
        district: this.villageDistrict().trim(),
        state: this.villageState().trim(),
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (updated) => {
          this.notifications.success(`Village name updated to "${updated.name}"!`);
        },
        error: (err) => {
          this.notifications.error(err?.error?.message || 'Failed to update village name');
        },
      });
  }

  logout(): void {
    this.auth.logout();
    this.notifications.info('You have been logged out.');
    this.router.navigate(['/auth/login']);
  }
}
