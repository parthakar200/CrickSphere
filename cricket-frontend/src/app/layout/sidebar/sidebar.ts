import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Store } from '@ngrx/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
import { uiFeature, toggleSidebar } from '../../state/ui/ui.state';

export interface NavItem {
  label: string;
  icon: string;
  route: string;
  /** If set, only visible to users whose role is in this list. Omit for "everyone". */
  roles?: Array<'admin' | 'scorer' | 'viewer'>;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: 'space_dashboard', route: '/dashboard' },
  { label: 'Live Matches', icon: 'sensors', route: '/matches/live' },
  { label: 'Tournaments', icon: 'emoji_events', route: '/tournaments' },
  { label: 'Teams', icon: 'groups', route: '/teams' },
  { label: 'Players', icon: 'sports_cricket', route: '/players' },
  { label: 'Statistics', icon: 'monitoring', route: '/statistics' },
  { label: 'Leaderboards', icon: 'leaderboard', route: '/leaderboards' },
  { label: 'Admin Panel', icon: 'admin_panel_settings', route: '/admin', roles: ['admin'] },
];

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  private store = inject(Store);
  private auth = inject(AuthService);

  collapsed = toSignal(this.store.select(uiFeature.selectSidebarCollapsed), { initialValue: false });

  visibleItems = computed(() => {
    const role = this.auth.role();
    return NAV_ITEMS.filter((item) => !item.roles || (role && item.roles.includes(role)));
  });

  toggle(): void {
    this.store.dispatch(toggleSidebar());
  }
}
