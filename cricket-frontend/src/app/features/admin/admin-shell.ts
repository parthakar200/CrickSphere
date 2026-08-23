
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-admin-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-shell.html',
  styleUrl: './admin-shell.scss',
})
export class AdminShell {
  tabs = [
    { label: 'Teams', icon: 'groups', route: '/admin/teams' },
    { label: 'Players', icon: 'sports_cricket', route: '/admin/players' },
    { label: 'Tournaments', icon: 'emoji_events', route: '/admin/tournaments' },
    { label: 'Matches', icon: 'sports', route: '/admin/matches' },
  ];
}