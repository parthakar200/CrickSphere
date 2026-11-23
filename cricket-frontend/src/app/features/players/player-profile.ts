import { Component, inject } from '@angular/core';
import { DecimalPipe, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { PlayerService } from '../../core/services/player.service';

@Component({
  selector: 'app-player-profile',
  imports: [DecimalPipe],
  templateUrl: './player-profile.html',
  styleUrl: './player-profile.scss',
})
export class PlayerProfile {
  private location = inject(Location);
  private router = inject(Router);
  private playerService = inject(PlayerService);
  private route = inject(ActivatedRoute);

  private playerId = this.route.snapshot.paramMap.get('id')!;

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/players']);
    }
  }

  result = toSignal(this.playerService.getById(this.playerId).pipe(catchError(() => of(null))), {
    initialValue: null,
  });

  player = () => this.result()?.data?.player ?? null;
  careerStats = () => this.result()?.data?.careerStats ?? null;

  hasBowled = () => (this.careerStats()?.bowling.ballsBowled ?? 0) > 0;
  hasFielded = () => {
    const f = this.careerStats()?.fielding;
    return !!f && (f.catches > 0 || f.runOuts > 0 || f.stumpings > 0);
  };
}