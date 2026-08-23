import { Component, computed, input, output, signal } from '@angular/core';
import { TeamRosterPlayer } from '../../../core/models';

@Component({
  selector: 'app-opening-players-form',
  imports: [],
  templateUrl: './opening-players-form.html',
  styleUrl: './opening-players-form.scss',
})
export class OpeningPlayersForm {
  battingRoster = input.required<TeamRosterPlayer[]>();
  bowlingRoster = input.required<TeamRosterPlayer[]>();

  confirmed = output<{ striker: string; nonStriker: string; bowler: string }>();

  // The resolved player _id for each role — this is the real selection and
  // is what canConfirm/confirm/the rest of the app work with.
  striker = signal('');
  nonStriker = signal('');
  bowler = signal('');

  // What's actually typed/shown in each text input (the player's name).
  // Kept separate from the id signals above so a half-typed or unmatched
  // name never gets mistaken for a valid selection.
  strikerQuery = signal('');
  nonStrikerQuery = signal('');
  bowlerQuery = signal('');

  canConfirm = computed(() => {
    const s = this.striker();
    const ns = this.nonStriker();
    const b = this.bowler();
    return !!s && !!ns && !!b && s !== ns;
  });

  onStrikerInput(value: string): void {
    this.strikerQuery.set(value);
    const match = this.battingRoster().find((p) => p.name === value);
    this.striker.set(match ? match._id : '');
  }

  onNonStrikerInput(value: string): void {
    this.nonStrikerQuery.set(value);
    const match = this.battingRoster().find((p) => p.name === value);
    this.nonStriker.set(match ? match._id : '');
  }

  onBowlerInput(value: string): void {
    this.bowlerQuery.set(value);
    const match = this.bowlingRoster().find((p) => p.name === value);
    this.bowler.set(match ? match._id : '');
  }

  confirm(): void {
    if (!this.canConfirm()) return;
    this.confirmed.emit({ striker: this.striker(), nonStriker: this.nonStriker(), bowler: this.bowler() });
  }
}
