import { AsyncPipe } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { combineLatest, distinctUntilChanged, finalize, map, take } from 'rxjs';
import { CommentService } from '../../../core/services/comment';
import { CardService } from '../../../core/services/card';
import { ListService } from '../../../core/services/list';
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
import { Board as BoardModel, BoardList, Card, CardComment, CardMember, User } from '../../../store/models';
import { BoardListComponent } from '../components/board-list/board-list';
import { CardDetailComponent } from '../components/card-detail/card-detail';

@Component({
  selector: 'app-board',
  imports: [AsyncPipe, BoardListComponent, CardDetailComponent, DragDropModule, ReactiveFormsModule, RouterLink],
  templateUrl: './board.html',
  styleUrl: './board.scss',
})
export class Board {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly cardService = inject(CardService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly commentService = inject(CommentService);
  private readonly listService = inject(ListService);
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
  renamingListId: string | null = null;
  listRenameErrors: Record<string, string | null> = {};
  editingBoardHeader = false;
  hasBoardRoute = false;
  private lastCommentsBoardId: string | null = null;
  private activeCommentsLoadCardId: string | null = null;
  private commentsMutationVersion = 0;

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
  }

  startBoardEdit(board: BoardModel): void {
    this.editingBoardHeader = true;
    this.boardEditForm.setValue({
      title: board.title,
      description: board.description ?? '',
    });
  }

  cancelBoardEdit(): void {
    this.editingBoardHeader = false;
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
      }),
    );
    this.cancelBoardEdit();
  }

  deleteCurrentBoard(boardId: string): void {
    if (!confirm('Da li ste sigurni da zelite da obrisete board?')) {
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

          this.commentsMutationVersion++;
          this.commentsByCardId = {
            ...this.commentsByCardId,
            [event.cardId]: [...currentComments, comment],
          };
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
