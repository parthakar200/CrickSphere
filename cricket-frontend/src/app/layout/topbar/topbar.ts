import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { interval, startWith, switchMap } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { LiveTickerService } from '../../core/services/live-ticker.service';
import { uiFeature, toggleTheme } from '../../state/ui/ui.state';
import { Team } from '../../core/models';

@Component({
  selector: 'app-topbar',
  imports: [RouterLink],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss',
})
export class Topbar {
  private store = inject(Store);
  private auth = inject(AuthService);
  private liveTicker = inject(LiveTickerService);
  private router = inject(Router);

  theme = toSignal(this.store.select(uiFeature.selectTheme), { initialValue: 'dark' as const });
  currentUser = this.auth.currentUser;

  userMenuOpen = signal(false);
  searchQuery = signal('');

  // Poll live matches every 20s — cheap enough for a ticker strip, and
  // avoids needing a socket connection just to know WHICH matches are live
  // (the match detail page uses sockets for the actual ball-by-ball feed).
  liveMatches = toSignal(
    interval(20000).pipe(
      startWith(0),
      switchMap(() => this.liveTicker.getLiveMatches())
    ),
    { initialValue: [] }
  );

  teamLabel(team: Team | string): string {
    return typeof team === 'string' ? team : team.shortName;
  }

  toggleTheme(): void {
    this.store.dispatch(toggleTheme());
  }

  toggleUserMenu(): void {
    this.userMenuOpen.update((open) => !open);
  }

  onSearchSubmit(): void {
    const query = this.searchQuery().trim();
    if (query.length >= 2) {
      this.router.navigate(['/search'], { queryParams: { q: query } });
    }
  }

  logout(): void {
    this.auth.logout();
  }
}
