# Cricket Scoring & Tournament Management — Backend

Node.js / Express / MongoDB (Mongoose) backend for the cricket scoring and
tournament management system. This is **Stage 1** of the full MEAN-stack
build: the database design, REST APIs, statistics engine, and real-time
scoring layer. The Angular frontend, Docker/deployment configs, and seed
data are separate stages.

## Setup

```bash
npm install
cp .env.example .env   # then edit MONGO_URI, JWT secrets, etc.
npm run dev            # nodemon, auto-restart
# or
npm start               # plain node
```

Requires a running MongoDB instance (local `mongod` or Atlas). Health check
at `GET /health`.

### Verifying the install

```bash
npm run seed
```

Wipes the target database and creates demo users, three teams, five
players, one single match, and a two-match tournament — scoring real balls
through `recordBall()` (not faked totals) so the whole pipeline gets
exercised. It specifically reproduces the spec's headline example: a player
scores 50 in a single match, then 80 and 30 in two tournament matches, and
the script asserts their `CareerStats.batting.runs` comes out to exactly
160. Demo logins (all role variants, password `Password123!`):

- `admin@cricket.local`
- `scorer@cricket.local`
- `viewer@cricket.local`

> **Note:** this repo was built in a sandboxed environment without a real
> MongoDB instance reachable on the network, so the scoring logic was
> verified by careful manual code tracing and a standalone math-only test
> suite (strike rate, economy, NRR, over-numbering, strike rotation) rather
> than a live integration run. Run `npm run seed` yourself once you have
> MongoDB available — if anything doesn't check out, the script's final
> assertion will tell you immediately.

## Architecture

```
config/        env loading, MongoDB connection
models/        13 Mongoose schemas (see below)
controllers/   request handlers, one per resource
routes/        Express routers, mounted in app.js
middleware/    JWT auth, RBAC, validation, global error handler
services/      business logic with no Express dependency:
                 - scoringService.js  ball-by-ball orchestration
                 - statsEngine.js     batting/bowling/fielding/career stats
                 - leaderboardService.js  every leaderboard aggregation
sockets/       Socket.IO real-time live-scoring handlers
validators/    express-validator chains per resource
utils/         JWT helpers, ApiError, asyncHandler, logger, pagination
```

### Data model

`Match.mode` is `'single'` or `'tournament'`. Every per-ball stat row
(`BattingStats`, `BowlingStats`, `FieldingStats`) is tagged with `mode` and
an optional `tournament` ref, but **`CareerStats` never filters by mode** —
it's a single aggregated document per player computed by summing across all
of a player's stat rows regardless of mode. That's what makes a single-match
50 and a tournament 80 and 30 combine into a career total of 160 runs, per
the spec.

Scoring hierarchy: `Match` → `Innings` → `Over` → `Ball`. Every ball is a
document; overs and innings hold references and running totals (totalRuns,
totalWickets, extras, fall of wickets, partnerships). The stats engine reads
each saved `Ball` and updates the relevant stat rows, then incrementally
recomputes `CareerStats` for just the players involved (not a full table
scan).

`scoringService.js#recordBall()` rejects a ball if: the innings is already
completed, striker/non-striker/bowler aren't three distinct players, runs
are out of range, or the innings has already used its full quota of overs /
all ten wickets. It also auto-rotates the striker based on odd runs and
over completion (you do not need to call the separate `rotateStrike` helper
after a normal ball — that's a manual-correction tool only), and
auto-flags `innings.isCompleted` the moment all-out, overs-complete, or
(for a chasing team) the target is reached. Starting the next innings or
marking the match complete remains an explicit scorer/admin action, since a
Test innings can also end by declaration, which only a human can decide.

### Real-time scoring

`sockets/liveScoring.js` mirrors the REST scoring endpoint
(`POST /api/matches/:matchId/innings/:inningsId/ball`) over Socket.IO for
lower latency. Clients join room `match:<matchId>`; scorers emit
`ball:record` (role-checked against the JWT passed in the socket handshake
`auth.token`), and the server broadcasts `ball:scored` to everyone in the
room. Viewers can connect without a token (read-only).

### Auth & roles

JWT access + refresh tokens (rotated on refresh). Roles: `admin`, `scorer`,
`viewer`, enforced via `middleware/auth.js#authorize(...)`.

## API surface

| Resource | Base path | Notes |
|---|---|---|
| Auth | `/api/auth` | register, login, refresh, logout, me |
| Teams | `/api/teams` | CRUD, add/remove players |
| Players | `/api/players` | CRUD, profile returns embedded `careerStats` |
| Tournaments | `/api/tournaments` | CRUD, `/teams`, `/dashboard`, `/points-table` |
| Matches | `/api/matches` | create, `/toss`, `/start-next-innings`, `/live`, `/complete` |
| Scoring | `/api/matches/:matchId/innings/:inningsId/ball` | record a ball (REST fallback) |
| Leaderboards | `/api/leaderboards/*` | most-runs, best-strike-rate, most-sixes, most-fours, most-wickets, best-economy, most-dot-balls, best-bowling-average, fielding |
| Statistics | `/api/statistics/*` | overview, batting-analytics, bowling-analytics, team-analytics |
| Search | `/api/search?q=...&type=player\|team\|tournament\|match` | |

All list endpoints accept `page`, `limit`, `sort` (e.g. `?sort=-runs`), and
resource-specific filters (`?team=`, `?tournament=`, `?search=`, etc.).
Leaderboards accept `?tournament=<id>` to scope to one tournament instead of
all-time career totals, plus `?limit=`, `?minBalls=`, `?minOvers=`,
`?minWickets=` where relevant.

## What's NOT in this stage

- Angular frontend
- Docker / Nginx / deployment configs
- Seed/demo data script
- Export (PDF/Excel) and notification features

These are queued as the next build stages.
