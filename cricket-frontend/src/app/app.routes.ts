import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    canActivate: [guestGuard],
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
      },
      {
        path: 'register',
        loadComponent: () => import('./features/auth/register/register').then((m) => m.Register),
      },
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ],
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell/shell').then((m) => m.Shell),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
        title: 'Dashboard — CrickSphere',
      },

      // Live Match Center. /matches/live MUST be registered before the
      // /matches/:id/live param route below, or the router would try to
      // match "live" itself as a :id.
      {
        path: 'matches/live',
        loadComponent: () => import('./features/matches/live-match-list').then((m) => m.LiveMatchList),
        title: 'Live Matches — CrickSphere',
      },
      {
        path: 'matches/:id/live',
        loadComponent: () => import('./features/matches/live-match').then((m) => m.LiveMatch),
        title: 'Live Match — CrickSphere',
      },
      {
        path: 'matches/:id',
        loadComponent: () => import('./features/matches/match-detail').then((m) => m.MatchDetail),
        title: 'Match — CrickSphere',
      },

      // Tournaments
      {
        path: 'tournaments',
        loadComponent: () =>
          import('./features/tournaments/tournament-browse-list').then((m) => m.TournamentBrowseList),
        title: 'Tournaments — CrickSphere',
      },
      {
        path: 'tournaments/:id',
        loadComponent: () => import('./features/tournaments/tournament-detail').then((m) => m.TournamentDetail),
        title: 'Tournament — CrickSphere',
      },

      // Teams
      {
        path: 'teams',
        loadComponent: () => import('./features/teams/team-browse-list').then((m) => m.TeamBrowseList),
        title: 'Teams — CrickSphere',
      },
      {
        path: 'teams/:id',
        loadComponent: () => import('./features/teams/team-detail').then((m) => m.TeamDetail),
        title: 'Team — CrickSphere',
      },

      // Players
      {
        path: 'players',
        loadComponent: () => import('./features/players/player-browse-list').then((m) => m.PlayerBrowseList),
        title: 'Players — CrickSphere',
      },
      {
        path: 'players/:id',
        loadComponent: () => import('./features/players/player-profile').then((m) => m.PlayerProfile),
        title: 'Player — CrickSphere',
      },

      // Statistics & Leaderboards
      {
        path: 'statistics',
        loadComponent: () => import('./features/statistics/statistics').then((m) => m.Statistics),
        title: 'Statistics Center — CrickSphere',
      },
      {
        path: 'leaderboards',
        loadComponent: () => import('./features/leaderboards/leaderboards').then((m) => m.Leaderboards),
        title: 'Leaderboards — CrickSphere',
      },

      // Still placeholders — out of scope for this pass: global search UI
      // and the user's own account/profile settings (distinct from a
      // PLAYER profile above, which is cricket data, not account settings).
      {
        path: 'search',
        data: { section: 'search' },
        loadChildren: () => import('./features/placeholder/placeholder.routes').then((m) => m.PLACEHOLDER_ROUTES),
      },
      {
        path: 'profile',
        data: { section: 'profile' },
        loadChildren: () => import('./features/placeholder/placeholder.routes').then((m) => m.PLACEHOLDER_ROUTES),
      },

      {
        path: 'admin',
        loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
