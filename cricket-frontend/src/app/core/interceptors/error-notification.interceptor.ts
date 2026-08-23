import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';
import { ApiErrorResponse } from '../models/api.model';

/**
 * Surfaces backend error messages as toasts. Deliberately skips 401s (the
 * refresh interceptor owns that flow and will either retry transparently or
 * redirect to login — showing a toast in between would just be noise) and
 * skips 0/network errors here too, since those are usually better handled
 * contextually (e.g. an offline banner) than as a generic toast.
 */
export const errorNotificationInterceptor: HttpInterceptorFn = (req, next) => {
  const notifications = inject(NotificationService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status !== 401 && error.status !== 0) {
        const body = error.error as ApiErrorResponse | undefined;
        const message = body?.message || 'Something went wrong. Please try again.';
        notifications.error(message);
      }
      return throwError(() => error);
    })
  );
};
