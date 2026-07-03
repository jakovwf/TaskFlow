import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import {
  loadNotifications,
  loadMoreNotifications,
  markAllAsRead,
  markAsRead,
} from '../../store/notifications/notifications.actions';
import {
  selectAllNotifications,
  selectNotificationsError,
  selectNotificationsLoading,
  selectNotificationsHasMore,
  selectNotificationsLoadingMore,
  selectNotificationsPage,
  selectUnreadCount,
} from '../../store/notifications/notifications.selectors';
import { Notification } from '../../store/models';

@Component({
  selector: 'app-notifications',
  imports: [AsyncPipe, DatePipe, RouterLink],
  templateUrl: './notifications.html',
  styleUrl: './notifications.scss',
})
export class Notifications {
  private readonly store = inject(Store);

  readonly notifications$ = this.store.select(selectAllNotifications);
  readonly loading$ = this.store.select(selectNotificationsLoading);
  readonly error$ = this.store.select(selectNotificationsError);
  readonly unreadCount$ = this.store.select(selectUnreadCount);
  readonly page$ = this.store.select(selectNotificationsPage);
  readonly hasMore$ = this.store.select(selectNotificationsHasMore);
  readonly loadingMore$ = this.store.select(selectNotificationsLoadingMore);

  constructor() {
    this.store.dispatch(loadNotifications());
  }

  markAsRead(notificationId: string): void {
    this.store.dispatch(markAsRead({ id: notificationId }));
  }

  markAllAsRead(): void {
    this.store.dispatch(markAllAsRead());
  }

  loadMore(page: number): void {
    this.store.dispatch(loadMoreNotifications({ page: page + 1 }));
  }

  notificationLabel(notification: Notification): string {
    switch (notification.type) {
      case 'BOARD_INVITE':
        return 'Pozivnica';
      case 'CARD_ASSIGNED':
        return 'Kartica';
      case 'CARD_MOVED':
        return 'Kartica';
      case 'COMMENT_ADDED':
        return 'Komentar';
      case 'MEMBER_JOINED':
        return 'Clan';
      case 'BOARD_UPDATED':
        return 'Board';
      default:
        return 'Obavestenje';
    }
  }

  inviteLink(notification: Notification): string | null {
    const token = notification.relatedInvite?.token;

    return notification.type === 'BOARD_INVITE' && token ? `/invite/${token}` : null;
  }

  openInvite(notification: Notification): void {
    if (!notification.isRead) {
      this.markAsRead(notification.id);
    }
  }
}
