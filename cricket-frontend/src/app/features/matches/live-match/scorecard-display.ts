import { Component, computed, input } from '@angular/core';
import { Innings, Match } from '../../../core/models';
import { Ball, BattingStatRow  } from '../../../core/models/live-match.model';

@Component({
  selector: 'app-scorecard-display',
  imports: [],
  templateUrl: './scorecard-display.html',
  styleUrl: './scorecard-display.scss',
})
export class ScorecardDisplay {
  match = input.required<Match>();
  innings = input.required<Innings | null>();
  runRate = input<number>(0);
  requiredRunRate = input<number | null>(null);
  recentBalls = input<Ball[]>([]);
  /** Maps a player ObjectId to a display name — recentBalls only carry raw IDs (see live-match.model.ts). */
  playerNameById = input<Record<string, string>>({});


  striker = input<{ _id: string; name: string } | null>(null);
  nonStriker = input<{ _id: string; name: string } | null>(null);
  bowler = input<{ _id: string; name: string } | null>(null);
  battingStats = input<BattingStatRow[]>([]);

  resultText = input<string | null>(null);

  oversDisplay = computed(() => {
    const inn = this.innings();
    if (!inn) return '0.0';
    return inn.totalOvers.toFixed(1);
  });

  activePartnership = computed(() => this.innings()?.partnerships.find((p) => p.isActive) ?? null);

  /**
   * The most recent/current over number, derived from totalBalls (legal
   * balls only) the same way the backend derives it in scoringService.js —
   * NOT from recentBalls.length, since that list can span multiple overs
   * (it's the last 12 deliveries across the WHOLE innings, not "this over"
   * — see the doc comment on `recentBalls` input above and on the backend's
   * getLiveScorecard). Falls back to over 1 before any ball has been bowled.
   */
  private currentOverNumber = computed(() => {
    const inn = this.innings();
    const match = this.match();
    if (!inn || !match) return 1;
    return Math.floor(inn.totalBalls / match.ballsPerOver) + 1;
  });

  /** Genuinely scoped to the CURRENT over only — what "This Over" actually means. */
  currentOverBalls = computed(() => this.recentBalls().filter((b) => b.overNumber === this.currentOverNumber()));

  statsFor(playerId: string | undefined | null): BattingStatRow | null {
    if (!playerId) return null;
    return this.battingStats().find((s) => s.player === playerId) ?? null;
  }

  nameFor(id: string): string {
    return this.playerNameById()[id] ?? '...';
  }


  target = computed(() => this.innings()?.target ?? null);

  runsNeeded = computed(() => {
    const inn = this.innings();
    const t = this.target();
    if (!inn || t == null) return null;
    return Math.max(t - inn.totalRuns, 0);
  });

  ballsRemaining = computed(() => {
    const inn = this.innings();
    const m = this.match();
    if (!inn || !m) return null;
    return Math.max(m.overs * m.ballsPerOver - inn.totalBalls, 0);
  });

  requiredRunPerBall = computed(() => {
    const needed = this.runsNeeded();
    const balls = this.ballsRemaining();
    if (needed == null || balls == null || balls <= 0) return null;
    return Number((needed / balls).toFixed(2));
  });



  ballDisplay(ball: Ball): string {
    if (ball.isWicket) return 'W';
    if (ball.extra.type === 'wide') return `${ball.extra.runs}wd`;
    if (ball.extra.type === 'no-ball') return ball.runsScored > 0 ? `${ball.runsScored}nb` : 'nb';
    if (ball.extra.type === 'bye') return `${ball.extra.runs}b`;
    if (ball.extra.type === 'leg-bye') return `${ball.extra.runs}lb`;
    return String(ball.runsScored);
  }

  ballClass(ball: Ball): string {
    if (ball.isWicket) return 'ball-chip--wicket';
    if (ball.isSix) return 'ball-chip--six';
    if (ball.isFour) return 'ball-chip--four';
    if (ball.isDotBall) return 'ball-chip--dot';
    return '';
  }
}
