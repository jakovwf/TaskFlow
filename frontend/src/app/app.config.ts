import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideStore } from '@ngrx/store';
import { provideStoreDevtools } from '@ngrx/store-devtools';

import { routes } from './app.routes';
import { jwtInterceptor } from './core/interceptors/jwt-interceptor';
import { AuthEffects } from './store/auth/auth.effects';
import { authReducer } from './store/auth/auth.reducer';
import { BoardsEffects } from './store/boards/boards.effects';
import { boardsReducer } from './store/boards/boards.reducer';
import { NotificationsEffects } from './store/notifications/notifications.effects';
import { notificationsReducer } from './store/notifications/notifications.reducer';
import { WorkspacesEffects } from './store/workspaces/workspaces.effects';
import { workspacesReducer } from './store/workspaces/workspaces.reducer';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([jwtInterceptor])),
    provideStore({
      auth: authReducer,
      boards: boardsReducer,
      notifications: notificationsReducer,
      workspaces: workspacesReducer,
    }),
    provideEffects([AuthEffects, BoardsEffects, NotificationsEffects, WorkspacesEffects]),
    provideStoreDevtools({ maxAge: 25, logOnly: false }),
  ]
};
