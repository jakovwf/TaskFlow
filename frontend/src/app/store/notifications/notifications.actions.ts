import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { Notification } from '../models';

export const notificationsActions = createActionGroup({
  source: 'Notifications',
  events: {
    'Load Notifications': emptyProps(),
    'Load Notifications Success': props<{ notifications: Notification[] }>(),
    'Load Notifications Failure': props<{ error: string }>(),
    'Mark As Read': props<{ id: string }>(),
    'Mark As Read Success': props<{ notification: Notification }>(),
    'Mark All As Read': emptyProps(),
    'Mark All As Read Success': emptyProps(),
    'Add Notification': props<{ notification: Notification }>(),
  },
});

export const {
  loadNotifications,
  loadNotificationsSuccess,
  loadNotificationsFailure,
  markAsRead,
  markAsReadSuccess,
  markAllAsRead,
  markAllAsReadSuccess,
  addNotification,
} = notificationsActions;
