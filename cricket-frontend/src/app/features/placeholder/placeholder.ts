import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

interface SectionInfo {
  title: string;
  icon: string;
  description: string;
}

const SECTION_LABELS: Record<string, SectionInfo> = {
  matches: {
    title: 'Live Match Center',
    icon: 'sensors',
    description: 'Ball-by-ball scoring, run rates, partnerships, and commentary — built on the next pass.',
  },
  tournaments: {
    title: 'Tournaments',
    icon: 'emoji_events',
    description: 'Points tables, schedules, and knockout brackets — built on the next pass.',
  },
  teams: {
    title: 'Teams',
    icon: 'groups',
    description: 'Team rosters and profiles — built on the next pass.',
  },
  players: {
    title: 'Players',
    icon: 'sports_cricket',
    description: 'Player profiles with full career statistics — built on the next pass.',
  },
  statistics: {
    title: 'Statistics Center',
    icon: 'monitoring',
    description: 'Batting, bowling, and team analytics dashboards — built on the next pass.',
  },
  leaderboards: {
    title: 'Leaderboards',
    icon: 'leaderboard',
    description: 'Most runs, best strike rate, top wicket takers, and fielding leaders — built on the next pass.',
  },
  search: {
    title: 'Search results',
    icon: 'search',
    description: 'Global search across players, teams, tournaments, and matches — built on the next pass.',
  },
  profile: {
    title: 'Your profile',
    icon: 'person',
    description: 'Account settings and preferences — built on the next pass.',
  },
  admin: {
    title: 'Admin Panel',
    icon: 'admin_panel_settings',
    description: 'Create teams, players, matches, and tournaments — built on the next pass.',
  },
};

const DEFAULT_SECTION: SectionInfo = {
  title: 'Coming soon',
  icon: 'construction',
  description: 'This area is built in the next stage.',
};

/**
 * Generic "not built yet" page for every lazy-loaded section. Which section
 * it's rendering for comes from the PARENT route's `data.section` (set in
 * app.routes.ts, e.g. `{ path: 'matches', data: { section: 'matches' }, ... }`).
 * We read `route.parent.snapshot.data` explicitly rather than `route.data`
 * because this component is attached to a route loaded via a *separate*
 * `loadChildren` config (placeholder.routes.ts) — Angular does not reliably
 * inherit a parent's `data` down into a child route from a different lazy
 * route config unless `paramsInheritanceStrategy: 'always'` is set on the
 * router, which this app doesn't do. Walking up to `route.parent` ourselves
 * works correctly regardless of that setting.
 */
@Component({
  selector: 'app-placeholder',
  imports: [],
  templateUrl: './placeholder.html',
  styleUrl: './placeholder.scss',
})
export class Placeholder {
  private route = inject(ActivatedRoute);

  section = computed<SectionInfo>(() => {
    const parentData = this.route.parent?.snapshot.data ?? {};
    return SECTION_LABELS[parentData['section'] as string] ?? DEFAULT_SECTION;
  });
}
