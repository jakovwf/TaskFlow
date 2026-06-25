import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';
import { filter } from 'rxjs';
import { AuthService } from './core/services/auth';
import { NavbarComponent } from './shared/components/navbar/navbar';
import { loadMe } from './store/auth/auth.actions';

@Component({
  selector: 'app-root',
  imports: [NavbarComponent, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly publicPaths = new Set(['/', '/login', '/register']);
  private readonly currentPath = signal(this.router.url.split('?')[0]);

  protected readonly showNavbar = computed(() => {
    const path = this.currentPath();

    return this.authService.isLoggedIn() && !this.publicPaths.has(path);
  });

  constructor() {
    if (this.authService.getToken()) {
      this.store.dispatch(loadMe());
    }

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => this.currentPath.set(event.urlAfterRedirects.split('?')[0]));
  }
}
