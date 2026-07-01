import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth';
import { SocketService } from '../services/socket.service';
import { ToastService } from '../../shared/services/toast.service';

export const jwtInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const socketService = inject(SocketService);
  const router = inject(Router);
  const toastService = inject(ToastService);
  const token = authService.getToken();
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
        router.navigate(['/login']);
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
