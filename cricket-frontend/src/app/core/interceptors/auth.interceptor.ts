import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TokenStorageService } from '../services/token-storage.service';

/**
 * Attaches `Authorization: Bearer <token>` to every outgoing request that
 * targets our own API. Skips auth endpoints that don't need (or shouldn't
 * send) a stale token, like login/register/refresh.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokens = inject(TokenStorageService);

  const isAuthEndpoint = /\/auth\/(login|register|refresh)$/.test(req.url);
  const accessToken = tokens.getAccessToken();

  if (!accessToken || isAuthEndpoint) {
    return next(req);
  }

  const authReq = req.clone({
    setHeaders: { Authorization: `Bearer ${accessToken}` },
  });
  return next(authReq);
};
