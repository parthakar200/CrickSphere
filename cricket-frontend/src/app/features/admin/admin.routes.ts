// import { Routes } from '@angular/router';
// import { roleGuard } from '../../core/guards/auth.guard';

// export const ADMIN_ROUTES: Routes = [
//   {
//     path: '',
//     canActivate: [roleGuard(['admin'])],
//     loadComponent: () => import('./admin-shell').then((m) => m.AdminShell),
//     children: [
//       {
//         path: 'teams',
//         children: [
//           { path: '', loadComponent: () => import('./teams/team-list').then((m) => m.TeamList) },
//           { path: 'new', loadComponent: () => import('./teams/team-form').then((m) => m.TeamForm) },
//           { path: ':id/edit', loadComponent: () => import('./teams/team-form').then((m) => m.TeamForm) },
//         ],
//       },
//       {
//         path: 'players',
//         children: [
//           { path: '', loadComponent: () => import('./players/player-list').then((m) => m.PlayerList) },
//           { path: 'new', loadComponent: () => import('./players/player-form').then((m) => m.PlayerForm) },
//           { path: ':id/edit', loadComponent: () => import('./players/player-form').then((m) => m.PlayerForm) },
//         ],
//       },
//       {
//         path: 'tournaments',
//         children: [
//           {
//             path: '',
//             loadComponent: () => import('./tournaments/tournament-list').then((m) => m.TournamentList),
//           },
//           {
//             path: 'new',
//             loadComponent: () => import('./tournaments/tournament-form').then((m) => m.TournamentForm),
//           },
//           {
//             path: ':id/edit',
//             loadComponent: () => import('./tournaments/tournament-form').then((m) => m.TournamentForm),
//           },
//         ],
//       },
//       {
//         path: 'matches',
//         children: [
//           { path: '', loadComponent: () => import('./matches/match-list').then((m) => m.MatchList) },
//           { path: 'new', loadComponent: () => import('./matches/match-form').then((m) => m.MatchForm) },
//         ],
//       },
//       { path: '', redirectTo: 'teams', pathMatch: 'full' },
//     ],
//   },
// ];

















import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/auth.guard';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    canActivate: [roleGuard(['admin'])],
    loadComponent: () => import('./admin-shell').then((m) => m.AdminShell),
    children: [
      {
        path: 'teams',
        children: [
          { path: '', loadComponent: () => import('./teams/team-list').then((m) => m.TeamList) },
          { path: 'new', loadComponent: () => import('./teams/team-form').then((m) => m.TeamForm) },
          { path: ':id/edit', loadComponent: () => import('./teams/team-form').then((m) => m.TeamForm) },
          { path: ':id/squad', loadComponent: () => import('./teams/team-squad').then((m) => m.TeamSquad) },
        ],
      },
      {
        path: 'players',
        children: [
          { path: '', loadComponent: () => import('./players/player-list').then((m) => m.PlayerList) },
          { path: 'new', loadComponent: () => import('./players/player-form').then((m) => m.PlayerForm) },
          { path: ':id/edit', loadComponent: () => import('./players/player-form').then((m) => m.PlayerForm) },
        ],
      },
      {
        path: 'tournaments',
        children: [
          {
            path: '',
            loadComponent: () => import('./tournaments/tournament-list').then((m) => m.TournamentList),
          },
          {
            path: 'new',
            loadComponent: () => import('./tournaments/tournament-form').then((m) => m.TournamentForm),
          },
          {
            path: ':id/edit',
            loadComponent: () => import('./tournaments/tournament-form').then((m) => m.TournamentForm),
          },
        ],
      },
      {
        path: 'matches',
        children: [
          { path: '', loadComponent: () => import('./matches/match-list').then((m) => m.MatchList) },
          { path: 'new', loadComponent: () => import('./matches/match-form').then((m) => m.MatchForm) },
        ],
      },
      { path: '', redirectTo: 'teams', pathMatch: 'full' },
    ],
  },
];