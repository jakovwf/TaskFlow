import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { Notification, NotificationPage } from '../models';

export const notificationsActions = createActionGroup({
  source: 'Notifications',
  events: {
    'Load Notifications': emptyProps(),
    'Load Notifications Success': props<{ response: NotificationPage }>(),
    'Load Notifications Failure': props<{ error: string }>(),
    'Load More Notifications': props<{ page: number }>(),
    'Load More Notifications Success': props<{ response: NotificationPage }>(),
    'Load More Notifications Failure': props<{ error: string }>(),
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
  loadMoreNotifications,
  loadMoreNotificationsSuccess,
  loadMoreNotificationsFailure,
  markAsRead,
  markAsReadSuccess,
  markAllAsRead,
  markAllAsReadSuccess,
  addNotification,
} = notificationsActions;
