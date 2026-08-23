import { Component, computed, input, output, signal } from '@angular/core';
import { TeamRosterPlayer } from '../../../core/models';

@Component({
  selector: 'app-next-batsman-form',
  imports: [],
  templateUrl: './next-batsman-form.html',
  styleUrl: './next-batsman-form.scss',
})
export class NextBatterForm {
  battingRoster = input.required<TeamRosterPlayer[]>();
  /** Players who can't be picked: already out this innings, or already batting at the other end. */
  excludedPlayerIds = input<string[]>([]);

  confirmed = output<string>();

  selectedBatsman = signal('');

  eligibleRoster = computed(() =>
    this.battingRoster().filter((p) => !this.excludedPlayerIds().includes(p._id))
  );

  confirm(): void {
    // The datalist input holds the typed NAME, not an id — resolve it
    // against the eligible roster so we emit an _id like every other
    // consumer of `confirmed` expects.
    const match = this.eligibleRoster().find((p) => p.name === this.selectedBatsman());
    if (!match) return;
    this.confirmed.emit(match._id);
  }
}