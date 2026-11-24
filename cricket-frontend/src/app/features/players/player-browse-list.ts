import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap, tap } from 'rxjs';
import { PlayerService } from '../../core/services/player.service';
import { LocalityService } from '../../core/services/locality.service';
import { Player } from '../../core/models';

@Component({
  selector: 'app-player-browse-list',
  imports: [RouterLink],
  templateUrl: './player-browse-list.html',
  styleUrl: './player-browse-list.scss',
})
export class PlayerBrowseList {
  private playerService = inject(PlayerService);
  private localityService = inject(LocalityService);

  searchTerm = signal('');
  roleFilter = signal<'' | Player['role']>('');
  isLoading = signal(true);

  private localityId$ = toObservable(this.localityService.selectedLocalityId);

  private result = toSignal(
    this.localityId$.pipe(
      tap(() => this.isLoading.set(true)),
      switchMap(() =>
        this.playerService.list({ limit: 100 }).pipe(
          tap(() => this.isLoading.set(false)),
          catchError(() => {
            this.isLoading.set(false);
            return of(null);
          })
        )
      )
    ),
    { initialValue: null }
  );

  players = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const role = this.roleFilter();
    const all = this.result()?.data ?? [];

    return all.filter((p) => {
      const matchesSearch = !term || p.name.toLowerCase().includes(term);
      const matchesRole = !role || p.role == role;
      return matchesSearch && matchesRole;
    });
  });
}