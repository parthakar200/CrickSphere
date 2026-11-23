import { HttpInterceptorFn } from '@angular/common/http';

const STORAGE_KEY = 'cricket_selected_locality';

/**
 * Attaches `x-locality-id: <id>` to every outgoing request that
 * targets our own API so that all data (matches, teams, tournaments,
 * players, stats, search) is automatically partitioned by the chosen village.
 *
 * Reads directly from localStorage to prevent circular DI dependencies during
 * early application initialization.
 */
export const localityInterceptor: HttpInterceptorFn = (req, next) => {
  // Do not attach locality headers to locality metadata endpoints or auth routes
  if (req.url.includes('/api/localities') || req.url.includes('/api/auth/')) {
    return next(req);
  }

  let localityId: string | null = null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      localityId = parsed?._id || null;
    }
  } catch {
    // Ignore JSON parse error or restricted storage
  }

  if (localityId && !req.headers.has('x-locality-id')) {
    const localityReq = req.clone({
      setHeaders: { 'x-locality-id': localityId },
    });
    return next(localityReq);
  }

  return next(req);
};
