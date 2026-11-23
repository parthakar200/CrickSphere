import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models';

/**
 * Guards any route that requires a logged-in user. If a session token
 * exists but the user signal hasn't been populated yet (e.g. a hard
 * refresh), it tries to load the current user from the API before deciding;
 * if that fails (expired/invalid token), it redirects to login.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) return true;

  if (!auth.hasValidSession()) {
    return router.createUrlTree(['/auth/login'], { queryParams: { redirectTo: state.url } });
  }

  return auth.loadCurrentUser().pipe(
    map(() => true),
    catchError(() => of(router.createUrlTree(['/auth/login'], { queryParams: { redirectTo: state.url } })))
  );
};

/** Redirects an already-authenticated user away from login/register pages. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated() ? router.createUrlTree(['/dashboard']) : true;
};

/**
 * Factory for a role-restricted guard, e.g. `roleGuard(['admin'])` on the
 * admin panel route. If user has a valid session token, it verifies credentials
 * first before deciding.
 */
export function roleGuard(allowedRoles: UserRole[]): CanActivateFn {
  return (route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);

    const checkRole = () => {
      const role = auth.role();
      if (role && allowedRoles.includes(role)) return true;
      return router.createUrlTree(['/auth/login'], { queryParams: { redirectTo: state.url } });
    };

    if (auth.isAuthenticated()) {
      return checkRole();
    }

    if (auth.hasValidSession()) {
      return auth.loadCurrentUser().pipe(
        map(() => checkRole()),
        catchError(() => of(router.createUrlTree(['/auth/login'], { queryParams: { redirectTo: state.url } })))
      );
    }

    return router.createUrlTree(['/auth/login'], { queryParams: { redirectTo: state.url } });
  };
}
