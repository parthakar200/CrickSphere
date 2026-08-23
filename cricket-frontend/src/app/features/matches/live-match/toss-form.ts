import { Component, input, output } from '@angular/core';
import { Team } from '../../../core/models';

@Component({
  selector: 'app-toss-form',
  imports: [],
  templateUrl: './toss-form.html',
  styleUrl: './toss-form.scss',
})
export class TossForm {
  teamA = input.required<Team>();
  teamB = input.required<Team>();
  submitting = input(false);

  tossSubmit = output<{ winner: string; decision: 'bat' | 'bowl' }>();

  selectedWinner = '';
  selectedDecision: 'bat' | 'bowl' = 'bat';

  submit(): void {
    if (!this.selectedWinner) return;
    this.tossSubmit.emit({ winner: this.selectedWinner, decision: this.selectedDecision });
  }
}
