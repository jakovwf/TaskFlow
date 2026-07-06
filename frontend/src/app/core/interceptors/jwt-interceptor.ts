import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth';
import { SocketService } from '../services/socket.service';
import { ToastService } from '../../shared/services/toast.service';
import { logout } from '../../store/auth/auth.actions';

let unauthorizedCleanupStarted = false;

export const jwtInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const socketService = inject(SocketService);
  const router = inject(Router);
  const store = inject(Store);
  const toastService = inject(ToastService);
  const token = authService.getToken();

  if (token && unauthorizedCleanupStarted) {
    unauthorizedCleanupStarted = false;
  }

  const isLoginOrRegisterRequest =
    request.url.includes('/auth/login') || request.url.includes('/auth/register');
  const isLogoutRequest = request.url.includes('/auth/logout');
  const authRequest = token && !request.url.includes('cloudinary.com')
    ? request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
          'x-socket-id': socketService.socketId ?? '',
        },
      })
    : request;

  return next(authRequest).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        authService.clearToken();
        socketService.disconnect();

        if (
          !isLoginOrRegisterRequest &&
          !isLogoutRequest &&
          !unauthorizedCleanupStarted &&
          router.url.split('?')[0] !== '/login'
        ) {
          unauthorizedCleanupStarted = true;
          store.dispatch(logout());
        }
      }

      if (error instanceof HttpErrorResponse && error.status === 403) {
        toastService.error('Nemate dozvolu za ovu akciju');
      } else if (error instanceof HttpErrorResponse && error.status === 404) {
        toastService.error('Resurs nije pronađen');
      } else if (error instanceof HttpErrorResponse && error.status >= 500) {
        toastService.error('Greška na serveru, pokušajte ponovo');
      }

      return throwError(() => error);
    }),
  );
};
