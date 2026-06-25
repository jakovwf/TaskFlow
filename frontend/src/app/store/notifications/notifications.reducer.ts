import { EntityState, createEntityAdapter } from '@ngrx/entity';
import { createReducer, on } from '@ngrx/store';
import { Notification } from '../models';
import {
  addNotification,
  loadNotifications,
  loadNotificationsFailure,
  loadNotificationsSuccess,
  markAllAsRead,
  markAllAsReadSuccess,
  markAsRead,
  markAsReadSuccess,
} from './notifications.actions';

export interface NotificationsState extends EntityState<Notification> {
  unreadCount: number;
  loading: boolean;
  error: string | null;
}

export const notificationsAdapter = createEntityAdapter<Notification>({
  sortComparer: (a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''),
});

export const initialNotificationsState: NotificationsState = notificationsAdapter.getInitialState({
  unreadCount: 0,
  loading: false,
  error: null,
});

export const notificationsReducer = createReducer(
  initialNotificationsState,
  on(loadNotifications, markAsRead, markAllAsRead, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(loadNotificationsSuccess, (state, { notifications }) =>
    notificationsAdapter.setAll(notifications, {
      ...state,
      unreadCount: notifications.filter((notification) => !notification.isRead).length,
      loading: false,
      error: null,
    }),
  ),
  on(loadNotificationsFailure, (state, { error }) => ({ ...state, loading: false, error })),
  on(markAsReadSuccess, (state, { notification }) =>
    notificationsAdapter.upsertOne(notification, {
      ...state,
      unreadCount: Math.max(0, state.unreadCount - (notification.isRead ? 1 : 0)),
      loading: false,
      error: null,
    }),
  ),
  on(markAllAsReadSuccess, (state) =>
    notificationsAdapter.updateMany(
      state.ids.map((id) => ({ id: String(id), changes: { isRead: true } })),
      { ...state, unreadCount: 0, loading: false, error: null },
    ),
  ),
  on(addNotification, (state, { notification }) =>
    notificationsAdapter.upsertOne(notification, {
      ...state,
      unreadCount: state.unreadCount + (notification.isRead ? 0 : 1),
    }),
  ),
);
