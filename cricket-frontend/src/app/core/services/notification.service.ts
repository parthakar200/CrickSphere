import { Injectable, signal } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface AppNotification {
  id: number;
  type: NotificationType;
  message: string;
}

let nextId = 1;

/**
 * Toast / notification queue. Auto-dismisses after a timeout,
 * prevents duplicate identical toasts, and allows manual dismissal.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private notificationsSignal = signal<AppNotification[]>([]);
  readonly notifications = this.notificationsSignal.asReadonly();

  show(message: string, type: NotificationType = 'info', durationMs = 3500): void {
    const id = nextId++;
    const notification: AppNotification = { id, type, message };

    // Deduplicate: replace any existing toast that has the exact same message
    this.notificationsSignal.update((list) => {
      const filtered = list.filter((n) => n.message !== message);
      return [...filtered, notification];
    });

    if (durationMs > 0) {
      setTimeout(() => this.dismiss(id), durationMs);
    }
  }

  success(message: string): void {
    this.show(message, 'success', 3500);
  }

  error(message: string): void {
    this.show(message, 'error', 5000);
  }

  info(message: string): void {
    this.show(message, 'info', 3500);
  }

  warning(message: string): void {
    this.show(message, 'warning', 4000);
  }

  dismiss(id: number): void {
    this.notificationsSignal.update((list) => list.filter((n) => n.id !== id));
  }
}
