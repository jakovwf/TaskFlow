import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { logout } from '../../../store/auth/auth.actions';
import { selectUnreadCount } from '../../../store/notifications/notifications.selectors';

@Component({
  selector: 'app-navbar',
  imports: [AsyncPipe, RouterLink],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class NavbarComponent {
  private readonly store = inject(Store);

  readonly unreadCount$ = this.store.select(selectUnreadCount);

  logout(): void {
    this.store.dispatch(logout());
  }
}
