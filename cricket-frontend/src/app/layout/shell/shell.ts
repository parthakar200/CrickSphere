import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { Sidebar, NAV_ITEMS, NavItem } from '../sidebar/sidebar';
import { Topbar } from '../topbar/topbar';
import { ToastContainer } from '../../shared/components/toast-container/toast-container';
import { uiFeature } from '../../state/ui/ui.state';
import { AuthService } from '../../core/services/auth.service';

const MOBILE_PRIMARY_ROUTES = ['/dashboard', '/matches/live', '/tournaments', '/leaderboards'];

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Sidebar, Topbar, ToastContainer],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  private store = inject(Store);
  private auth = inject(AuthService);

  sidebarCollapsed = toSignal(this.store.select(uiFeature.selectSidebarCollapsed), { initialValue: false });
  isAdmin = this.auth.isAdmin;

  private visibleNavItems = computed(() => {
    const role = this.auth.role();
    return NAV_ITEMS.filter((item: NavItem) => !item.roles || (role && item.roles.includes(role)));
  });

  mobilePrimaryItems = computed(() =>
    this.visibleNavItems().filter((item: NavItem) => MOBILE_PRIMARY_ROUTES.includes(item.route))
  );
  mobileMoreItems = computed(() =>
    this.visibleNavItems().filter((item: NavItem) => !MOBILE_PRIMARY_ROUTES.includes(item.route))
  );

  moreOpen = signal(false);
  toggleMore(): void {
    this.moreOpen.update((v) => !v);
  }
  closeMore(): void {
    this.moreOpen.set(false);
  }
}