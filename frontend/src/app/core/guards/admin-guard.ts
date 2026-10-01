import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of, take } from 'rxjs';
import { AuthService } from '../services/auth';

export const AdminGuard: CanActivateFn = () => {
  const router = inject(Router);
  const authService = inject(AuthService);

  return authService.me().pipe(
    take(1),
    map((user) => user.userRole === 'ADMIN' ? true : router.createUrlTree(['/home'])),
    catchError(() => of(router.createUrlTree(['/home']))),
  );
};
