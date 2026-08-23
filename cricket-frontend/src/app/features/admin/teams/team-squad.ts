import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { TeamService } from '../../../core/services/team.service';
import { PlayerService } from '../../../core/services/player.service';
import { NotificationService } from '../../../core/services/notification.service';
import { refetchableList } from '../../../core/utils/refetchable-list';

@Component({
  selector: 'app-team-squad',
  imports: [RouterLink, FormsModule, CommonModule],
  templateUrl: './team-squad.html',
  styleUrl: '../admin-shared.scss',
})
export class TeamSquad {
  private teamService = inject(TeamService);
  private playerService = inject(PlayerService);
  private notifications = inject(NotificationService);
  private route = inject(ActivatedRoute);

  teamId = this.route.snapshot.paramMap.get('id')!;

  private teamResult = toSignal(this.teamService.getById(this.teamId).pipe(catchError(() => of(null))), {
    initialValue: null,
  });
  team = () => this.teamResult()?.data ?? null;

  private squadResult = refetchableList(() => this.teamService.getSquad(this.teamId), null);
  squad = () => this.squadResult.data()?.data ?? [];


  private squadPlayerIds = () => new Set(this.squad().map((s) => s.player._id));

  private takenResult = refetchableList(() => this.teamService.getTournamentTakenPlayers(this.teamId), null);
  private takenByOtherTeam = computed(() => {
    const map = new Map<string, string>();
    for (const entry of this.takenResult.data()?.data ?? []) {
      if (entry.teamId !== this.teamId) map.set(entry.playerId, entry.teamName);
    }
    return map;
  });

  // Every active player NOT already on this team's squad — the picker only
  // needs to exclude local duplicates; a player already claimed by a
  // DIFFERENT team in this same tournament is still shown here (we don't
  // know other teams' squads), but addToSquad() will cleanly reject that
  // with a 409 surfaced by the global error-notification interceptor.
  private playersResult = refetchableList(() => this.playerService.list({ limit: 500, isActive: true }), null);
  availablePlayers = () => {
    const onThisSquad = this.squadPlayerIds();
    const taken = this.takenByOtherTeam();
    return (this.playersResult.data()?.data ?? [])
      .filter((p) => !onThisSquad.has(p._id))
      .map((p) => ({ ...p, takenByTeam: taken.get(p._id) ?? null }));
  };

  selectedPlayerId = signal('');
  adding = signal(false);

  // ---- searchable player picker ----
  playerSearch = signal('');
  pickerOpen = signal(false);

  filteredPlayers = computed(() => {
    const term = this.playerSearch().toLowerCase().trim();
    const all = this.availablePlayers();
    if (!term) return all;
    return all.filter((p) => p.name.toLowerCase().includes(term));
  });

  onSearchInput(value: string): void {
    this.playerSearch.set(value);
    this.pickerOpen.set(true);
    // Typing again after a pick invalidates the previous selection until
    // they choose a new match from the list.
    this.selectedPlayerId.set('');
  }

  openPicker(): void {
    this.pickerOpen.set(true);
  }

  closePickerSoon(): void {
    // Delay so a click on a dropdown option registers before the list closes.
    setTimeout(() => this.pickerOpen.set(false), 150);
  }

    pickPlayer(player: { _id: string; name: string; role: string; takenByTeam: string | null }): void {
    if (player.takenByTeam) return;
    this.selectedPlayerId.set(player._id);
    this.playerSearch.set(`${player.name} (${player.role})`);
    this.pickerOpen.set(false);
  }

  addToSquad(): void {
    const playerId = this.selectedPlayerId();
    if (!playerId) return;
    this.adding.set(true);
    this.teamService.addToSquad(this.teamId, playerId).subscribe({
      next: () => {
        this.notifications.success('Player added to squad');
        this.selectedPlayerId.set('');
        this.playerSearch.set('');
        this.adding.set(false);
        this.squadResult.refresh();
      },
      error: () => this.adding.set(false),
    });
  }

  removeFromSquad(playerId: string, playerName: string): void {
    if (!confirm(`Remove ${playerName} from this squad?`)) return;
    this.teamService.removeFromSquad(this.teamId, playerId).subscribe({
      next: () => {
        this.notifications.success(`${playerName} removed from squad`);
        this.squadResult.refresh();
      },
      error: () => undefined,
    });
  }
}