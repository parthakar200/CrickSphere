import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { PlayerService } from '../../core/services/player.service';
import { Player } from '../../core/models';

@Component({
  selector: 'app-player-browse-list',
  imports: [RouterLink],
  templateUrl: './player-browse-list.html',
  styleUrl: './player-browse-list.scss',
})
export class PlayerBrowseList {
  private playerService = inject(PlayerService);

  searchTerm = signal('');
  roleFilter = signal<'' | Player['role']>('');

  private filters = computed(() => ({ search: this.searchTerm(), role: this.roleFilter() }));

  private result = toSignal(
    this.playerService.list({ limit: 100 }).pipe(
      catchError(() => of(null))
    ),
    { initialValue: null }
  );

  players = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const role = this.roleFilter();
    const all = this.result()?.data ?? [];

    return all.filter(p => {
      const matchesSearch = !term || p.name.toLowerCase().includes(term);
      const matchesRole = !role || p.role == role;
      return matchesSearch && matchesRole;
    })
  })
}