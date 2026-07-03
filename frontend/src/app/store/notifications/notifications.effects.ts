import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, exhaustMap, map, of, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SocketService } from '../../core/services/socket.service';
import { Notification, NotificationPage } from '../models';
import {
  loadNotifications,
  addNotification,
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

@Injectable()
export class NotificationsEffects {
  private readonly actions$ = inject(Actions);
  private readonly http = inject(HttpClient);
  private readonly socketService = inject(SocketService);
  private readonly notificationsApiUrl = `${environment.apiUrl}/notifications`;

  readonly loadNotifications$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadNotifications),
      switchMap(() =>
        this.http.get<NotificationPage>(this.notificationsApiUrl, { params: { page: 1, limit: 10 } }).pipe(
          map((response) => loadNotificationsSuccess({ response })),
          catchError((error: unknown) => of(loadNotificationsFailure({ error: this.getErrorMessage(error) }))),
        ),
      ),
    ),
  );

  readonly loadMoreNotifications$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadMoreNotifications),
      exhaustMap(({ page }) =>
        this.http.get<NotificationPage>(this.notificationsApiUrl, { params: { page, limit: 10 } }).pipe(
          map((response) => loadMoreNotificationsSuccess({ response })),
          catchError((error: unknown) =>
            of(loadMoreNotificationsFailure({ error: this.getErrorMessage(error) })),
          ),
        ),
      ),
    ),
  );

  readonly notificationNew$ = createEffect(() =>
    this.socketService
      .on<Notification>('notification:new')
      .pipe(map((notification) => addNotification({ notification }))),
  );

  readonly markAsRead$ = createEffect(() =>
    this.actions$.pipe(
      ofType(markAsRead),
      exhaustMap(({ id }) =>
        this.http.patch<Notification>(`${this.notificationsApiUrl}/${id}/read`, {}).pipe(
          map((notification) => markAsReadSuccess({ notification })),
          catchError((error: unknown) => of(loadNotificationsFailure({ error: this.getErrorMessage(error) }))),
        ),
      ),
    ),
  );

  readonly markAllAsRead$ = createEffect(() =>
    this.actions$.pipe(
      ofType(markAllAsRead),
      exhaustMap(() =>
        this.http.patch(`${this.notificationsApiUrl}/read-all`, {}).pipe(
          map(() => markAllAsReadSuccess()),
          catchError((error: unknown) => of(loadNotificationsFailure({ error: this.getErrorMessage(error) }))),
        ),
      ),
    ),
  );

  private getErrorMessage(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const httpError = error as { error?: { message?: string } | string; message?: string };

      if (typeof httpError.error === 'string') {
        return httpError.error;
      }

      return httpError.error?.message ?? httpError.message ?? 'Notifikacije nisu ucitane.';
    }

    return 'Notifikacije nisu ucitane.';
  }
}
