import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatchService } from '../../../core/services/match.service';
import { TeamRosterPlayer } from '../../../core/models';

@Component({
  selector: 'app-playing-xi-form',
  imports: [FormsModule],
  templateUrl: './playing-xi-form.html',
  styleUrl: './playing-xi-form.scss',
})
export class PlayingXIForm implements OnInit {
  private matchService = inject(MatchService);

  matchId = input.required<string>();
  teamAName = input<string>('Team A');
  teamBName = input<string>('Team B');
  submitting = input<boolean>(false);

  confirmed = output<{ teamAPlayingXI: string[]; teamBPlayingXI: string[] }>();

  loading = signal(true);
  loadError = signal(false);
  eligibleA = signal<TeamRosterPlayer[]>([]);
  eligibleB = signal<TeamRosterPlayer[]>([]);

  searchA = signal('');
  searchB = signal('');

  filteredA = computed(() => {
    const term = this.searchA().toLowerCase().trim();
    const all = this.eligibleA();
    if (!term) return all;
    return all.filter((p) => p.name.toLowerCase().includes(term));
  });
  filteredB = computed(() => {
    const term = this.searchB().toLowerCase().trim();
    const all = this.eligibleB();
    if (!term) return all;
    return all.filter((p) => p.name.toLowerCase().includes(term));
  });

  private selectedA = signal<Set<string>>(new Set());
  private selectedB = signal<Set<string>>(new Set());

  selectedACount = computed(() => this.selectedA().size);
  selectedBCount = computed(() => this.selectedB().size);
  canConfirm = computed(() => this.selectedACount() > 0 && this.selectedBCount() > 0);

  ngOnInit(): void {
    this.matchService.getEligiblePlayers(this.matchId()).subscribe({
      next: (res) => {
        this.eligibleA.set(res.data.teamA);
        this.eligibleB.set(res.data.teamB);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.loading.set(false);
      },
    });
  }

  isPickedA(playerId: string): boolean {
    return this.selectedA().has(playerId);
  }
  isPickedB(playerId: string): boolean {
    return this.selectedB().has(playerId);
  }
  isPickedElsewhereOfA(playerId: string): boolean {
    return this.selectedB().has(playerId);
  }
  isPickedElsewhereOfB(playerId: string): boolean {
    return this.selectedA().has(playerId);
  }

  toggleA(playerId: string): void {
    if (this.isPickedElsewhereOfA(playerId)) return;
    this.selectedA.update((set) => {
      const next = new Set(set);
      next.has(playerId) ? next.delete(playerId) : next.add(playerId);
      return next;
    });
  }
  toggleB(playerId: string): void {
    if (this.isPickedElsewhereOfB(playerId)) return;
    this.selectedB.update((set) => {
      const next = new Set(set);
      next.has(playerId) ? next.delete(playerId) : next.add(playerId);
      return next;
    });
  }

  // "Select all" acts on whatever's currently visible (post-search) and
  // skips players already locked in on the other side, so it never fights
  // with isPickedElsewhereOf*.
  allVisibleSelectedA = computed(() => {
    const pickable = this.filteredA().filter((p) => !this.isPickedElsewhereOfA(p._id));
    return pickable.length > 0 && pickable.every((p) => this.isPickedA(p._id));
  });
  allVisibleSelectedB = computed(() => {
    const pickable = this.filteredB().filter((p) => !this.isPickedElsewhereOfB(p._id));
    return pickable.length > 0 && pickable.every((p) => this.isPickedB(p._id));
  });

  toggleSelectAllA(): void {
    const pickable = this.filteredA().filter((p) => !this.isPickedElsewhereOfA(p._id));
    const shouldSelectAll = !this.allVisibleSelectedA();
    this.selectedA.update((set) => {
      const next = new Set(set);
      for (const p of pickable) {
        shouldSelectAll ? next.add(p._id) : next.delete(p._id);
      }
      return next;
    });
  }
  toggleSelectAllB(): void {
    const pickable = this.filteredB().filter((p) => !this.isPickedElsewhereOfB(p._id));
    const shouldSelectAll = !this.allVisibleSelectedB();
    this.selectedB.update((set) => {
      const next = new Set(set);
      for (const p of pickable) {
        shouldSelectAll ? next.add(p._id) : next.delete(p._id);
      }
      return next;
    });
  }

  confirm(): void {
    if (!this.canConfirm()) return;
    this.confirmed.emit({
      teamAPlayingXI: [...this.selectedA()],
      teamBPlayingXI: [...this.selectedB()],
    });
  }
}