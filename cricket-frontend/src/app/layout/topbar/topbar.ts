import { Component, computed, inject, signal, DestroyRef, HostListener } from '@angular/core';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { Store } from '@ngrx/store';
import { toSignal, toObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval, startWith, switchMap, filter, map, Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { LocalityService } from '../../core/services/locality.service';
import { NotificationService } from '../../core/services/notification.service';
import { LiveTickerService } from '../../core/services/live-ticker.service';
import { uiFeature, toggleTheme } from '../../state/ui/ui.state';
import { Team, Locality, Match } from '../../core/models';

@Component({
  selector: 'app-topbar',
  imports: [RouterLink],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss',
})
export class Topbar {
  private store = inject(Store);
  readonly auth = inject(AuthService);
  readonly localityService = inject(LocalityService);
  private liveTicker = inject(LiveTickerService);
  private notifications = inject(NotificationService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  localityMenuOpen = signal(false);

  theme = toSignal(this.store.select(uiFeature.selectTheme), { initialValue: 'dark' as const });
  currentUser = this.auth.currentUser;

  userMenuOpen = signal(false);
  searchQuery = signal('');

  /** Subject powering the debounced live-search-as-you-type behaviour */
  private searchInput$ = new Subject<string>();

  constructor() {
    // Sync the text input with the URL ?q= param whenever the user navigates
    // to the search page (e.g. via a direct link or bookmarked URL).
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((e) => {
      if (e.urlAfterRedirects.startsWith('/search')) {
        const urlTree = this.router.parseUrl(e.urlAfterRedirects);
        const q: string = urlTree.queryParams['q'] ?? '';
        if (q !== this.searchQuery()) {
          this.searchQuery.set(q);
        }
      } else {
        // Clear the search box when navigating away from the search page
        this.searchQuery.set('');
      }
    });

    // Debounced navigation: fires 400 ms after the user stops typing so the
    // search page re-fetches without hammering the backend on every keystroke.
    this.searchInput$.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((query) => {
      if (query.trim().length >= 2) {
        this.router.navigate(['/search'], { queryParams: { q: query.trim() } });
      }
    });
  }

  private localityId$ = toObservable(this.localityService.selectedLocalityId);

  // Poll live matches every 20 s and re-trigger immediately on village change
  liveMatches = toSignal(
    this.localityId$.pipe(
      switchMap(() =>
        interval(20000).pipe(
          startWith(0),
          switchMap(() => this.liveTicker.getLiveMatches())
        )
      )
    ),
    { initialValue: [] as Match[] }
  );

  teamLabel(team: Team | string): string {
    return typeof team === 'string' ? team : team.shortName;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.topbar__locality')) {
      this.localityMenuOpen.set(false);
    }
    if (!target.closest('.topbar__user')) {
      this.userMenuOpen.set(false);
    }
  }

  toggleTheme(): void {
    this.store.dispatch(toggleTheme());
  }

  toggleUserMenu(event?: MouseEvent): void {
    event?.stopPropagation();
    this.localityMenuOpen.set(false);
    this.userMenuOpen.update((open) => !open);
  }

  toggleLocalityMenu(event?: MouseEvent): void {
    event?.stopPropagation();
    this.userMenuOpen.set(false);
    this.localityMenuOpen.update((open) => !open);
  }

  switchLocality(loc: Locality): void {
    this.localityService.setLocality(loc);
    this.localityMenuOpen.set(false);
    // If user is currently on an entity detail subpage (e.g. /matches/:id/live or /teams/:id),
    // navigate to the main list since the entity belongs to the previous village
    const currentUrl = this.router.url;
    if (
      currentUrl.includes('/matches/') ||
      currentUrl.includes('/teams/') ||
      currentUrl.includes('/players/') ||
      currentUrl.includes('/tournaments/')
    ) {
      const segments = currentUrl.split('/').filter(Boolean);
      if (segments.length > 1) {
        this.router.navigate(['/' + segments[0]]);
      }
    }
  }

  /** Called on every keystroke — updates the local signal and feeds the debouncer. */
  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.searchInput$.next(value);
  }

  /** Called on Enter — navigates immediately without waiting for the debounce. */
  onSearchSubmit(): void {
    const query = this.searchQuery().trim();
    if (query.length >= 2) {
      this.router.navigate(['/search'], { queryParams: { q: query } });
    }
  }

  logout(): void {
    this.userMenuOpen.set(false);
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }
}
