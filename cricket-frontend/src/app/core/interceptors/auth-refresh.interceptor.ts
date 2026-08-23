import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { TokenStorageService } from '../services/token-storage.service';

// Module-level (not DI-scoped) state so every call of this interceptor
// function shares the same in-flight-refresh tracking, regardless of which
// HttpClient call triggered it.
let isRefreshing = false;
const refreshedTokenSubject = new BehaviorSubject<string | null>(null);

/**
 * On a 401 response (and only for our own API, and only once per request),
 * attempts a single token refresh. If a refresh is already in flight for a
 * concurrent request, this subscriber waits for it instead of firing a
 * second refresh call, then retries the original request with the new
 * access token. If the refresh itself fails, the session is cleared and the
 * user is redirected to login.
 */
export const authRefreshInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const tokens = inject(TokenStorageService);

  const isAuthEndpoint = /\/auth\/(login|register|refresh)$/.test(req.url);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || isAuthEndpoint) {
        return throwError(() => error);
      }

      if (isRefreshing) {
        // Wait for the in-flight refresh to finish, then retry with the new token.
        return refreshedTokenSubject.pipe(
          filter((token): token is string => token !== null),
          take(1),
          switchMap((token) => next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })))
        );
      }

      isRefreshing = true;
      refreshedTokenSubject.next(null);

      return authService.refreshAccessToken().pipe(
        switchMap((res) => {
          isRefreshing = false;
          refreshedTokenSubject.next(res.data.accessToken);
          return next(req.clone({ setHeaders: { Authorization: `Bearer ${res.data.accessToken}` } }));
        }),
        catchError((refreshError) => {
          isRefreshing = false;
          tokens.clear();
          authService.clearSession();
          return throwError(() => refreshError);
        })
      );
    })
  );
};
