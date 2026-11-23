import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { TokenStorageService } from './token-storage.service';
import { LocalityService } from './locality.service';
import { AuthResponse, LoginPayload, RegisterPayload, User, Locality } from '../models';
import { ApiResponse } from '../models/api.model';

/**
 * Holds the authenticated user as a signal so any component/guard can read
 * it reactively without subscribing. Tokens themselves live in
 * TokenStorageService; this service is the single place that mutates both
 * in lockstep (e.g. clearing one always clears the other).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private tokens = inject(TokenStorageService);
  private localityService = inject(LocalityService);
  private router = inject(Router);

  private currentUserSignal = signal<User | null>(null);

  readonly currentUser = computed(() => this.currentUserSignal());
  readonly isAuthenticated = computed(() => !!this.currentUserSignal());
  readonly role = computed(() => this.currentUserSignal()?.role ?? null);
  readonly isAdmin = computed(() => this.role() === 'admin');
  readonly isScorer = computed(() => this.role() === 'admin' || this.role() === 'scorer');

  login(payload: LoginPayload): Observable<ApiResponse<AuthResponse>> {
    return this.api.post<ApiResponse<AuthResponse>>('/auth/login', payload).pipe(
      tap((res) => this.handleAuthSuccess(res.data))
    );
  }

  register(payload: RegisterPayload): Observable<ApiResponse<AuthResponse>> {
    return this.api.post<ApiResponse<AuthResponse>>('/auth/register', payload).pipe(
      tap((res) => this.handleAuthSuccess(res.data))
    );
  }

  /** Called once at app start to restore the session from a stored access token, if any. */
  loadCurrentUser(): Observable<ApiResponse<{ user: User }>> {
    return this.api.get<ApiResponse<{ user: User }>>('/auth/me').pipe(
      tap((res) => {
        this.currentUserSignal.set(res.data.user);
        this.syncUserLocality(res.data.user);
      })
    );
  }

  refreshAccessToken(): Observable<ApiResponse<{ accessToken: string; refreshToken: string }>> {
    const refreshToken = this.tokens.getRefreshToken();
    return this.api
      .post<ApiResponse<{ accessToken: string; refreshToken: string }>>('/auth/refresh', { refreshToken })
      .pipe(
        tap((res) => {
          this.tokens.setTokens(res.data.accessToken, res.data.refreshToken);
        })
      );
  }

  logout(): void {
    const refreshToken = this.tokens.getRefreshToken();
    // Fire-and-forget: even if the network call fails, clear local state so
    // the user is logged out of THIS device immediately.
    this.api.post('/auth/logout', { refreshToken }).subscribe({
      next: () => undefined,
      error: () => undefined,
    });
    this.clearSession();
    this.router.navigate(['/auth/login']);
  }

  /** Used by the auth interceptor when a refresh attempt itself fails. */
  clearSession(): void {
    this.tokens.clear();
    this.currentUserSignal.set(null);
  }

  hasValidSession(): boolean {
    return !!this.tokens.getAccessToken();
  }

  restoreSessionIfPresent(): void {
    if (this.hasValidSession() && !this.currentUserSignal()) {
      this.loadCurrentUser().subscribe({
        next: () => undefined,
        error: () => this.clearSession(),
      });
    }
  }

  private handleAuthSuccess(data: AuthResponse): void {
    this.tokens.setTokens(data.accessToken, data.refreshToken);
    this.currentUserSignal.set(data.user);
    this.syncUserLocality(data.user);
  }

  private syncUserLocality(user: User): void {
    if (!user.locality) return;
    if (typeof user.locality === 'object' && (user.locality as Locality)._id) {
      this.localityService.setLocality(user.locality as Locality);
    } else if (typeof user.locality === 'string') {
      this.localityService.setLocalityById(user.locality);
    }
  }
}
