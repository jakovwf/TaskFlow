import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, exhaustMap, map, of, switchMap, tap } from 'rxjs';
import { AuthService } from '../../core/services/auth';
import { SocketService } from '../../core/services/socket.service';
import { User } from '../models';
import {
  loadMe,
  loadMeFailure,
  loadMeSuccess,
  login,
  loginFailure,
  loginSuccess,
  logout,
  register,
} from './auth.actions';

@Injectable()
export class AuthEffects {
  private readonly actions$ = inject(Actions);
  private readonly authService = inject(AuthService);
  private readonly socketService = inject(SocketService);
  private readonly router = inject(Router);

  readonly loginEffect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(login),
      exhaustMap(({ email, password }) =>
        this.authService.login(email, password).pipe(
          map((response) => {
            const token = response.token ?? response.accessToken;
            return response.user && token
              ? loginSuccess({ user: response.user, token })
              : loginFailure({ error: 'Login response is missing user or token.' });
          }),
          catchError((error: unknown) => of(loginFailure({ error: this.getErrorMessage(error) }))),
        ),
      ),
    ),
  );

  readonly registerEffect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(register),
      exhaustMap(({ displayName, email, password }) =>
        this.authService.register(email, password, displayName).pipe(
          map((response) => {
            const token = response.token ?? response.accessToken;
            return response.user && token
              ? loginSuccess({ user: response.user, token })
              : loginFailure({ error: 'Register response is missing user or token.' });
          }),
          catchError((error: unknown) => of(loginFailure({ error: this.getErrorMessage(error) }))),
        ),
      ),
    ),
  );

  readonly loginSuccessEffect$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(loginSuccess),
        tap(({ token }) => {
          localStorage.setItem('auth_token', token);
          this.socketService.connect(token);
          void this.router.navigateByUrl(this.getLoginRedirectUrl());
        }),
      ),
    { dispatch: false },
  );

  readonly logoutEffect$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(logout),
        tap(() => this.socketService.disconnect()),
        exhaustMap(() => {
          const logoutRequest$ = this.authService.getToken()
            ? this.authService.logout()
            : of(null);

          return logoutRequest$.pipe(
            catchError(() => of(null)),
            tap(() => this.router.navigate(['/login'])),
          );
        }),
      ),
    { dispatch: false },
  );

  readonly reconnectSocketAfterLoadMe$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(loadMeSuccess),
        tap(() => {
          const token = this.authService.getToken();

          if (token) {
            this.socketService.connect(token);
          }
        }),
      ),
    { dispatch: false },
  );

  readonly loadMeFailureEffect$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(loadMeFailure),
        tap(() => this.authService.clearToken()),
      ),
    { dispatch: false },
  );

  readonly loadMeEffect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadMe),
      switchMap(() => {
        if (!this.authService.getToken()) {
          return of(loadMeFailure({ error: 'No auth token.' }));
        }

        return this.authService.me().pipe(
          map((user) => loadMeSuccess({ user: user as User })),
          catchError((error: unknown) => of(loadMeFailure({ error: this.getErrorMessage(error) }))),
        );
      }),
    ),
  );

  private getErrorMessage(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const httpError = error as { error?: { message?: string } | string; message?: string };

      if (typeof httpError.error === 'string') {
        return httpError.error;
      }

      return httpError.error?.message ?? httpError.message ?? 'Request failed.';
    }

    return 'Request failed.';
  }

  private getLoginRedirectUrl(): string {
    const returnUrl = this.router.parseUrl(this.router.url).queryParams['returnUrl'];

    return typeof returnUrl === 'string' && returnUrl.startsWith('/') && !returnUrl.startsWith('//')
      ? returnUrl
      : '/home';
  }
}
