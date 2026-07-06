import { AsyncPipe } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, ElementRef, HostListener, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { catchError, combineLatest, distinctUntilChanged, finalize, forkJoin, map, of, take } from 'rxjs';
import { CommentService } from '../../../core/services/comment';
import { BoardSocketService } from '../../../core/services/board-socket.service';
import { CardService } from '../../../core/services/card';
import { ListService } from '../../../core/services/list';
import { LabelService } from '../../../core/services/label.service';
import { ConfirmModalService } from '../../../shared/services/confirm-modal.service';
import {
  createCard,
  createList,
  deleteBoard,
  deleteCard,
  deleteList,
  loadBoard,
  reorderCards,
  reorderLists,
  updateCard,
  updateCardSuccess,
  updateBoard,
  updateBoardDetails,
  updateListSuccess,
} from '../../../store/boards/boards.actions';
import { selectCurrentUser } from '../../../store/auth/auth.selectors';
import {
  selectBoardsError,
  selectBoardsLoading,
  selectBoardsReorderError,
  selectSelectedBoard,
} from '../../../store/boards/boards.selectors';
import { Attachment, Board as BoardModel, BoardList, BoardMember, Card, CardComment, CardLabel, CardMember, Label, User } from '../../../store/models';
import { BoardListComponent } from '../components/board-list/board-list';
import { CardDetailComponent } from '../components/card-detail/card-detail';
import { BOARD_BACKGROUNDS } from '../appearance-options';

