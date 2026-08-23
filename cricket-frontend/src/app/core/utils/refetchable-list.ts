import { Signal, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Observable, catchError, of, switchMap } from 'rxjs';

/**
 * Wraps a "fetch a list" observable factory in a signal that re-fetches
 * whenever `.refresh()` is called — the common pattern every admin list
 * page needs after a create/edit/delete mutation. Returns the data signal
 * (defaulting to `fallback` on error or before the first load completes)
 * plus a `refresh()` function to trigger a re-fetch.
 *
 * Usage:
 *   const teams = refetchableList(() => teamService.list({ limit: 100 }), null);
 *   teams.data()       // Signal<PaginatedResponse<Team> | null>
 *   teams.refresh()    // call after a mutation to reload the list
 */
export function refetchableList<T>(
  fetch: () => Observable<T>,
  fallback: T
): { data: Signal<T>; refresh: () => void } {
  const trigger = signal(0);

  const data = toSignal(
    toObservable(trigger).pipe(
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
