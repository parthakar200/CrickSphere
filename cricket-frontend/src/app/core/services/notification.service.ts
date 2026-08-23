import { Injectable, signal } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface AppNotification {
  id: number;
  type: NotificationType;
  message: string;
}

let nextId = 1;

/**
 * Minimal in-memory toast/notification queue. The shell renders whatever's
 * in `notifications()`; this service just owns the array. Auto-dismisses
 * after a few seconds unless `sticky` is passed.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private notificationsSignal = signal<AppNotification[]>([]);
  readonly notifications = this.notificationsSignal.asReadonly();

  show(message: string, type: NotificationType = 'info', durationMs = 4000): void {
    const notification: AppNotification = { id: nextId++, type, message };
    this.notificationsSignal.update((list) => [...list, notification]);

    if (durationMs > 0) {
      setTimeout(() => this.dismiss(notification.id), durationMs);
    }
  }

  success(message: string): void {
    this.show(message, 'success');
  }

  error(message: string): void {
    this.show(message, 'error', 6000);
  }

  info(message: string): void {
    this.show(message, 'info');
  }

  warning(message: string): void {
    this.show(message, 'warning', 5000);
  }

  dismiss(id: number): void {
    this.notificationsSignal.update((list) => list.filter((n) => n.id !== id));
  }
}
