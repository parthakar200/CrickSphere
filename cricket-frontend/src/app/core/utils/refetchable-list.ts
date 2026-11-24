import { Signal, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Observable, catchError, combineLatest, of, switchMap } from 'rxjs';
import { LocalityService } from '../services/locality.service';

/**
 * Wraps a "fetch a list" observable factory in a signal that re-fetches
 * whenever `.refresh()` is called OR when the active village/locality changes.
 * Returns the data signal plus a `refresh()` function.
 */
export function refetchableList<T>(
  fetch: () => Observable<T>,
  fallback: T
): { data: Signal<T>; refresh: () => void } {
  const trigger = signal(0);
  const localityService = inject(LocalityService);
  const locality$ = toObservable(localityService.selectedLocalityId);

  const data = toSignal(
    combineLatest([toObservable(trigger), locality$]).pipe(
      switchMap(() => fetch()),
      catchError(() => of(fallback))
    ),
    { initialValue: fallback }
  );

  return {
    data,
    refresh: () => trigger.update((n) => n + 1),
  };
}
