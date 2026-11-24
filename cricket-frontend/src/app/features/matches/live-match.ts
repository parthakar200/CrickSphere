

import { Component, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { DatePipe, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, finalize, of, switchMap } from 'rxjs';
import { MatchService } from '../../core/services/match.service';
import { SocketService } from '../../core/services/socket.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { Team, TeamRosterPlayer, Innings  } from '../../core/models';
import { Ball, LiveScorecardData, RecordBallPayload } from '../../core/models/live-match.model';
import { TossForm } from './live-match/toss-form';
import { OpeningPlayersForm } from './live-match/opening-players-form';
import { NextBowlerForm } from './live-match/next-bowler-form';
import { BallControls } from './live-match/ball-controls';
import { ScorecardDisplay } from './live-match/scorecard-display';
import { NextBatterForm } from './live-match/next-batsman-form';
import { PlayingXIForm } from './live-match/playing-xi-form';

@Component({
  selector: 'app-live-match',
  imports: [RouterLink, DatePipe, TossForm, OpeningPlayersForm, NextBowlerForm, BallControls, ScorecardDisplay, NextBatterForm, PlayingXIForm],
  templateUrl: './live-match.html',
  styleUrl: './live-match.scss',
})
export class LiveMatch implements OnDestroy {
  private location = inject(Location);
  private router = inject(Router);
  private matchService = inject(MatchService);
  private socket = inject(SocketService);
  private auth = inject(AuthService);
  private notifications = inject(NotificationService);
  private route = inject(ActivatedRoute);

  private matchId = this.route.snapshot.paramMap.get('id')!;

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/matches/live']);
    }
  }

  canScore = this.auth.isScorer;

  private refreshTrigger = signal(0);
  private liveData = toSignal(
    toObservable(this.refreshTrigger).pipe(
      switchMap(() => this.matchService.getLiveScorecard(this.matchId)),
      catchError(() => of(null))
    ),
    { initialValue: null }
  );
  data = computed<LiveScorecardData | null>(() => this.liveData());

  match = computed(() => this.data()?.match ?? null);
  innings = computed(() => this.data()?.currentInnings ?? null);

  teamA = computed<Team | null>(() => {
    const t = this.match()?.teamA;
    return t && typeof t !== 'string' ? t : null;
  });
  teamB = computed<Team | null>(() => {
    const t = this.match()?.teamB;
    return t && typeof t !== 'string' ? t : null;
  });

  tossSubmitting = signal(false);
  openingSubmitting = signal(false);
  ballSubmitting = signal(false);
  startingNextInnings = signal(false);

  needsOpeningPlayers = computed(() => {
    const inn = this.innings();
    const hasBackendOpeners = !!inn?.currentStrikerBatsman && !!inn?.currentNonStrikerBatsman;
    return !!inn && !hasBackendOpeners && !this.manualOpeners();
  });


  /**
   * True until both sides' Playing XI have been set — blocks the toss the
   * same way the backend's setToss() now does (see matchController.js).
   * Only relevant pre-toss; once the match has moved past 'scheduled'/
   * 'toss', the backend guarantees both arrays are already non-empty, so
   * this can't flip back to true later.
   */
  needsPlayingXI = computed(() => {
    const m = this.match();
    if (!m) return false;
    if (m.status !== 'scheduled' && m.status !== 'toss') return false;
    return (m.teamAPlayingXI?.length ?? 0) === 0 || (m.teamBPlayingXI?.length ?? 0) === 0;
  });

  playingXISubmitting = signal(false);

  confirmPlayingXI(payload: { teamAPlayingXI: string[]; teamBPlayingXI: string[] }): void {
    this.playingXISubmitting.set(true);
    this.matchService
      .setPlayingXI(this.matchId, payload.teamAPlayingXI, payload.teamBPlayingXI)
      .pipe(finalize(() => this.playingXISubmitting.set(false)))
      .subscribe({
        next: () => {
          this.notifications.success('Playing XI set — ready for the toss');
          this.refresh();
        },
        error: () => undefined,
      });
  }

  private manualOpeners = signal<{ striker: string; nonStriker: string; bowler: string } | null>(null);

  currentOverNumber = computed(() => {
    const inn = this.innings();
    const match = this.match();
    if (!inn || !match) return 1;
    return Math.floor(inn.totalBalls / match.ballsPerOver) + 1;
  });

  previousOverBowlerId = computed(() => {
    const inn = this.innings();
    if (!inn) return null;
    const overs = inn.overs;
    if (!Array.isArray(overs) || overs.length === 0) return null;
    const lastOver = overs[overs.length - 1];
    if (typeof lastOver === 'string') return null;
    return typeof lastOver.bowler === 'string' ? lastOver.bowler : null;
  });

  private manualNextBowler = signal<{ bowlerId: string; forOverNumber: number } | null>(null);

  needsNextBowler = computed(() => {
    const inn = this.innings();
    const match = this.match();
    if (!inn || !match || inn.totalBalls === 0) return false;
    const overJustCompleted = inn.totalBalls % match.ballsPerOver === 0;
    if (!overJustCompleted) return false;

    const manual = this.manualNextBowler();
    if (manual && manual.forOverNumber === this.currentOverNumber()) return false;
    return true;
  });

  confirmNextBowler(bowlerId: string): void {
    this.manualNextBowler.set({ bowlerId, forOverNumber: this.currentOverNumber() });
  }

  /**
   * Most recently recorded ball. matchController.js#getLiveScorecard slices
   * `recentBalls` oldest-first, so the LAST element is the latest ball.
   */
  private lastBall = computed<Ball | null>(() => {
    const balls = this.data()?.recentBalls ?? [];
    return balls.length ? balls[balls.length - 1] : null;
  });

  /**
   * scoringService.js#recordBall unconditionally does
   * `innings.currentStrikerBatsman = striker` / `currentNonStrikerBatsman = nonStriker`
   * on EVERY ball, wicket or not — so right after a dismissal those fields
   * still point at the batsman who just got out; they never go null. The
   * only place a wicket is visible is on the ball itself
   * (isWicket + wicket.playerOut). So: check the last ball — if it was a
   * wicket, whichever current batsman id matches wicket.playerOut is the
   * end that's actually vacant.
   */
  private vacantBattingPosition = computed<'striker' | 'nonStriker' | null>(() => {
    const inn = this.innings();
    const ball = this.lastBall();
    if (!inn || this.needsOpeningPlayers() || !ball?.isWicket) return null;

    const playerOut = ball.wicket.playerOut;
    if (!playerOut) return null;

    const strikerId =
      inn.currentStrikerBatsman && typeof inn.currentStrikerBatsman !== 'string'
        ? inn.currentStrikerBatsman._id
        : (inn.currentStrikerBatsman as string | null);
    const nonStrikerId =
      inn.currentNonStrikerBatsman && typeof inn.currentNonStrikerBatsman !== 'string'
        ? inn.currentNonStrikerBatsman._id
        : (inn.currentNonStrikerBatsman as string | null);

    if (playerOut === strikerId) return 'striker';
    if (playerOut === nonStrikerId) return 'nonStriker';
    return null;
  });

  /**
   * Unlike manualNextBowler, this doesn't need a "for which dismissal" tag:
   * once recordBall() actually succeeds and we refetch, the last ball is no
   * longer a wicket ball, so vacantBattingPosition goes back to null on its
   * own and this gate closes naturally.
   */
  private manualNextBatsman = signal<string | null>(null);

  needsNextBatsman = computed(() => !!this.vacantBattingPosition() && !this.manualNextBatsman());

  /**
   * Players the incoming-batsman picker must exclude: everyone already
   * given out this innings, plus whichever batsman is still not-out at the
   * other end (already batting there, can't also be the replacement).
   */
  excludedBatsmanIds = computed<string[]>(() => {
    const inn = this.innings();
    if (!inn) return [];
    const ids = new Set<string>();
    for (const fow of inn.fallOfWickets) {
      if (fow.playerOut) ids.add(fow.playerOut);
    }
    const vacant = this.vacantBattingPosition();
    if (vacant === 'striker' && inn.currentNonStrikerBatsman) {
      ids.add(
        typeof inn.currentNonStrikerBatsman === 'string' ? inn.currentNonStrikerBatsman : inn.currentNonStrikerBatsman._id
      );
    }
    if (vacant === 'nonStriker' && inn.currentStrikerBatsman) {
      ids.add(typeof inn.currentStrikerBatsman === 'string' ? inn.currentStrikerBatsman : inn.currentStrikerBatsman._id);
    }
    return [...ids];
  });

  confirmNextBatsman(batsmanId: string): void {
    this.manualNextBatsman.set(batsmanId);
  }

  currentStriker = computed(() => {
    const vacant = this.vacantBattingPosition();
    if (vacant === 'striker') {
      // Vacant end — either show the just-picked replacement, or nothing
      // (NOT the backend's stale currentStrikerBatsman, which still holds
      // the dismissed player until a replacement ball is recorded).
      return this.manualNextBatsman() ? this.resolvePlayerName(this.manualNextBatsman()!) : null;
    }
    const inn = this.innings();
    if (inn?.currentStrikerBatsman && typeof inn.currentStrikerBatsman !== 'string') {
      return { _id: inn.currentStrikerBatsman._id, name: inn.currentStrikerBatsman.name };
    }
    const manual = this.manualOpeners();
    return manual ? this.resolvePlayerName(manual.striker) : null;
  });
  currentNonStriker = computed(() => {
    const vacant = this.vacantBattingPosition();
    if (vacant === 'nonStriker') {
      return this.manualNextBatsman() ? this.resolvePlayerName(this.manualNextBatsman()!) : null;
    }
    const inn = this.innings();
    if (inn?.currentNonStrikerBatsman && typeof inn.currentNonStrikerBatsman !== 'string') {
      return { _id: inn.currentNonStrikerBatsman._id, name: inn.currentNonStrikerBatsman.name };
    }
    const manual = this.manualOpeners();
    return manual ? this.resolvePlayerName(manual.nonStriker) : null;
  });
  currentBowler = computed(() => {
    const manualNext = this.manualNextBowler();
    if (manualNext && manualNext.forOverNumber === this.currentOverNumber()) {
      return this.resolvePlayerName(manualNext.bowlerId);
    }

    const inn = this.innings();
    if (inn?.currentBowler && typeof inn.currentBowler !== 'string') {
      return { _id: inn.currentBowler._id, name: inn.currentBowler.name };
    }
    const manual = this.manualOpeners();
    return manual ? this.resolvePlayerName(manual.bowler) : null;
  });

  // battingTeamRoster = computed<TeamRosterPlayer[]>(() => {
  //   const inn = this.innings();
  //   const match = this.match();
  //   if (!inn || !match) return [];
  //   const battingTeamId = typeof inn.battingTeam === 'string' ? inn.battingTeam : (inn.battingTeam as Team)._id;
  //   return this.rosterForTeam(battingTeamId);
  // });
  // bowlingTeamRoster = computed<TeamRosterPlayer[]>(() => {
  //   const inn = this.innings();
  //   if (!inn) return [];
  //   const bowlingTeamId = typeof inn.bowlingTeam === 'string' ? inn.bowlingTeam : (inn.bowlingTeam as Team)._id;
  //   return this.rosterForTeam(bowlingTeamId);
  // });



  battingTeamRoster = computed<TeamRosterPlayer[]>(() => {
    const inn = this.innings();
    if (!inn) return [];
    const battingTeamId = typeof inn.battingTeam === 'string' ? inn.battingTeam : (inn.battingTeam as Team)._id;
    return this.playingXIForTeam(battingTeamId);
  });
  bowlingTeamRoster = computed<TeamRosterPlayer[]>(() => {
    const inn = this.innings();
    if (!inn) return [];
    const bowlingTeamId = typeof inn.bowlingTeam === 'string' ? inn.bowlingTeam : (inn.bowlingTeam as Team)._id;
    return this.playingXIForTeam(bowlingTeamId);
  });

  private playingXIForTeam(teamId: string): TeamRosterPlayer[] {
    const m = this.match();
    if (!m) return [];
    const teamAId = typeof m.teamA === 'string' ? m.teamA : m.teamA._id;
    return this.xiPlayers(teamId === teamAId ? m.teamAPlayingXI : m.teamBPlayingXI);
  }




  // private rosterCache = new Map<string, TeamRosterPlayer[]>();
  // private rosterSignal = signal<Record<string, TeamRosterPlayer[]>>({});

  // playerNameMap = computed<Record<string, string>>(() => {
  //   const map: Record<string, string> = {};
  //   for (const roster of Object.values(this.rosterSignal())) {
  //     for (const p of roster) map[p._id] = p.name;
  //   }
  //   return map;
  // });




  /**
   * Player names sourced directly from the match's Playing XI (populated
   * by getLiveScorecard) — no separate per-team roster fetch needed
   * anymore. A player's name is available here the instant the match doc
   * loads, since Playing XI is fixed before the toss even happens.
   */
  playerNameMap = computed<Record<string, string>>(() => {
    const m = this.match();
    const map: Record<string, string> = {};
    if (!m) return map;
    for (const p of [...this.xiPlayers(m.teamAPlayingXI), ...this.xiPlayers(m.teamBPlayingXI)]) {
      map[p._id] = p.name;
    }
    return map;
  });

  private xiPlayers(xi: TeamRosterPlayer[] | string[]): TeamRosterPlayer[] {
    return (xi ?? []).filter((p): p is TeamRosterPlayer => typeof p !== 'string');
  }





  /** Test matches can run to 4 innings (with declarations); everything else is a straight 2-innings chase. */
  private totalInningsForFormat = computed(() => (this.match()?.matchType === 'Test' ? 4 : 2));

  /**
   * True once the current innings has finished (all out / overs used / target
   * reached — see scoringService.js) AND it was the last innings this format
   * allows. Distinct from `innings()?.isCompleted`: that flips true after
   * EVERY innings, including ones that should be followed by another innings
   * (e.g. after innings 1 of a normal chase) — this only fires once there's
   * genuinely nothing left to play.
   */
  isMatchOver = computed(() => {
    const inn = this.innings();
    const m = this.match();
    if (!inn || !m || !inn.isCompleted) return false;
    return (m.innings?.length ?? 0) >= this.totalInningsForFormat();
  });

  /**
   * Client-side "who won" purely for display + to prefill completeMatch().
   * The backend doesn't compute this itself — matchController.js#completeMatch
   * just stores whatever result it's given. Only covers the standard
   * chase-the-target 2-innings case; isMatchOver() never fires for Test
   * matches, so declarations/draws never hit this.
   */
  matchResult = computed<{ winnerTeamId: string | null; winMargin: string; isTie: boolean } | null>(() => {
    if (!this.isMatchOver()) return null;
    const m = this.match();
    if (!m) return null;
    const allInnings = m.innings as Innings[];
    const first = allInnings[0];
    const second = allInnings[1];
    if (!first || !second) return null;

    const firstTeamId = typeof first.battingTeam === 'string' ? first.battingTeam : first.battingTeam._id;
    const secondTeamId = typeof second.battingTeam === 'string' ? second.battingTeam : second.battingTeam._id;

    if (second.totalRuns === first.totalRuns) {
      return { winnerTeamId: null, winMargin: 'Match tied', isTie: true };
    }
    if (second.totalRuns > first.totalRuns) {
      const wicketsInHand = 10 - second.totalWickets;
      return {
        winnerTeamId: secondTeamId,
        winMargin: `Won by ${wicketsInHand} wicket${wicketsInHand === 1 ? '' : 's'}`,
        isTie: false,
      };
    }
    const runMargin = first.totalRuns - second.totalRuns;
    return {
      winnerTeamId: firstTeamId,
      winMargin: `Won by ${runMargin} run${runMargin === 1 ? '' : 's'}`,
      isTie: false,
    };
  });

  finishingMatch = signal(false);

  finishMatch(): void {
    const result = this.matchResult();
    if (!result) return;
    this.finishingMatch.set(true);
    this.matchService
      .completeMatch(this.matchId, {
        winner: result.winnerTeamId ?? undefined,
        winMargin: result.winMargin,
        isTie: result.isTie,
      })
      .pipe(finalize(() => this.finishingMatch.set(false)))
      .subscribe({
        next: () => {
          this.notifications.success(result.isTie ? "It's a tie!" : result.winMargin);
          this.refresh();
        },
        error: () => undefined,
      });
  }


  reopeningMatch = signal(false);

  reopenMatch(): void {
    if (!confirm('Reopen this match for correction? The result will be cleared until you finish it again.')) return;
    this.reopeningMatch.set(true);
    this.matchService
      .reopenMatch(this.matchId)
      .pipe(finalize(() => this.reopeningMatch.set(false)))
      .subscribe({
        next: () => {
          this.notifications.success('Match reopened — you can now undo and correct the last ball(s)');
          this.refresh();
        },
        error: () => undefined,
      });
  }  

  teamNameById(id: string | { _id: string; name: string } | null | undefined): string {
    if (!id) return '';
    if (typeof id !== 'string') return id.name; // already populated
    if (this.teamA()?._id === id) return this.teamA()!.name;
    if (this.teamB()?._id === id) return this.teamB()!.name;
    return '';
  }

   resultText = computed<string | null>(() => {
    const m = this.match();
    if (!m) return null;

    if (m.status === 'completed') {
      if (m.result.isTie) return 'Match tied!';
      const name = this.teamNameById(m.result.winner);
      return name ? `${name} ${m.result.winMargin}` : m.result.winMargin;
    }

    if (this.isMatchOver()) {
      const preview = this.matchResult();
      if (!preview) return null;
      if (preview.isTie) return 'Match tied!';
      const name = this.teamNameById(preview.winnerTeamId);
      return `${name} ${preview.winMargin}`;
    }

    return null;
  });

  constructor() {
    this.socket.joinMatch(this.matchId);

    this.socket.on<{ matchId: string }>('ball:scored').subscribe(() => this.refresh());
    this.socket.on<{ matchId: string }>('innings:completed').subscribe(() => this.refresh());
    this.socket.on<{ matchId: string }>('ball:undone').subscribe(() => this.refresh());

    // effect(() => {
    //   const m = this.match();
    //   if (!m) return;
    //   const teamAId = typeof m.teamA === 'string' ? m.teamA : m.teamA._id;
    //   const teamBId = typeof m.teamB === 'string' ? m.teamB : m.teamB._id;
    //   this.loadRoster(teamAId);
    //   this.loadRoster(teamBId);
    // });
  }

  ngOnDestroy(): void {
    this.socket.leaveMatch(this.matchId);
  }

  // private loadRoster(teamId: string): void {
  //   if (this.rosterCache.has(teamId)) return;
  //   this.teamService.getById(teamId).subscribe({
  //     next: (res) => {
  //       const roster = res.data.players.filter(
  //         (p): p is TeamRosterPlayer => typeof p !== 'string'
  //       );
  //       this.rosterCache.set(teamId, roster);
  //       this.rosterSignal.update((map) => ({ ...map, [teamId]: roster }));
  //     },
  //     error: () => undefined,
  //   });
  // }

  // private rosterForTeam(teamId: string): TeamRosterPlayer[] {
  //   return this.rosterSignal()[teamId] ?? [];
  // }








  private resolvePlayerName(id: string): { _id: string; name: string } {
    return { _id: id, name: this.playerNameMap()[id] ?? '...' };
  }

  private refresh(): void {
    this.refreshTrigger.update((n) => n + 1);
  }

  submitToss(payload: { winner: string; decision: 'bat' | 'bowl' }): void {
    this.tossSubmitting.set(true);
    this.matchService
      .setToss(this.matchId, payload.winner, payload.decision)
      .pipe(finalize(() => this.tossSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.notifications.success('Toss recorded — match is live');
          this.refresh();
        },
        error: () => undefined,
      });
  }

  confirmOpeners(payload: { striker: string; nonStriker: string; bowler: string }): void {
    this.manualOpeners.set(payload);
  }

  recordBall(payload: RecordBallPayload): void {
    const inningsId = this.innings()?._id;
    if (!inningsId) return;

    this.ballSubmitting.set(true);
    this.socket
      .emitWithAck<{ matchId: string; inningsId: string; payload: RecordBallPayload }, { success: boolean; message?: string }>(
        'ball:record',
        { matchId: this.matchId, inningsId, payload }
      )
      .then((ack) => {
        this.ballSubmitting.set(false);
        if (!ack.success) {
          this.notifications.error(ack.message || 'Failed to record ball');
        } else {
          this.manualOpeners.set(null);
          this.manualNextBatsman.set(null); // innings doc now has the real batsman ref
          this.refresh();
        }
      });
  }

  undoSubmitting = signal(false);

  undoLastBall(): void {
    const inningsId = this.innings()?._id;
    if (!inningsId) return;
    if (!confirm('Undo the last ball? This cannot be reversed.')) return;

    this.undoSubmitting.set(true);
    this.socket
      .emitWithAck<{ matchId: string; inningsId: string }, { success: boolean; message?: string }>('ball:undo', {
        matchId: this.matchId,
        inningsId,
      })
      .then((ack) => {
        this.undoSubmitting.set(false);
        if (!ack.success) {
          this.notifications.error(ack.message || 'Failed to undo the last ball');
        } else {
          this.notifications.success('Last ball undone');
          this.manualOpeners.set(null);
          this.manualNextBowler.set(null);
          this.manualNextBatsman.set(null);
          this.refresh();
        }
      });
  }

  startNextInnings(): void {
    this.startingNextInnings.set(true);
    this.matchService
      .startNextInnings(this.matchId)
      .pipe(finalize(() => this.startingNextInnings.set(false)))
      .subscribe({
        next: () => {
          this.notifications.success('Next innings started');
          this.manualOpeners.set(null);
          this.manualNextBatsman.set(null);
          this.refresh();
        },
        error: () => undefined,
      });
  }





  private readonly confettiColors = ['#f43f5e', '#a855f7', '#3b82f6', '#22c55e', '#f59e0b'];

  /**
   * Computed with no signal reads inside — Angular computes it once on
   * first access and never invalidates it (nothing it read can change), so
   * the randomized values stay stable across re-renders instead of
   * reshuffling every time resultText() flips.
   */
  confettiPieces = computed(() =>
    Array.from({ length: 60 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.6,
      duration: 2.5 + Math.random() * 1.5,
      color: this.confettiColors[i % this.confettiColors.length],
      rotate: Math.floor(Math.random() * 360),
    }))
  );
}