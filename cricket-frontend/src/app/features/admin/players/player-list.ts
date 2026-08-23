
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PlayerService } from '../../../core/services/player.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Player } from '../../../core/models';
import { refetchableList } from '../../../core/utils/refetchable-list';

@Component({
  selector: 'app-player-list',
  imports: [RouterLink],
  templateUrl: './player-list.html',
  styleUrl: '../admin-shared.scss',
})
export class PlayerList {
  private playerService = inject(PlayerService);
  private notifications = inject(NotificationService);

  private playersResult = refetchableList(() => this.playerService.list({ limit: 100 }), null);

  players = () => this.playersResult.data()?.data ?? [];

  roleBadgeClass(role: Player['role']): string {
    switch (role) {
      case 'batsman':
        return 'admin-table__badge--emerald';
      case 'bowler':
        return 'admin-table__badge--crimson';
      case 'wicket-keeper':
        return 'admin-table__badge--purple';
      default:
        return 'admin-table__badge--amber';
    }
  }

  deletePlayer(player: Player): void {
    if (!confirm(`Delete "${player.name}"? This cannot be undone.`)) return;

    this.playerService.delete(player._id).subscribe({
      next: () => {
        this.notifications.success(`${player.name} deleted`);
        this.playersResult.refresh();
      },
      error: () => undefined,
    });
  }
}