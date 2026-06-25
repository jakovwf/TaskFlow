import { Component, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { catchError, debounceTime, distinctUntilChanged, finalize, forkJoin, map, of, switchMap, take, tap } from 'rxjs';
import { BoardService } from '../../../core/services/board';
import { UserService } from '../../../core/services/user';
import { selectCurrentUser } from '../../../store/auth/auth.selectors';
import { Board, BoardInvite, BoardMember, BoardMemberRole, User } from '../../../store/models';

@Component({
  selector: 'app-board-members',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './board-members.html',
  styleUrl: './board-members.scss',
})
export class BoardMembers {
  private readonly boardService = inject(BoardService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(Store);
  private readonly userService = inject(UserService);

  boardId: string | null = null;
  board: Board | null = null;
  members: BoardMember[] = [];
  invites: BoardInvite[] = [];
  currentUser: User | null = null;
  loading = false;
  inviteSaving = false;
  memberRoleLoadingUserId: string | null = null;
  memberRemoveLoadingUserId: string | null = null;
  revokeLoadingInviteId: string | null = null;
  userSearchResults: User[] = [];
  userSearchLoading = false;
  userSearchError: string | null = null;
  hasSearchedUsers = false;
  error: string | null = null;
  successMessage: string | null = null;

  readonly inviteForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  readonly userSearchControl = this.formBuilder.nonNullable.control('');

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('boardId')),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((boardId) => {
        this.boardId = boardId;

        if (boardId) {
          this.loadBoardMembers(boardId);
          return;
        }

        this.loading = false;
        this.board = null;
        this.members = [];
        this.invites = [];
        this.error = 'Board nije pronadjen.';
      });

    this.store
      .select(selectCurrentUser)
      .pipe(takeUntilDestroyed())
      .subscribe((user) => {
        this.currentUser = user;
      });

    this.userSearchControl.valueChanges
      .pipe(
        debounceTime(300),
        map((query) => query.trim()),
        distinctUntilChanged(),
        tap((query) => {
          this.userSearchError = null;
          this.hasSearchedUsers = query.length >= 2;

          if (query.length < 2) {
            this.userSearchResults = [];
            this.userSearchLoading = false;
          }
        }),
        switchMap((query) => {
          if (query.length < 2) {
            return of([]);
          }

          this.userSearchLoading = true;

          return this.userService.searchUsers(query).pipe(
            catchError(() => {
              this.userSearchError = 'Pretraga korisnika nije uspela.';
              return of([]);
            }),
            finalize(() => {
              this.userSearchLoading = false;
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((users) => {
        this.userSearchResults = users;
      });
  }

  createInvite(): void {
    if (!this.boardId || this.inviteForm.invalid) {
      this.inviteForm.markAllAsTouched();
      return;
    }

    const inviteeEmail = this.inviteForm.getRawValue().email.trim();

    if (!inviteeEmail) {
      this.inviteForm.markAllAsTouched();
      return;
    }

    this.inviteSaving = true;
    this.error = null;
    this.successMessage = null;

    this.boardService
      .createBoardInvite(this.boardId, { inviteeEmail })
      .pipe(
        take(1),
        finalize(() => {
          this.inviteSaving = false;
        }),
      )
      .subscribe({
        next: (invite) => {
          this.invites = [invite, ...this.invites];
          this.inviteForm.reset();
          this.successMessage = 'Invite je poslat i dodat u pending listu.';
        },
        error: (error: unknown) => {
          this.error = this.getErrorMessage(error, 'Invite nije poslat.');
        },
      });
  }

  revokeInvite(inviteId: string): void {
    if (!this.boardId || !confirm('Da li zelite da povucete ovaj invite?')) {
      return;
    }

    this.error = null;
    this.successMessage = null;
    this.revokeLoadingInviteId = inviteId;

    this.boardService
      .deleteBoardInvite(this.boardId, inviteId)
      .pipe(
        take(1),
        finalize(() => {
          this.revokeLoadingInviteId = null;
        }),
      )
      .subscribe({
        next: () => {
          this.invites = this.invites.filter((invite) => invite.id !== inviteId);
          this.successMessage = 'Invite je povucen.';
        },
        error: (error: unknown) => {
          this.error = this.getErrorMessage(error, 'Invite nije povucen.');
        },
      });
  }

  updateMemberRole(member: BoardMember, role: BoardMemberRole): void {
    if (!this.boardId || member.role === role || !this.canManageMember(member)) {
      return;
    }

    this.error = null;
    this.successMessage = null;
    this.memberRoleLoadingUserId = member.userId;

    this.boardService
      .updateBoardMemberRole(this.boardId, member.userId, role)
      .pipe(
        take(1),
        finalize(() => {
          this.memberRoleLoadingUserId = null;
        }),
      )
      .subscribe({
        next: (updatedMember) => {
          this.members = this.members.map((existingMember) =>
            existingMember.userId === updatedMember.userId ? updatedMember : existingMember,
          );
          this.successMessage = 'Rola clana je promenjena.';
        },
        error: (error: unknown) => {
          this.error = this.getErrorMessage(error, 'Rola clana nije promenjena.');
        },
      });
  }

  removeMember(member: BoardMember): void {
    if (!this.boardId || !this.canManageMember(member)) {
      return;
    }

    if (!confirm('Da li zelite da uklonite ovog clana sa boarda?')) {
      return;
    }

    this.error = null;
    this.successMessage = null;
    this.memberRemoveLoadingUserId = member.userId;

    this.boardService
      .removeBoardMember(this.boardId, member.userId)
      .pipe(
        take(1),
        finalize(() => {
          this.memberRemoveLoadingUserId = null;
        }),
      )
      .subscribe({
        next: () => {
          this.members = this.members.filter((existingMember) => existingMember.userId !== member.userId);
          this.successMessage = 'Clan je uklonjen sa boarda.';
        },
        error: (error: unknown) => {
          this.error = this.getErrorMessage(error, 'Clan nije uklonjen.');
        },
      });
  }

  async copyInviteLink(invite: BoardInvite): Promise<void> {
    this.error = null;
    this.successMessage = null;

    const inviteLink = this.getInviteLink(invite);

    try {
      await navigator.clipboard.writeText(inviteLink);
      this.successMessage = 'Invite link kopiran.';
    } catch {
      this.error = 'Invite link nije kopiran. Pokusaj ponovo.';
    }
  }

  getInviteLink(invite: BoardInvite): string {
    return `${window.location.origin}/invite/${invite.token}`;
  }

  selectUserForInvite(user: User): void {
    this.inviteForm.patchValue({ email: user.email });
    this.userSearchControl.setValue(user.displayName || user.email, { emitEvent: false });
    this.userSearchResults = [];
    this.userSearchError = null;
    this.hasSearchedUsers = false;
  }

  canManageMember(member: BoardMember): boolean {
    return this.currentUserBoardRole() === 'OWNER' && member.role !== 'OWNER';
  }

  currentUserBoardRole(): BoardMemberRole | null {
    if (!this.currentUser) {
      return null;
    }

    return this.members.find((member) => member.userId === this.currentUser?.id)?.role ?? null;
  }

  private loadBoardMembers(boardId: string): void {
    this.loading = true;
    this.error = null;
    this.successMessage = null;
    this.board = null;
    this.members = [];
    this.invites = [];

    forkJoin({
      board: this.boardService.getBoard(boardId),
      members: this.boardService.getBoardMembers(boardId),
    })
      .pipe(
        switchMap(({ board, members }) => {
          const currentUserRole =
            members.find((member) => member.userId === this.currentUser?.id)?.role ?? null;

          if (currentUserRole !== 'OWNER' && currentUserRole !== 'ADMIN') {
            return of({ board, members, invites: [] as BoardInvite[] });
          }

          return this.boardService.getBoardInvites(boardId).pipe(
            catchError(() => of([] as BoardInvite[])),
            map((invites) => ({ board, members, invites })),
          );
        }),
        take(1),
        finalize(() => {
          if (this.boardId === boardId) {
            this.loading = false;
          }
        }),
      )
      .subscribe({
        next: ({ board, members, invites }) => {
          if (this.boardId !== boardId) {
            return;
          }

          this.board = board;
          this.members = members;
          this.invites = invites.filter((invite) => invite.status === 'PENDING');
        },
        error: (error: unknown) => {
          if (this.boardId !== boardId) {
            return;
          }

          this.error = this.getErrorMessage(error, 'Clanovi boarda nisu ucitani.');
        },
      });
  }

  private getErrorMessage(error: unknown, fallbackMessage: string): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401) {
        return 'Morate biti prijavljeni da biste videli clanove boarda.';
      }

      if (error.status === 403) {
        return 'Nemate dozvolu za ovu akciju na boardu.';
      }

      if (error.status === 404) {
        return 'Board ili invite nisu pronadjeni.';
      }

      return fallbackMessage;
    }

    return fallbackMessage;
  }
}
