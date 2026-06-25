import { AsyncPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { logout } from '../../../store/auth/auth.actions';
import { loadNotifications } from '../../../store/notifications/notifications.actions';
import { selectUnreadCount } from '../../../store/notifications/notifications.selectors';

@Component({
  selector: 'app-navbar',
  imports: [AsyncPipe, RouterLink],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class NavbarComponent {
  @Input() isSidebarOpen = true;

  @Output() sidebarToggle = new EventEmitter<void>();

  private readonly store = inject(Store);

  readonly unreadCount$ = this.store.select(selectUnreadCount);

  constructor() {
    this.store.dispatch(loadNotifications());
  }

  logout(): void {
    this.closeSidebar();
    this.store.dispatch(logout());
  }

  toggleSidebar(): void {
    this.sidebarToggle.emit();
  }

  closeSidebar(): void {
    if (this.isSidebarOpen && window.matchMedia('(max-width: 1023px)').matches) {
      this.sidebarToggle.emit();
    }
  }
}
