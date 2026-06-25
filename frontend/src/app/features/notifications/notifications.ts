import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import {
  loadNotifications,
  markAllAsRead,
  markAsRead,
} from '../../store/notifications/notifications.actions';
import {
  selectAllNotifications,
  selectNotificationsError,
  selectNotificationsLoading,
  selectUnreadCount,
} from '../../store/notifications/notifications.selectors';

@Component({
  selector: 'app-notifications',
  imports: [AsyncPipe, DatePipe],
  templateUrl: './notifications.html',
  styleUrl: './notifications.scss',
})
export class Notifications {
  private readonly store = inject(Store);

  readonly notifications$ = this.store.select(selectAllNotifications);
  readonly loading$ = this.store.select(selectNotificationsLoading);
  readonly error$ = this.store.select(selectNotificationsError);
  readonly unreadCount$ = this.store.select(selectUnreadCount);

  constructor() {
    this.store.dispatch(loadNotifications());
  }

  markAsRead(notificationId: string): void {
    this.store.dispatch(markAsRead({ id: notificationId }));
  }

  markAllAsRead(): void {
    this.store.dispatch(markAllAsRead());
  }
}
