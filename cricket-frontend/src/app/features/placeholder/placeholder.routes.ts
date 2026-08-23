import { Routes } from '@angular/router';

// `path: '**'` catches every sub-path under the parent section (e.g.
// /matches/live, /admin/matches/new), not just the bare section root. The
// section key itself comes through as a route PARAM (see app.routes.ts,
// which sets `data: { section: '...' }` on the PARENT route) rather than
// being read from this child route's own `data` — data set on a parent
// route from a separate lazy-loaded route config is not reliably inherited
// down into routes loaded via `loadChildren` unless the router is
// explicitly configured with `paramsInheritanceStrategy: 'always'`, which
// this app doesn't set. Reading `route.parent.snapshot.data` from the
// Placeholder component sidesteps that entirely.
export const PLACEHOLDER_ROUTES: Routes = [
  {
    path: '**',
    loadComponent: () => import('./placeholder').then((m) => m.Placeholder),
  },
];
