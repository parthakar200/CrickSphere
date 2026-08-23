import { Component, input } from '@angular/core';

export type StatCardAccent = 'electric' | 'purple' | 'emerald' | 'amber' | 'crimson';

@Component({
  selector: 'app-stat-card',
  imports: [],
  templateUrl: './stat-card.html',
  styleUrl: './stat-card.scss',
})
export class StatCard {
  label = input.required<string>();
  value = input.required<string | number>();
  icon = input.required<string>();
  accent = input<StatCardAccent>('electric');
  trend = input<string | null>(null);
  trendPositive = input<boolean>(true);
}
