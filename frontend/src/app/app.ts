import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { Store } from '@ngrx/store';
import { filter } from 'rxjs';
import { AuthService } from './core/services/auth';
import { NavbarComponent } from './shared/components/navbar/navbar';
import { loadMe } from './store/auth/auth.actions';
import { selectSelectedBoard } from './store/boards/boards.selectors';
import { Board as BoardModel } from './store/models';
import { ConfirmModalComponent } from './shared/components/confirm-modal/confirm-modal';
import { ToastComponent } from './shared/components/toast/toast';
import { ConfirmModalService } from './shared/services/confirm-modal.service';

@Component({
  selector: 'app-root',
  imports: [ConfirmModalComponent, NavbarComponent, RouterOutlet, ToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly authService = inject(AuthService);
  protected readonly confirmModal = inject(ConfirmModalService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly title = inject(Title);
  private readonly publicPaths = new Set(['/', '/login', '/register']);
  private readonly currentPath = signal(this.router.url.split('?')[0]);
  private selectedBoard: BoardModel | null = null;

  protected readonly showNavbar = computed(() => {
    const path = this.currentPath();

    return this.authService.isLoggedIn() && !this.publicPaths.has(path);
  });

  constructor() {
    if (this.authService.getToken()) {
      this.store.dispatch(loadMe());
    }

    this.store
      .select(selectSelectedBoard)
      .pipe(takeUntilDestroyed())
      .subscribe((board) => {
        this.selectedBoard = board;
        this.updatePageTitle();
      });

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => {
        this.currentPath.set(event.urlAfterRedirects.split('?')[0]);
        this.updatePageTitle();
      });

    this.updatePageTitle();
  }

  private updatePageTitle(): void {
    const boardId = this.currentPath().match(/^\/b\/([^/]+)$/)?.[1];

    if (boardId) {
      const boardTitle = this.selectedBoard?.id === boardId ? this.selectedBoard.title : 'Board';
      this.title.setTitle(`${boardTitle} | TaskFlow`);
      return;
    }

    this.title.setTitle(this.deepestRouteTitle() ?? 'TaskFlow');
  }

  private deepestRouteTitle(): string | null {
    let activeRoute = this.route.snapshot;

    while (activeRoute.firstChild) {
      activeRoute = activeRoute.firstChild;
    }

    return (activeRoute.data['title'] as string | undefined) ?? null;
  }
}
