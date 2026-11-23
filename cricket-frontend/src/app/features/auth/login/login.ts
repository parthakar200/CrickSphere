import { Component, OnInit, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { LocalityService } from '../../../core/services/locality.service';
import { NotificationService } from '../../../core/services/notification.service';

export type AuthPageMode = 'spectator' | 'signin' | 'signup';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  readonly localityService = inject(LocalityService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notifications = inject(NotificationService);

  // Active view: spectator (default) | signin | signup
  mode = signal<AuthPageMode>('spectator');

  loading = signal(false);
  signingUp = signal(false);
  showSignInPassword = signal(false);
  showSignUpPassword = signal(false);

  // Spectator selection (no password required)
  viewerLocalityId = signal<string>('');

  // Sign In Form
  signInForm = this.fb.nonNullable.group({
    localityId: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  // Sign Up Form (Only Village Name, Admin Email/ID, Scorer Email/ID, Password)
  signUpForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    adminEmail: ['', [Validators.required, Validators.email]],
    scorerEmail: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  constructor() {
    effect(() => {
      const currentLocId = this.localityService.selectedLocalityId();
      if (currentLocId) {
        if (!this.signInForm.controls.localityId.value) {
          this.signInForm.controls.localityId.setValue(currentLocId);
        }
        if (!this.viewerLocalityId()) {
          this.viewerLocalityId.set(currentLocId);
        }
      }
    });
  }

  ngOnInit(): void {
    // Always fetch latest list of villages when visiting the page
    this.localityService.loadLocalities().subscribe({
      next: (res) => {
        const list = res.data || [];
        const currentLocId = this.localityService.selectedLocalityId();
        if (currentLocId) {
          this.signInForm.controls.localityId.setValue(currentLocId);
          this.viewerLocalityId.set(currentLocId);
        } else if (list.length > 0) {
          const first = list.find((l) => l.isDefault) || list[0];
          this.signInForm.controls.localityId.setValue(first._id);
          this.viewerLocalityId.set(first._id);
        }
      },
      error: () => undefined,
    });
  }

  setMode(m: AuthPageMode): void {
    this.mode.set(m);
  }

  onViewerLocalityChange(id: string): void {
    this.viewerLocalityId.set(id);
    this.localityService.setLocalityById(id);
  }

  exploreAsViewer(): void {
    const locId = this.viewerLocalityId() || this.localityService.selectedLocalityId();
    if (locId) {
      this.localityService.setLocalityById(locId);
    }
    const locName = this.localityService.selectedLocalityName();
    this.notifications.success(`Welcome to ${locName} cricket! Viewing live scores & matches.`);
    this.router.navigateByUrl('/dashboard');
  }

  registerVillage(): void {
    if (this.signUpForm.invalid) {
      this.signUpForm.markAllAsTouched();
      return;
    }

    const payload = this.signUpForm.getRawValue();

    if (payload.adminEmail.trim().toLowerCase() === payload.scorerEmail.trim().toLowerCase()) {
      this.notifications.error('Admin Email and Scorer Email must be different');
      return;
    }

    this.signingUp.set(true);

    this.localityService
      .createLocality(payload)
      .pipe(finalize(() => this.signingUp.set(false)))
      .subscribe({
        next: (loc) => {
          this.notifications.success(
            `${loc.name} registered! Admin (${payload.adminEmail}) and Scorer (${payload.scorerEmail}) accounts are ready.`
          );

          // Select the new village
          this.viewerLocalityId.set(loc._id);
          this.signInForm.controls.localityId.setValue(loc._id);

          // Pre-fill Sign In form with Admin credentials
          this.signInForm.controls.email.setValue(payload.adminEmail);
          this.signInForm.controls.password.setValue(payload.password);

          this.signUpForm.reset();

          // Immediately replace with the Sign In view so user can login right away
          this.mode.set('signin');
        },
        error: () => undefined,
      });
  }

  submitSignIn(): void {
    if (this.signInForm.invalid) {
      this.signInForm.markAllAsTouched();
      return;
    }

    const payload = this.signInForm.getRawValue();
    this.loading.set(true);

    this.auth
      .login(payload)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.localityService.setLocalityById(payload.localityId);
          this.notifications.success('Welcome back!');
          const redirectTo = this.route.snapshot.queryParamMap.get('redirectTo') || '/dashboard';
          this.router.navigateByUrl(redirectTo);
        },
        error: () => undefined,
      });
  }
}
