import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { distinctUntilChanged, finalize, map, take } from 'rxjs';
import { AuthService } from '../../core/services/auth';
import { InviteService } from '../../core/services/invite';
import { loadMyBoards } from '../../store/boards/boards.actions';
import { BoardInvite } from '../../store/models';

@Component({
  selector: 'app-invite',
  imports: [],
  templateUrl: './invite.html',
  styleUrl: './invite.scss',
})
export class Invite {
  private readonly authService = inject(AuthService);
  private readonly inviteService = inject(InviteService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);

  token: string | null = null;
  invite: BoardInvite | null = null;
  loading = false;
  actionLoading = false;
  error: string | null = null;
  successMessage: string | null = null;

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('token')),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((token) => {
        this.token = token;

        if (token) {
          this.loadInvite(token);
          return;
        }

        this.error = 'Invite link nije ispravan.';
      });
  }

  acceptInvite(): void {
    if (!this.token) {
      return;
    }

    if (!this.authService.isLoggedIn()) {
      this.redirectToLogin();
      return;
    }

    this.actionLoading = true;
    this.error = null;
    this.successMessage = null;

    this.inviteService
      .acceptInvite(this.token)
      .pipe(
        take(1),
        finalize(() => {
          this.actionLoading = false;
        }),
      )
      .subscribe({
        next: (response) => {
          const boardId = response.invite.board?.id ?? this.invite?.board?.id;

          this.store.dispatch(loadMyBoards());
          this.successMessage = 'Invite je prihvacen.';
          void this.router.navigate(boardId ? ['/b', boardId] : ['/home']);
        },
        error: (error: unknown) => this.handleInviteActionError(error, 'Invite nije prihvacen.'),
      });
  }

  declineInvite(): void {
    if (!this.token) {
      return;
    }

    if (!this.authService.isLoggedIn()) {
      this.redirectToLogin();
      return;
    }

    this.actionLoading = true;
    this.error = null;
    this.successMessage = null;

    this.inviteService
      .declineInvite(this.token)
      .pipe(
        take(1),
        finalize(() => {
          this.actionLoading = false;
        }),
      )
      .subscribe({
        next: () => {
          this.successMessage = 'Invite je odbijen.';
          void this.router.navigate(['/home']);
        },
        error: (error: unknown) => this.handleInviteActionError(error, 'Invite nije odbijen.'),
      });
  }

  private loadInvite(token: string): void {
    this.loading = true;
    this.error = null;
    this.successMessage = null;

    this.inviteService
      .getInvite(token)
      .pipe(
        take(1),
        finalize(() => {
          this.loading = false;
        }),
      )
      .subscribe({
        next: (invite) => {
          this.invite = invite;
        },
        error: (error: unknown) => {
          this.error = this.getErrorMessage(error) ?? 'Invite nije pronadjen ili vise nije aktivan.';
        },
      });
  }

  private redirectToLogin(): void {
    const returnUrl = this.token ? `/invite/${this.token}` : '/home';
    void this.router.navigate(['/login'], { queryParams: { returnUrl } });
  }

  private handleInviteActionError(error: unknown, fallbackMessage: string): void {
    if (error instanceof HttpErrorResponse && error.status === 401) {
      this.redirectToLogin();
      return;
    }

    this.error = this.getErrorMessage(error) ?? fallbackMessage;
  }

  private getErrorMessage(error: unknown): string | null {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401) {
        return 'Morate biti prijavljeni da biste odgovorili na invite.';
      }

      if (error.status === 403) {
        return 'Ovaj invite nije namenjen prijavljenom korisniku.';
      }

      if (error.status === 404) {
        return 'Invite link nije pronadjen.';
      }

      if (error.status === 400) {
        return 'Invite je istekao ili vise nije pending.';
      }

      return null;
    }

    return null;
  }
}
