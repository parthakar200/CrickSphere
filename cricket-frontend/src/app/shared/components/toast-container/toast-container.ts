import { Component, inject } from '@angular/core';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-toast-container',
  imports: [],
  templateUrl: './toast-container.html',
  styleUrl: './toast-container.scss',
})
export class ToastContainer {
  private notifications = inject(NotificationService);
  toasts = this.notifications.notifications;

  iconFor(type: string): string {
    switch (type) {
      case 'success':
        return 'check_circle';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'info';
    }
  }

  onCloseClick(event: MouseEvent, id: number): void {
    event.stopPropagation();
    this.dismiss(id);
  }

  dismiss(id: number): void {
    this.notifications.dismiss(id);
  }
}
