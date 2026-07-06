import { EntityState, createEntityAdapter } from '@ngrx/entity';
import { createReducer, on } from '@ngrx/store';
import { logout } from '../auth/auth.actions';
import { Notification } from '../models';
import {
  addNotification,
  loadNotifications,
  loadNotificationsFailure,
  loadNotificationsSuccess,
  loadMoreNotifications,
  loadMoreNotificationsFailure,
  loadMoreNotificationsSuccess,
  markAllAsRead,
  markAllAsReadSuccess,
  markAsRead,
  markAsReadSuccess,
} from './notifications.actions';

export interface NotificationsState extends EntityState<Notification> {
  unreadCount: number;
  loading: boolean;
  error: string | null;
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  loadingMore: boolean;
}

export const notificationsAdapter = createEntityAdapter<Notification>({
  sortComparer: (a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''),
});

export const initialNotificationsState: NotificationsState = notificationsAdapter.getInitialState({
  unreadCount: 0,
  loading: false,
  error: null,
  page: 0,
  limit: 10,
  total: 0,
  hasMore: false,
  loadingMore: false,
});

export const notificationsReducer = createReducer(
  initialNotificationsState,
  on(loadNotifications, markAsRead, markAllAsRead, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(loadNotificationsSuccess, (state, { response }) =>
    notificationsAdapter.setAll(response.items, {
      ...state,
      unreadCount: response.unreadCount,
      page: response.page,
      limit: response.limit,
      total: response.total,
      hasMore: response.hasMore,
      loading: false,
      loadingMore: false,
      error: null,
    }),
  ),
  on(loadMoreNotifications, (state) => ({ ...state, loadingMore: true, error: null })),
  on(loadMoreNotificationsSuccess, (state, { response }) =>
    notificationsAdapter.upsertMany(response.items, {
      ...state,
      unreadCount: response.unreadCount,
      page: response.page,
      limit: response.limit,
      total: response.total,
      hasMore: response.hasMore,
      loadingMore: false,
      error: null,
    }),
  ),
  on(loadNotificationsFailure, (state, { error }) => ({ ...state, loading: false, error })),
  on(loadMoreNotificationsFailure, (state, { error }) => ({ ...state, loadingMore: false, error })),
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
  on(addNotification, (state, { notification }) => {
    const existingNotification = state.entities[notification.id];
    const previousUnread = existingNotification && !existingNotification.isRead ? 1 : 0;
    const nextUnread = notification.isRead ? 0 : 1;

    return notificationsAdapter.upsertOne(notification, {
      ...state,
      unreadCount: Math.max(0, state.unreadCount - previousUnread + nextUnread),
      total: state.total + (existingNotification ? 0 : 1),
    });
  }),
  on(logout, () => initialNotificationsState),
);
