import { Component, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of } from 'rxjs';
import { SearchService, SearchResults } from '../../core/services/search.service';

@Component({
  selector: 'app-search',
  imports: [RouterLink],
  templateUrl: './search.html',
  styleUrl: './search.scss',
})
export class Search {
  private route = inject(ActivatedRoute);
  private searchService = inject(SearchService);

  query = signal('');
  loading = signal(false);
  error = signal<string | null>(null);
  results = signal<SearchResults | null>(null);

  // Read initial query from URL param
  private queryParam = toSignal(
    this.route.queryParamMap.pipe(map((p) => p.get('q') ?? '')),
    { initialValue: '' }
  );

  constructor() {
    // Sync query signal with URL param
    effect(() => {
      const q = this.queryParam();
      this.query.set(q);
      if (q.trim().length >= 2) {
        this.doSearch(q.trim());
      } else {
        this.results.set(null);
      }
    });
  }

  private doSearch(q: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.searchService.search(q).pipe(
      catchError((err) => {
        this.error.set('Search failed. Please try again.');
        return of(null);
      })
    ).subscribe((resp) => {
      this.loading.set(false);
      this.results.set(resp?.data ?? null);
    });
  }

  get totalCount(): number {
    const r = this.results();
    if (!r) return 0;
    return (r.players?.length ?? 0) + (r.teams?.length ?? 0) +
           (r.tournaments?.length ?? 0) + (r.matches?.length ?? 0);
  }

  teamName(team: { name: string; shortName: string } | string): string {
    return typeof team === 'string' ? team : team.name;
  }

  teamShort(team: { name: string; shortName: string } | string): string {
    return typeof team === 'string' ? team : team.shortName;
  }

  roleIcon(role: string): string {
    switch (role) {
      case 'batsman': return 'sports_cricket';
      case 'bowler': return 'sports_cricket';
      case 'all-rounder': return 'swap_horiz';
      case 'wicket-keeper': return 'back_hand';
      default: return 'person';
    }
  }

  statusClass(status: string): string {
    if (status === 'live') return 'badge--live';
    if (status === 'completed') return 'badge--done';
    return 'badge--upcoming';
  }
}
