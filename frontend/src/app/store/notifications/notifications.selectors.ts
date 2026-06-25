import { createFeatureSelector, createSelector } from '@ngrx/store';
import { notificationsAdapter, NotificationsState } from './notifications.reducer';

export const selectNotificationsState =
  createFeatureSelector<NotificationsState>('notifications');

const adapterSelectors = notificationsAdapter.getSelectors(selectNotificationsState);

export const selectAllNotifications = adapterSelectors.selectAll;

export const selectUnreadCount = createSelector(
  selectNotificationsState,
  (state) => state.unreadCount,
);

export const selectUnreadNotifications = createSelector(selectAllNotifications, (notifications) =>
  notifications.filter((notification) => !notification.isRead),
);

export const selectNotificationsLoading = createSelector(
  selectNotificationsState,
  (state) => state.loading,
);

export const selectNotificationsError = createSelector(
  selectNotificationsState,
  (state) => state.error,
);
