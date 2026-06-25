import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Store } from '@ngrx/store';
import { logout } from '../../../store/auth/auth.actions';
import { loadNotifications } from '../../../store/notifications/notifications.actions';
import { selectUnreadCount } from '../../../store/notifications/notifications.selectors';

@Component({
  selector: 'app-navbar',
  imports: [AsyncPipe, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class NavbarComponent {
  private readonly store = inject(Store);

  readonly unreadCount$ = this.store.select(selectUnreadCount);

  constructor() {
    this.store.dispatch(loadNotifications());
  }

  logout(): void {
    this.store.dispatch(logout());
  }
}
