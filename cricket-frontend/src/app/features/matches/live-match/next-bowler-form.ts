import { Component, computed, input, output, signal } from '@angular/core';
import { TeamRosterPlayer } from '../../../core/models';

@Component({
  selector: 'app-next-bowler-form',
  imports: [],
  templateUrl: './next-bowler-form.html',
  styleUrl: './next-bowler-form.scss',
})
export class NextBowlerForm {
  bowlingRoster = input.required<TeamRosterPlayer[]>();
  /** The bowler who bowled the over that just finished — cricket doesn't allow them to bowl consecutive overs. */
  previousOverBowlerId = input<string | null>(null);
  overNumber = input.required<number>();

  confirmed = output<string>();

  selectedBowler = signal('');

  eligibleRoster = computed(() =>
    this.bowlingRoster().filter((p) => p._id !== this.previousOverBowlerId())
  );

  confirm(): void {
    // The datalist input holds the typed NAME, not an id — resolve it
    // against the eligible roster before emitting, same fix as
    // next-batsman-form.ts.
    const match = this.eligibleRoster().find((p) => p.name === this.selectedBowler());
    if (!match) return;
    this.confirmed.emit(match._id);
  }
}
