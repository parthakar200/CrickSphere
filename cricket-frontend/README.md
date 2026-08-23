# CrickSphere — Frontend

Angular 20 (standalone components, signals) frontend for the cricket
scoring and tournament management system. Every feature area from the
original spec is now built: auth, layout shell, dashboard, Admin Panel
(full CRUD), Live Match Center (toss + ball-by-ball scoring over
Socket.IO), Tournaments (points table/NRR), Teams, Players (full combined
career-stats profile), Statistics Center, and Leaderboards.

## Setup

```bash
npm install
npm start          # ng serve, http://localhost:4200
```

Points at the backend via `src/app/environments/environment.ts`
(`apiUrl: 'http://localhost:5000/api'`, `socketUrl: 'http://localhost:5000'`).
Edit that file (and `environment.prod.ts` for the production build) if your
backend runs elsewhere. Start the backend first — almost every page needs
it, and login/register need it immediately.

```bash
npm run build       # production build → dist/cricket-frontend
```

## Architecture

```
core/
  models/       TypeScript interfaces mirroring the backend's API shapes.
                Several deliberately do NOT reuse the full `Player`/`Team`
                model — e.g. `TeamRosterPlayer`, `TeamCaptainSummary`,
                `LeaderboardPlayerSummary` — because the backend's
                `.populate(field, 'only these fields')` calls return a
                strictly smaller shape than the full model in several
                places. Reusing the full model there would let TypeScript
                accept code that reads a field the response doesn't
                actually have.
  services/     ApiService, AuthService, SocketService, TokenStorageService,
                NotificationService, StatisticsService, LiveTickerService,
                TeamService, PlayerService, TournamentService, MatchService,
                LeaderboardService
  guards/       authGuard, guestGuard, roleGuard(['admin']) — actually
                protects /admin, not just hidden from the nav
  interceptors/ authInterceptor, authRefreshInterceptor (transparent
                401 -> refresh -> retry, queues concurrent requests),
                errorNotificationInterceptor
  utils/        refetchableList() (signal-based "fetch + refresh after
                mutation" helper), leaderboard-normalize.ts (see below)
state/
  ui/           NgRx feature slice: theme (dark/light), sidebar collapsed
layout/
  shell/        sidebar + topbar + mobile nav wrapper for authenticated routes
shared/
  components/   stat-card, chart (Chart.js wrapper), toast-container
features/
  auth/         login, register
  dashboard/    overview stats, charts, live-matches panel
  admin/        Teams / Players / Tournaments / Matches — full CRUD,
                role-gated to admin accounts only
  matches/      live-match-list (/matches/live) + live-match
                (/matches/:id/live) — toss, opening-players picker,
                ball-by-ball scoring, live scorecard, all driven by
                Socket.IO with a REST fallback already in the backend
  tournaments/  browse list + detail (overview stats, points table, matches)
  teams/        browse list + detail (roster)
  players/      browse list (search + role filter) + profile (full
                batting/bowling/fielding career stats)
  statistics/   batting/bowling/team analytics, tabbed, Chart.js
  leaderboards/ all 9 backend leaderboard endpoints, tabbed, with the
                tournament-scope and min-balls/overs/wickets filters each
                endpoint supports
  placeholder/  still used for /search and /profile only (global search UI
                and account settings were out of scope for this pass)
```

### A real backend quirk this frontend works around

Every leaderboard endpoint (`/api/leaderboards/*`) returns ONE of two
different JSON shapes depending on whether a `?tournament=` filter is
applied: a flat aggregation row when scoped to one tournament, or a full
populated `CareerStats` document (nested `batting`/`bowling`/`fielding`
objects) for the all-time/career view. `core/utils/leaderboard-normalize.ts`
maps both into one consistent row shape per leaderboard type so the
`Leaderboards` component's templates never need to branch on which shape
they got. This was caught by reading the backend's aggregation pipelines
directly, not by trial and error — worth knowing about if either side
changes independently in the future.

### Live Match Center specifics

- `/matches/live` polls `GET /matches?status=live` every 15s for the "live
  now" list (a full socket subscription isn't needed just to know *which*
  matches are live — only the match detail page needs ball-by-ball
  granularity).
- `/matches/:id/live` joins the `match:<id>` Socket.IO room on mount, leaves
  it on destroy, and listens for `ball:scored` / `innings:completed` to
  trigger a clean refetch of `GET /matches/:id/live` rather than trying to
  patch the scorecard in place — the backend already computes run rate,
  required run rate, partnerships, and auto-completion; re-deriving any of
  that client-side would just be a second, possibly-divergent
  implementation of the same math.
- There's no backend endpoint for "set the opening batsmen/bowler" — the
  Innings document's `currentStrikerBatsman` etc. only get set as a
  side-effect of the FIRST recorded ball. The opening-players picker
  (`live-match/opening-players-form`) is local-only UI state that feeds
  into that first ball's payload; once it succeeds, the component switches
  to reading the real values back off the refreshed Innings document.
- The run/extras split in `ball-controls.ts` matches the backend's exact
  convention (see the comment block at the top of that file): a no-ball is
  the one case needing two separate run numbers — runs off the bat (which
  CAN be a four or six) and the no-ball penalty — since the backend computes
  `runsConceded = runsScored + extra.runs` for both wides and no-balls.
  Getting this wrong would silently misattribute runs between the batsman's
  stats and the bowler's economy.

## What's still a placeholder

- Global search UI (`/search`) — the backend's `/api/search` endpoint
  exists and works; there's just no dedicated results page wired to it yet.
  The topbar search bar currently navigates to `/search?q=...` and shows
  the generic placeholder.
- Account/profile settings (`/profile`) — distinct from a *player's* public
  profile page (`/players/:id`), which is fully built. This would be a
  user's own account settings (change password, etc.), not built.
- Service worker / installability — the manifest exists at
  `public/manifest.webmanifest` but only has a single small favicon-sized
  icon and no service worker. Running `ng add @angular/pwa` and adding
  proper 192/512px + maskable icons is the next step for real PWA support.
- Export (PDF/Excel) and a notification-center UI (toasts exist; there's no
  persistent notification list).
- Automated tests beyond the default scaffold spec — no browser was
  available in the sandbox this was built in to run Karma. Every page was
  instead verified via a clean `npm install` + `npx tsc --noEmit` + a full
  development AND production `ng build` from scratch, which catches type
  errors, template binding errors (Angular's template compiler does a
  separate, stricter pass during a real build than `tsc --noEmit` alone —
  this caught at least one real bug during development), and bundle/budget
  issues, but obviously can't substitute for actually clicking through the
  app against a live backend. Run `npm test` yourself, and please report
  back anything that doesn't work as expected once you've tried it against
  real data.

## Verifying the install

```bash
npx tsc --noEmit -p tsconfig.app.json   # typecheck, should be clean
npm run build                            # production build
npm start                                 # then visit http://localhost:4200
```

Use the backend's seed script (`npm run seed` in `cricket-backend`) for a
ready-made admin/scorer/viewer login plus a single match and a two-match
tournament already scored — enough to see the Player Profile, Tournament
Detail, Statistics Center, and Leaderboards pages populated with real data
immediately rather than empty states.
