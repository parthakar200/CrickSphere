import { Component, computed, input, output, signal } from '@angular/core';
import { DismissalType, ExtraType, RecordBallPayload } from '../../../core/models/live-match.model';
import { TeamRosterPlayer } from '../../../core/models';

const DISMISSAL_TYPES: DismissalType[] = [
  'bowled',
  'caught',
  'lbw',
  'run-out',
  'stumped',
  'hit-wicket',
  'retired-out',
  'obstructing-field',
  'timed-out',
  'handled-ball',
];

// Dismissals never credited to the bowler.
const NON_BOWLER_DISMISSALS: DismissalType[] = [
  'run-out',
  'retired-out',
  'obstructing-field',
  'timed-out',
  'handled-ball',
];
// Dismissals where recording a fielder is relevant.
const FIELDER_DISMISSALS: DismissalType[] = ['caught', 'run-out', 'stumped'];

/**
 * Run/extra semantics (matches services/scoringService.js + statsEngine.js
 * on the backend exactly — see the comment trail there):
 *
 *  - extraType 'none':            runsScored = bat runs (0-6), extraRuns = 0
 *  - extraType 'bye'/'leg-bye':   runsScored = 0, extraRuns = byes run (batsman never credited)
 *  - extraType 'wide':            runsScored = 0, extraRuns = wide runs (batsman never credited)
 *  - extraType 'no-ball':         runsScored = bat runs (0-6, CAN be a four/six),
 *                                  extraRuns = the no-ball penalty (defaults to 1, the
 *                                  near-universal case, but is editable for an
 *                                  unusual multi-run penalty rule)
 *
 * No-ball is the one case needing TWO separate numbers, since the backend's
 * runsConceded calc (`runsScored + extra.runs` for wide/no-ball) only works
 * out correctly if the actual bat-runs and the penalty are kept distinct.
 */
@Component({
  selector: 'app-ball-controls',
  imports: [],
  templateUrl: './ball-controls.html',
  styleUrl: './ball-controls.scss',
})
export class BallControls {
  striker = input.required<{ _id: string; name: string }>();
  nonStriker = input.required<{ _id: string; name: string }>();
  bowler = input.required<{ _id: string; name: string }>();
  battingRoster = input.required<TeamRosterPlayer[]>();
  bowlingRoster = input.required<TeamRosterPlayer[]>();
  submitting = input(false);

  ballSubmit = output<RecordBallPayload>();

  selectedExtra = signal<ExtraType>('none');
  batRuns = signal<number | null>(null); // used for 'none' and 'no-ball'
  extraRunsValue = signal(1); // used for 'bye' / 'leg-bye' / 'wide' (total) and 'no-ball' (penalty only)
  isWicket = signal(false);
  dismissalType = signal<DismissalType>('bowled');
  playerOutIsNonStriker = signal(false); // for run-out style dismissals at the non-striker's end
  fielderId = signal<string>('');

  dismissalTypes = DISMISSAL_TYPES;
  extraOptions: ExtraType[] = ['wide', 'no-ball', 'bye', 'leg-bye'];
  needsFielder = computed(() => FIELDER_DISMISSALS.includes(this.dismissalType()));
  isRunOutStyle = computed(() => this.dismissalType() === 'run-out');
  isNoBall = computed(() => this.selectedExtra() === 'no-ball');
  needsByeStyleRuns = computed(() => ['bye', 'leg-bye', 'wide'].includes(this.selectedExtra()));

  canSubmit = computed(() => {
    if (this.isWicket() && this.needsFielder() && !this.fielderId()) return false;
    const hasRunsEntered =
      this.selectedExtra() === 'none'
        ? this.batRuns() !== null
        : this.isNoBall()
        ? this.batRuns() !== null
        : true; // bye/leg-bye/wide always have a default extraRunsValue
    return hasRunsEntered || this.isWicket();
  });

  setExtra(extra: ExtraType): void {
    this.selectedExtra.set(extra === this.selectedExtra() ? 'none' : extra);
    if (extra === 'no-ball') this.extraRunsValue.set(1); // reset penalty to the common default
  }

  setBatRuns(runs: number): void {
    this.batRuns.set(runs);
  }

  toggleWicket(): void {
    this.isWicket.update((v) => !v);
    if (!this.isWicket()) {
      this.playerOutIsNonStriker.set(false);
      this.fielderId.set('');
    }
  }

  submit(): void {
    if (!this.canSubmit()) return;

    const extraType = this.selectedExtra();
    const runsScored = extraType === 'none' || extraType === 'no-ball' ? this.batRuns() ?? 0 : 0;
    const extraRuns = this.needsByeStyleRuns() || this.isNoBall() ? this.extraRunsValue() : 0;

    const payload: RecordBallPayload = {
      striker: this.striker()._id,
      nonStriker: this.nonStriker()._id,
      bowler: this.bowler()._id,
      runsScored,
      extraType,
      extraRuns,
      isWicket: this.isWicket(),
    };

    if (this.isWicket()) {
      payload.wicket = {
        dismissalType: this.dismissalType(),
        playerOut: this.isRunOutStyle() && this.playerOutIsNonStriker() ? this.nonStriker()._id : this.striker()._id,
        fielder: this.needsFielder() ? this.fielderId() || undefined : undefined,
        bowlerCredited: !NON_BOWLER_DISMISSALS.includes(this.dismissalType()),
      };
    }

    this.ballSubmit.emit(payload);
    this.resetForNextBall();
  }

  private resetForNextBall(): void {
    this.selectedExtra.set('none');
    this.batRuns.set(null);
    this.extraRunsValue.set(1);
    this.isWicket.set(false);
    this.dismissalType.set('bowled');
    this.playerOutIsNonStriker.set(false);
    this.fielderId.set('');
  }
}