@Component({
  selector: 'app-board',
  imports: [AsyncPipe, BoardListComponent, CardDetailComponent, DragDropModule, ReactiveFormsModule, RouterLink],
  templateUrl: './board.html',
  styleUrl: './board.scss',
})
export class Board {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly cardService = inject(CardService);
  private readonly boardSocketService = inject(BoardSocketService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly commentService = inject(CommentService);
  private readonly confirmModalService = inject(ConfirmModalService);
  private readonly listService = inject(ListService);
  private readonly labelService = inject(LabelService);
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(Store);

  readonly board$ = this.store.select(selectSelectedBoard);
  readonly loading$ = this.store.select(selectBoardsLoading);
  readonly error$ = this.store.select(selectBoardsError);
  readonly reorderError$ = this.store.select(selectBoardsReorderError);
  readonly boardContext$ = combineLatest({
    board: this.board$,
    currentUser: this.store.select(selectCurrentUser),
  });
  readonly currentUser$ = this.store.select(selectCurrentUser);
  currentUser: User | null = null;
  selectedCard: Card | null = null;
  commentsByCardId: Partial<Record<string, CardComment[]>> = {};
  commentsLoading = false;
  commentSaving = false;
  commentsError: string | null = null;
  cardTitleSaving = false;
  cardTitleError: string | null = null;
  memberAssignmentSaving = false;
  memberAssignmentError: string | null = null;
  attachmentUploading = false;
  attachmentDeletingId: string | null = null;
  attachmentError: string | null = null;
  boardLabels: Label[] = [];
  labelSaving = false;
  labelError: string | null = null;
  cardAppearanceSaving = false;
  cardAppearanceError: string | null = null;
  listAppearanceSavingId: string | null = null;
  renamingListId: string | null = null;
  listRenameErrors: Record<string, string | null> = {};
  editingBoardHeader = false;
  pendingBoardBackgroundColor: string | null = null;
  showNewListForm = false;
  mobileToolbarOpen = false;
  activeMobileListIndex = 0;
  canScrollBoardLeft = false;
  canScrollBoardRight = false;
  isMobileViewport = typeof window !== 'undefined' && window.innerWidth < 640;
  hasBoardRoute = false;
  private lastCommentsBoardId: string | null = null;
  private activeCommentsLoadCardId: string | null = null;
  private commentsMutationVersion = 0;
  private currentBoard: BoardModel | null = null;
  private labelHydrationBoardId: string | null = null;
  private readonly requestedLabelCardIds = new Set<string>();
  readonly boardBackgrounds = BOARD_BACKGROUNDS;
  private boardScroller?: ElementRef<HTMLElement>;

  @ViewChild('boardScroller')
  set boardScrollerElement(element: ElementRef<HTMLElement> | undefined) {
    this.boardScroller = element;
    this.scheduleScrollStateUpdate();
  }

  readonly listForm = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(1)]],
  });

  readonly boardEditForm = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(1)]],
    description: [''],
  });

  constructor() {
    this.currentUser$
      .pipe(takeUntilDestroyed())
      .subscribe((user) => {
        this.currentUser = user;
        this.cdr.markForCheck();
      });

    this.board$
      .pipe(takeUntilDestroyed())
      .subscribe((board) => {
        this.currentBoard = board;
        this.boardLabels = [...(board?.labels ?? [])];
        this.syncMobileListIndex(board?.lists ?? []);
        this.scheduleScrollStateUpdate();

        if (!board) {
          this.labelHydrationBoardId = null;
          this.requestedLabelCardIds.clear();
          return;
        }

        if (this.labelHydrationBoardId !== board.id) {
          this.labelHydrationBoardId = board.id;
          this.requestedLabelCardIds.clear();
        }

        this.hydrateCardLabels(board);
        this.cdr.markForCheck();
      });

    this.boardSocketService.commentAdded$
      .pipe(takeUntilDestroyed())
      .subscribe(({ comment, cardId, boardId }) => {
        if (this.currentBoard?.id !== boardId) {
          return;
        }

        const comments = this.getCommentsForCard(cardId);

        if (!comments.some((item) => item.id === comment.id)) {
          this.commentsMutationVersion++;
          this.commentsByCardId = { ...this.commentsByCardId, [cardId]: [...comments, comment] };
          this.cdr.markForCheck();
        }
      });

    this.boardSocketService.cardUpdated$
      .pipe(takeUntilDestroyed())
      .subscribe(({ card }) => {
        if (this.selectedCard?.id !== card.id) {
          return;
        }

        this.selectedCard = { ...this.selectedCard, ...card };
        this.cdr.markForCheck();
      });

    this.boardSocketService.commentDeleted$
      .pipe(takeUntilDestroyed())
      .subscribe(({ commentId, cardId, boardId }) => {
        if (this.currentBoard?.id !== boardId) {
          return;
        }

        this.commentsMutationVersion++;
        this.commentsByCardId = {
          ...this.commentsByCardId,
          [cardId]: this.getCommentsForCard(cardId).filter((comment) => comment.id !== commentId),
        };
        this.cdr.markForCheck();
      });

    this.boardSocketService.cardLabelAdded$
      .pipe(takeUntilDestroyed())
      .subscribe(({ cardId, label, boardId }) => {
        if (this.currentBoard?.id !== boardId) {
          return;
        }

        this.updateCardFromSocket(cardId, (card) => ({
          ...card,
          labels: (card.labels ?? []).some((item) => item.labelId === label.labelId)
            ? card.labels
            : [...(card.labels ?? []), label],
        }));
      });

    this.boardSocketService.cardLabelRemoved$
      .pipe(takeUntilDestroyed())
      .subscribe(({ cardId, labelId, boardId }) => {
        if (this.currentBoard?.id === boardId) {
          this.updateCardFromSocket(cardId, (card) => ({
            ...card,
            labels: (card.labels ?? []).filter((item) => item.labelId !== labelId),
          }));
        }
      });

    this.boardSocketService.cardMemberAdded$
      .pipe(takeUntilDestroyed())
      .subscribe(({ cardId, user, boardId }) => {
        if (this.currentBoard?.id !== boardId) {
          return;
        }

        this.updateCardFromSocket(cardId, (card) => ({
          ...card,
          members: (card.members ?? []).some((member) => member.userId === user.id)
            ? card.members
            : [
                ...(card.members ?? []),
                { id: `${cardId}:${user.id}`, cardId, userId: user.id, user },
              ],
        }));
      });

    this.boardSocketService.cardMemberRemoved$
      .pipe(takeUntilDestroyed())
      .subscribe(({ cardId, userId, boardId }) => {
        if (this.currentBoard?.id === boardId) {
          this.updateCardFromSocket(cardId, (card) => ({
            ...card,
            members: (card.members ?? []).filter((member) => member.userId !== userId),
          }));
        }
      });

    this.boardSocketService.attachmentAdded$
      .pipe(takeUntilDestroyed())
      .subscribe(({ attachment, cardId, boardId }) => {
        if (this.currentBoard?.id !== boardId) {
          return;
        }

        this.updateCardFromSocket(cardId, (card) => ({
          ...card,
          attachments: (card.attachments ?? []).some((item) => item.id === attachment.id)
            ? card.attachments
            : [...(card.attachments ?? []), attachment],
        }));
      });

    this.boardSocketService.attachmentDeleted$
      .pipe(takeUntilDestroyed())
      .subscribe(({ attachmentId, cardId, boardId }) => {
        if (this.currentBoard?.id === boardId) {
          this.updateCardFromSocket(cardId, (card) => ({
            ...card,
            attachments: (card.attachments ?? []).filter((item) => item.id !== attachmentId),
          }));
        }
      });

    this.boardSocketService.memberJoined$
      .pipe(takeUntilDestroyed())
      .subscribe(({ user, role, boardId }) => {
        if (!this.currentBoard || this.currentBoard.id !== boardId) {
          return;
        }

        const members = this.currentBoard.members ?? [];

        if (members.some((member) => member.userId === user.id)) {
          return;
        }

        const member: BoardMember = {
          id: `${boardId}:${user.id}`,
          boardId,
          userId: user.id,
          role,
          user,
        };
        const updatedBoard = { ...this.currentBoard, members: [...members, member] };
        this.currentBoard = updatedBoard;
        this.store.dispatch(updateBoard({ board: updatedBoard }));
        this.cdr.markForCheck();
      });

    this.route.paramMap
      .pipe(
        map((params) => params.get('boardId')),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((boardId) => {
        if (boardId) {
          this.hasBoardRoute = true;
          if (boardId !== this.lastCommentsBoardId) {
            this.resetBoardComments();
            this.lastCommentsBoardId = boardId;
          }
          this.store.dispatch(loadBoard({ boardId }));
          return;
        }

        this.hasBoardRoute = false;
        this.resetBoardComments();
        this.cdr.markForCheck();
      });
  }

  createList(boardId: string): void {
    if (this.listForm.invalid) {
      this.listForm.markAllAsTouched();
      return;
    }

    const { title } = this.listForm.getRawValue();
    this.store.dispatch(createList({ boardId, title }));
    this.listForm.reset();
    this.showNewListForm = false;
  }

  toggleNewListForm(): void {
    this.showNewListForm = !this.showNewListForm;
    this.listForm.reset();
  }

  toggleMobileToolbar(event: MouseEvent): void {
    event.stopPropagation();
    this.mobileToolbarOpen = !this.mobileToolbarOpen;
  }

  @HostListener('document:click')
  closeMobileToolbar(): void {
    this.mobileToolbarOpen = false;
  }

  @HostListener('document:keydown.escape')
  closeMobileToolbarOnEscape(): void {
    this.mobileToolbarOpen = false;
  }

  @HostListener('window:resize')
  handleViewportResize(): void {
    this.isMobileViewport = window.innerWidth < 640;
    this.updateScrollControls();
  }

  startBoardEdit(board: BoardModel): void {
    this.mobileToolbarOpen = false;
    this.editingBoardHeader = true;
    this.pendingBoardBackgroundColor = board.backgroundColor ?? null;
    this.boardEditForm.setValue({
      title: board.title,
      description: board.description ?? '',
    });
  }

  cancelBoardEdit(): void {
    this.editingBoardHeader = false;
    this.pendingBoardBackgroundColor = null;
    this.boardEditForm.reset();
  }

  saveBoardEdit(boardId: string): void {
    if (this.boardEditForm.invalid) {
      this.boardEditForm.markAllAsTouched();
      return;
    }

    const { title, description } = this.boardEditForm.getRawValue();
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      this.boardEditForm.markAllAsTouched();
      return;
    }

    this.store.dispatch(
      updateBoardDetails({
        boardId,
        title: trimmedTitle,
        description: description.trim() || undefined,
        backgroundColor: this.pendingBoardBackgroundColor,
      }),
    );
    this.cancelBoardEdit();
  }

  async deleteCurrentBoard(boardId: string): Promise<void> {
    this.mobileToolbarOpen = false;
    if (!(await this.confirmModalService.confirm('Brisanje boarda', 'Da li ste sigurni da želite da obrišete board?'))) {
      return;
    }

    this.store.dispatch(deleteBoard({ boardId }));
  }

  renameList(event: { listId: string; title: string }): void {
    if (this.renamingListId) {
      return;
    }

    this.renamingListId = event.listId;
    this.listRenameErrors = {
      ...this.listRenameErrors,
      [event.listId]: null,
    };
    this.cdr.markForCheck();

    this.listService
      .updateList(event.listId, { title: event.title })
      .pipe(
        take(1),
        finalize(() => {
          this.renamingListId = null;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (list) => {
          this.store.dispatch(updateListSuccess({ list }));
          this.cdr.markForCheck();
        },
        error: () => {
          this.listRenameErrors = {
            ...this.listRenameErrors,
            [event.listId]: 'Naziv liste nije sacuvan.',
          };
          this.cdr.markForCheck();
        },
      });
  }

  removeList(listId: string): void {
    this.store.dispatch(deleteList({ listId }));
  }

  createCard(event: { listId: string; title: string; description?: string }): void {
    this.store.dispatch(createCard(event));
  }

  openCard(card: Card): void {
    this.selectedCard = card;
    this.cardTitleSaving = false;
    this.cardTitleError = null;
    this.memberAssignmentError = null;
    this.memberAssignmentSaving = false;
    this.attachmentUploading = false;
    this.attachmentDeletingId = null;
    this.attachmentError = null;
    this.labelError = null;
    this.loadComments(card.id);
    this.cdr.markForCheck();
  }

  closeCard(): void {
    this.selectedCard = null;
    this.activeCommentsLoadCardId = null;
    this.commentsLoading = false;
    this.commentsError = null;
    this.cardTitleSaving = false;
    this.cardTitleError = null;
    this.memberAssignmentSaving = false;
    this.memberAssignmentError = null;
    this.attachmentUploading = false;
    this.attachmentDeletingId = null;
    this.attachmentError = null;
    this.labelError = null;
    this.cardAppearanceError = null;
    this.cdr.markForCheck();
  }

  saveCard(event: { cardId: string; title: string; description?: string }): void {
    this.store.dispatch(updateCard(event));
    this.closeCard();
  }

  saveCardTitle(event: { cardId: string; title: string }): void {
    if (!this.selectedCard || this.cardTitleSaving) {
      return;
    }

    this.cardTitleError = null;
    this.cardTitleSaving = true;
    this.cdr.markForCheck();

    this.cardService
      .updateCard(event.cardId, { title: event.title })
      .pipe(
        take(1),
        finalize(() => {
          this.cardTitleSaving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (card) => {
          if (!this.selectedCard) {
            return;
          }

          const updatedCard = {
            ...this.selectedCard,
            ...card,
          };

          this.selectedCard = updatedCard;
          this.store.dispatch(updateCardSuccess({ card: updatedCard }));
          this.cdr.markForCheck();
        },
        error: () => {
          this.cardTitleError = 'Naziv kartice nije sacuvan.';
          this.cdr.markForCheck();
        },
      });
  }

  updateCardDone(event: { cardId: string; isDone: boolean }): void {
    this.updateCardAppearance(event.cardId, { isDone: event.isDone });
  }

  updateCardCover(event: { cardId: string; coverColor: string | null }): void {
    this.updateCardAppearance(event.cardId, { coverColor: event.coverColor });
  }

  updateListAccent(event: { listId: string; accentColor: string | null }): void {
    if (this.listAppearanceSavingId) {
      return;
    }

    this.listAppearanceSavingId = event.listId;
    this.listService
      .updateList(event.listId, { accentColor: event.accentColor })
      .pipe(
        take(1),
        finalize(() => {
          this.listAppearanceSavingId = null;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (list) => this.store.dispatch(updateListSuccess({ list })),
        error: () => this.cdr.markForCheck(),
      });
  }

  selectPendingBoardBackground(backgroundColor: string | null): void {
    this.pendingBoardBackgroundColor = backgroundColor;
  }

  boardBackgroundPreview(value: string | null | undefined): string | null {
    return this.boardBackgrounds.find((option) => option.value === (value ?? null))?.preview ?? null;
  }

  getBoardCardStats(board: BoardModel): { total: number; done: number; percentage: number } {
    const stats = (board.lists ?? []).reduce(
      (acc, list) => {
        const cards = list.cards ?? [];

        acc.total += cards.length;
        acc.done += cards.reduce(
          (doneCount, card) => doneCount + (card.isDone ? 1 : 0),
          0,
        );

        return acc;
      },
      { total: 0, done: 0 },
    );

    return {
      ...stats,
      percentage: stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0,
    };
  }

  removeCard(event: { cardId: string; listId: string }): void {
    this.store.dispatch(deleteCard({ cardId: event.cardId }));
    this.closeCard();
  }

  createComment(event: { cardId: string; content: string }): void {
    const content = event.content.trim();

    if (!content) {
      return;
    }

    this.commentsError = null;
    this.commentSaving = true;
    this.commentService
      .createComment(event.cardId, content)
      .pipe(
        take(1),
        finalize(() => {
          this.commentSaving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (comment) => {
          const currentComments = this.getCommentsForCard(event.cardId);

          if (!currentComments.some((item) => item.id === comment.id)) {
            this.commentsMutationVersion++;
            this.commentsByCardId = {
              ...this.commentsByCardId,
              [event.cardId]: [...currentComments, comment],
            };
          }
          this.cdr.markForCheck();
        },
        error: () => {
          this.setCommentsError(event.cardId, 'Komentar nije sacuvan.');
          this.cdr.markForCheck();
        },
      });
  }

  updateComment(event: { cardId: string; commentId: string; content: string }): void {
    const content = event.content.trim();

    if (!content) {
      return;
    }

    this.commentsError = null;
    this.commentSaving = true;
    this.commentService
      .updateComment(event.commentId, content)
      .pipe(
        take(1),
        finalize(() => {
          this.commentSaving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (updatedComment) => {
          const currentComments = this.getCommentsForCard(event.cardId);

          this.commentsMutationVersion++;
          this.commentsByCardId = {
            ...this.commentsByCardId,
            [event.cardId]: currentComments.map((comment) =>
              comment.id === updatedComment.id ? updatedComment : comment,
            ),
          };
          this.cdr.markForCheck();
        },
        error: () => {
          this.setCommentsError(event.cardId, 'Komentar nije izmenjen.');
          this.cdr.markForCheck();
        },
      });
  }

  deleteComment(event: { cardId: string; commentId: string }): void {
    this.commentsError = null;
    this.commentSaving = true;
    this.commentService
      .deleteComment(event.commentId)
      .pipe(
        take(1),
        finalize(() => {
          this.commentSaving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (deletedComment) => {
          const currentComments = this.getCommentsForCard(event.cardId);

          this.commentsMutationVersion++;
          this.commentsByCardId = {
            ...this.commentsByCardId,
            [event.cardId]: currentComments.filter((comment) => comment.id !== deletedComment.id),
          };
          this.cdr.markForCheck();
        },
        error: () => {
          this.setCommentsError(event.cardId, 'Komentar nije obrisan.');
          this.cdr.markForCheck();
        },
      });
  }

  assignCardMember(event: { cardId: string; userId: string }): void {
    if (!this.selectedCard || this.memberAssignmentSaving) {
      return;
    }

    this.memberAssignmentError = null;
    this.memberAssignmentSaving = true;
    this.cardService
      .assignCardMember(event.cardId, event.userId)
      .pipe(
        take(1),
        finalize(() => {
          this.memberAssignmentSaving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (cardMember) => {
          const members = this.selectedCard?.members ?? [];

          if (!members.some((member) => member.userId === cardMember.userId)) {
            this.applySelectedCardMembers([...members, cardMember]);
          }

          this.cdr.markForCheck();
        },
        error: (error: unknown) => {
          this.memberAssignmentError = this.getMemberAssignmentError(error, 'Clan nije dodeljen kartici.');
          this.cdr.markForCheck();
        },
      });
  }

  unassignCardMember(event: { cardId: string; userId: string }): void {
    if (!this.selectedCard || this.memberAssignmentSaving) {
      return;
    }

    this.memberAssignmentError = null;
    this.memberAssignmentSaving = true;
    this.cardService
      .unassignCardMember(event.cardId, event.userId)
      .pipe(
        take(1),
        finalize(() => {
          this.memberAssignmentSaving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          const members = this.selectedCard?.members ?? [];
          this.applySelectedCardMembers(members.filter((member) => member.userId !== event.userId));
          this.cdr.markForCheck();
        },
        error: (error: unknown) => {
          this.memberAssignmentError = this.getMemberAssignmentError(error, 'Clan nije uklonjen sa kartice.');
          this.cdr.markForCheck();
        },
      });
  }

  canManageBoardLabels(board: BoardModel): boolean {
    const role = board.members?.find((member) => member.userId === this.currentUser?.id)?.role;

    return role === 'OWNER' || role === 'ADMIN';
  }

  toggleCardLabel(event: { cardId: string; labelId: string; assigned: boolean }): void {
    if (!this.selectedCard || this.labelSaving) {
      return;
    }

    this.labelSaving = true;
    this.labelError = null;
    const request$ = event.assigned
      ? this.labelService.addLabelToCard(event.cardId, event.labelId)
      : this.labelService.removeLabelFromCard(event.cardId, event.labelId);

    request$
      .pipe(
        take(1),
        finalize(() => {
          this.labelSaving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (cardLabel) => {
          const labels = this.selectedCard?.labels ?? [];
          const nextLabels = event.assigned
            ? labels.some((item) => item.labelId === cardLabel.labelId)
              ? labels
              : [...labels, cardLabel]
            : labels.filter((item) => item.labelId !== event.labelId);

          this.applySelectedCardLabels(nextLabels);
          this.cdr.markForCheck();
        },
        error: (error: unknown) => {
          this.labelError = this.getLabelError(error, 'Labela na kartici nije izmenjena.');
          this.cdr.markForCheck();
        },
      });
  }

  createBoardLabel(event: { name: string; color: string }): void {
    if (!this.currentBoard || this.labelSaving) {
      return;
    }

    this.labelSaving = true;
    this.labelError = null;
    this.labelService
      .createLabel(this.currentBoard.id, event.name, event.color)
      .pipe(
        take(1),
        finalize(() => {
          this.labelSaving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (label) => this.updateBoardLabelState([...this.boardLabels, label]),
        error: (error: unknown) => {
          this.labelError = this.getLabelError(error, 'Labela nije kreirana.');
          this.cdr.markForCheck();
        },
      });
  }

  updateBoardLabel(event: { labelId: string; name: string; color: string }): void {
    if (!this.currentBoard || this.labelSaving) {
      return;
    }

    this.labelSaving = true;
    this.labelError = null;
    this.labelService
      .updateLabel(event.labelId, event.name, event.color)
      .pipe(
        take(1),
        finalize(() => {
          this.labelSaving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (label) => {
          this.updateBoardLabelState(
            this.boardLabels.map((item) => (item.id === label.id ? label : item)),
            (cardLabel) =>
              cardLabel.labelId === label.id ? { ...cardLabel, label } : cardLabel,
          );
        },
        error: (error: unknown) => {
          this.labelError = this.getLabelError(error, 'Labela nije izmenjena.');
          this.cdr.markForCheck();
        },
      });
  }

  async deleteBoardLabel(labelId: string): Promise<void> {
    if (!this.currentBoard || this.labelSaving) {
      return;
    }

    if (!(await this.confirmModalService.confirm('Brisanje labele', 'Da li želite da obrišete ovu labelu?'))) {
      return;
    }

    this.labelSaving = true;
    this.labelError = null;
    this.labelService
      .deleteLabel(labelId)
      .pipe(
        take(1),
        finalize(() => {
          this.labelSaving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.updateBoardLabelState(
            this.boardLabels.filter((label) => label.id !== labelId),
            (cardLabel) => (cardLabel.labelId === labelId ? null : cardLabel),
          );
        },
        error: (error: unknown) => {
          this.labelError = this.getLabelError(error, 'Labela nije obrisana.');
          this.cdr.markForCheck();
        },
      });
  }

  uploadCardAttachment(event: { cardId: string; file: File }): void {
    if (!this.selectedCard || this.selectedCard.id !== event.cardId || this.attachmentUploading) {
      return;
    }

    this.attachmentError = null;
    this.attachmentUploading = true;
    this.cardService
      .uploadCardAttachment(event.cardId, event.file)
      .pipe(
        take(1),
        finalize(() => {
          this.attachmentUploading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (attachment) => {
          const attachments = this.selectedCard?.attachments ?? [];

          if (!attachments.some((item) => item.id === attachment.id)) {
            this.applySelectedCardAttachments([...attachments, attachment]);
          }

          this.cdr.markForCheck();
        },
        error: (error: unknown) => {
          this.attachmentError = this.getAttachmentError(error, 'Attachment nije uploadovan.');
          this.cdr.markForCheck();
        },
      });
  }

  deleteCardAttachment(event: { cardId: string; attachmentId: string }): void {
    if (!this.selectedCard || this.selectedCard.id !== event.cardId || this.attachmentDeletingId) {
      return;
    }

    this.attachmentError = null;
    this.attachmentDeletingId = event.attachmentId;
    this.cardService
      .deleteAttachment(event.attachmentId)
      .pipe(
        take(1),
        finalize(() => {
          this.attachmentDeletingId = null;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          const attachments = this.selectedCard?.attachments ?? [];
          this.applySelectedCardAttachments(attachments.filter((attachment) => attachment.id !== event.attachmentId));
          this.cdr.markForCheck();
        },
        error: (error: unknown) => {
          this.attachmentError = this.getAttachmentError(error, 'Attachment nije obrisan.');
          this.cdr.markForCheck();
        },
      });
  }

  canManageCardAssignments(board: BoardModel): boolean {
    if (!this.currentUser) {
      return false;
    }

    const role = board.members?.find((member) => member.userId === this.currentUser?.id)?.role;

    return role === 'OWNER' || role === 'ADMIN' || role === 'MEMBER';
  }

  cardDropListIds(lists: BoardList[] | null | undefined): string[] {
    return (lists ?? []).map((list) => list.id);
  }

  showPreviousMobileList(lists: BoardList[]): void {
    if (this.activeMobileListIndex > 0) {
      this.activeMobileListIndex--;
    }
  }

  showNextMobileList(lists: BoardList[]): void {
    if (this.activeMobileListIndex < lists.length - 1) {
      this.activeMobileListIndex++;
    }
  }

  scrollBoard(direction: -1 | 1): void {
    this.boardScroller?.nativeElement.scrollBy({ left: direction * 336, behavior: 'smooth' });
  }

  updateScrollControls(): void {
    const scroller = this.boardScroller?.nativeElement;

    if (!scroller) {
      this.canScrollBoardLeft = false;
      this.canScrollBoardRight = false;
      return;
    }

    const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
    this.canScrollBoardLeft = scroller.scrollLeft > 4;
    this.canScrollBoardRight = maxScrollLeft - scroller.scrollLeft > 4;
    this.cdr.markForCheck();
  }

  handleBoardWheel(event: WheelEvent): void {
    const scroller = this.boardScroller?.nativeElement;

    if (!scroller || !event.shiftKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
      return;
    }

    event.preventDefault();
    scroller.scrollLeft += event.deltaY;
  }

  dropList(event: CdkDragDrop<BoardList[]>, boardId: string, lists: BoardList[]): void {
    if (event.previousIndex === event.currentIndex) {
      return;
    }

    const reorderedLists = [...lists];
    moveItemInArray(reorderedLists, event.previousIndex, event.currentIndex);

    this.store.dispatch(
      reorderLists({
        boardId,
        items: reorderedLists.map((list, index) => ({
          id: list.id,
          position: index + 1,
        })),
      }),
    );
  }

  private syncMobileListIndex(lists: BoardList[]): void {
    this.activeMobileListIndex = lists.length === 0
      ? 0
      : Math.min(this.activeMobileListIndex, lists.length - 1);
  }

  private updateCardAppearance(
    cardId: string,
    changes: { isDone?: boolean; coverColor?: string | null },
  ): void {
    if (this.cardAppearanceSaving) {
      return;
    }

    this.cardAppearanceSaving = true;
    this.cardAppearanceError = null;
    this.cardService
      .updateCard(cardId, changes)
      .pipe(
        take(1),
        finalize(() => {
          this.cardAppearanceSaving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (card) => {
          this.store.dispatch(updateCardSuccess({ card }));
          if (this.selectedCard?.id === card.id) {
            this.selectedCard = { ...this.selectedCard, ...card };
          }
        },
        error: () => {
          this.cardAppearanceError = 'Status ili boja kartice nisu sacuvani.';
        },
      });
  }

  private scheduleScrollStateUpdate(): void {
    if (typeof requestAnimationFrame === 'undefined') {
      return;
    }

    requestAnimationFrame(() => this.updateScrollControls());
  }

  dropCard(event: CdkDragDrop<Card[]>, boardId: string): void {
    const targetListId = event.container.id;
    const previousListId = event.previousContainer.id;

    if (
      previousListId === targetListId &&
      event.previousIndex === event.currentIndex
    ) {
      return;
    }

    if (event.previousContainer === event.container) {
      const cards = [...event.container.data];
      moveItemInArray(cards, event.previousIndex, event.currentIndex);

      this.store.dispatch(
        reorderCards({
          boardId,
          items: cards.map((card, index) => ({
            id: card.id,
            listId: targetListId,
            position: index + 1,
          })),
        }),
      );
      return;
    }

    const previousCards = [...event.previousContainer.data];
    const targetCards = [...event.container.data];
    transferArrayItem(previousCards, targetCards, event.previousIndex, event.currentIndex);

    this.store.dispatch(
      reorderCards({
        boardId,
        items: [
          ...previousCards.map((card, index) => ({
            id: card.id,
            listId: previousListId,
            position: index + 1,
          })),
          ...targetCards.map((card, index) => ({
            id: card.id,
            listId: targetListId,
            position: index + 1,
          })),
        ],
      }),
    );
  }

  private loadComments(cardId: string): void {
    this.activeCommentsLoadCardId = cardId;
    this.commentsLoading = true;
    this.commentsError = null;
    const loadMutationVersion = this.commentsMutationVersion;
    this.cdr.markForCheck();

    this.commentService
      .getComments(cardId)
      .pipe(
        take(1),
        finalize(() => {
          if (this.activeCommentsLoadCardId === cardId) {
            this.commentsLoading = false;
            this.cdr.markForCheck();
          }
        }),
      )
      .subscribe({
        next: (comments) => {
          const nextComments =
            loadMutationVersion === this.commentsMutationVersion
              ? comments
              : this.mergeLoadedCommentsForCard(cardId, comments);

          this.commentsByCardId = {
            ...this.commentsByCardId,
            [cardId]: nextComments,
          };
          this.cdr.markForCheck();
        },
        error: () => {
          if (this.activeCommentsLoadCardId !== cardId && this.selectedCard?.id !== cardId) {
            return;
          }

          this.commentsError = 'Komentari nisu ucitani.';
          this.cdr.markForCheck();
        },
      });
  }

  private getCommentsForCard(cardId: string): CardComment[] {
    return this.commentsByCardId[cardId] ?? [];
  }

  private setCommentsError(cardId: string, message: string): void {
    if (!this.selectedCard || this.selectedCard.id === cardId) {
      this.commentsError = message;
    }
  }

  private resetBoardComments(): void {
    this.commentsByCardId = {};
    this.commentsLoading = false;
    this.commentSaving = false;
    this.commentsError = null;
    this.activeCommentsLoadCardId = null;
    this.commentsMutationVersion++;
    this.cdr.markForCheck();
  }

  private applySelectedCardMembers(members: CardMember[]): void {
    if (!this.selectedCard) {
      return;
    }

    const updatedCard = {
      ...this.selectedCard,
      members,
    };

    this.selectedCard = updatedCard;
    this.store.dispatch(updateCardSuccess({ card: updatedCard }));
  }

  private applySelectedCardAttachments(attachments: Attachment[]): void {
    if (!this.selectedCard) {
      return;
    }

    const updatedCard = {
      ...this.selectedCard,
      attachments,
    };

    this.selectedCard = updatedCard;
    this.store.dispatch(updateCardSuccess({ card: updatedCard }));
  }

  private applySelectedCardLabels(labels: CardLabel[]): void {
    if (!this.selectedCard) {
      return;
    }

    const updatedCard = { ...this.selectedCard, labels };
    this.selectedCard = updatedCard;
    this.store.dispatch(updateCardSuccess({ card: updatedCard }));
  }

  private updateCardFromSocket(cardId: string, update: (card: Card) => Card): void {
    const card = this.currentBoard?.lists
      ?.flatMap((list) => list.cards ?? [])
      .find((item) => item.id === cardId);

    if (!card) {
      return;
    }

    const updatedCard = update(card);

    if (this.selectedCard?.id === cardId) {
      this.selectedCard = updatedCard;
    }

    this.store.dispatch(updateCardSuccess({ card: updatedCard }));
    this.cdr.markForCheck();
  }

  private updateBoardLabelState(
    labels: Label[],
    updateCardLabel?: (cardLabel: CardLabel) => CardLabel | null,
  ): void {
    if (!this.currentBoard) {
      return;
    }

    const updatedBoard: BoardModel = {
      ...this.currentBoard,
      labels: [...labels].sort((left, right) => left.name.localeCompare(right.name)),
      lists: (this.currentBoard.lists ?? []).map((list) => ({
        ...list,
        cards: (list.cards ?? []).map((card) => ({
          ...card,
          labels: updateCardLabel
            ? (card.labels ?? [])
                .map(updateCardLabel)
                .filter((item): item is CardLabel => item !== null)
            : card.labels,
        })),
      })),
    };

    this.currentBoard = updatedBoard;
    this.boardLabels = updatedBoard.labels ?? [];

    if (this.selectedCard) {
      const selectedCard = updatedBoard.lists
        ?.flatMap((list) => list.cards ?? [])
        .find((card) => card.id === this.selectedCard?.id);

      if (selectedCard) {
        this.selectedCard = selectedCard;
      }
    }

    this.store.dispatch(updateBoard({ board: updatedBoard }));
    this.cdr.markForCheck();
  }

  private hydrateCardLabels(board: BoardModel): void {
    const cards = (board.lists ?? [])
      .flatMap((list) => list.cards ?? [])
      .filter((card) => card.labels === undefined && !this.requestedLabelCardIds.has(card.id));

    if (cards.length === 0) {
      return;
    }

    cards.forEach((card) => this.requestedLabelCardIds.add(card.id));
    forkJoin(
      cards.map((card) =>
        this.cardService.getCard(card.id).pipe(catchError(() => of(null))),
      ),
    )
      .pipe(take(1))
      .subscribe((loadedCards) => {
        loadedCards.forEach((card) => {
          if (card) {
            this.store.dispatch(updateCardSuccess({ card }));
          }
        });
        this.cdr.markForCheck();
      });
  }

  private getLabelError(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 403) {
        return 'Nemas dozvolu za ovu izmenu labele.';
      }

      if (error.status === 409) {
        return 'Labela je vec dodata ovoj kartici.';
      }
    }

    return fallback;
  }

  private getMemberAssignmentError(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 400) {
        return 'Samo clan boarda moze biti dodeljen kartici.';
      }

      if (error.status === 403) {
        return 'Nemas dozvolu da menjas clanove kartice.';
      }

      if (error.status === 409) {
        return 'Clan je vec dodeljen ovoj kartici.';
      }
    }

    return fallback;
  }

  private getAttachmentError(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 400) {
        return 'Dozvoljeni su JPG, PNG, WEBP i PDF fajlovi do 10MB.';
      }

      if (error.status === 403) {
        return 'Nemas dozvolu za attachment na ovoj kartici.';
      }

      if (error.status === 413) {
        return 'Fajl je prevelik. Maksimalna velicina je 10MB.';
      }
    }

    return fallback;
  }

  private mergeLoadedCommentsForCard(cardId: string, loadedComments: CardComment[]): CardComment[] {
    const currentComments = this.commentsByCardId[cardId] ?? [];
    const loadedCommentIds = new Set(loadedComments.map((comment) => comment.id));
    const localOnlyComments = currentComments.filter((comment) => !loadedCommentIds.has(comment.id));
    const currentCommentsById = new Map(currentComments.map((comment) => [comment.id, comment]));

    return [
      ...loadedComments.map((comment) => currentCommentsById.get(comment.id) ?? comment),
      ...localOnlyComments,
    ];
  }
}
