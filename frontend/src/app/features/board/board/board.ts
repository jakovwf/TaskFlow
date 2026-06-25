import { AsyncPipe } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { catchError, combineLatest, distinctUntilChanged, finalize, forkJoin, map, of, take } from 'rxjs';
import { CommentService } from '../../../core/services/comment';
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
  updateBoardDetails,
  updateList,
} from '../../../store/boards/boards.actions';
import { selectCurrentUser } from '../../../store/auth/auth.selectors';
import {
  selectBoardsError,
  selectBoardsLoading,
  selectSelectedBoard,
} from '../../../store/boards/boards.selectors';
import { Board as BoardModel, BoardList, Card, CardComment } from '../../../store/models';
import { BoardListComponent } from '../components/board-list/board-list';
import { CardDetailComponent } from '../components/card-detail/card-detail';

@Component({
  selector: 'app-board',
  imports: [AsyncPipe, BoardListComponent, CardDetailComponent, DragDropModule, ReactiveFormsModule, RouterLink],
  templateUrl: './board.html',
  styleUrl: './board.scss',
})
export class Board {
  private readonly formBuilder = inject(FormBuilder);
  private readonly commentService = inject(CommentService);
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(Store);

  readonly board$ = this.store.select(selectSelectedBoard);
  readonly loading$ = this.store.select(selectBoardsLoading);
  readonly error$ = this.store.select(selectBoardsError);
  readonly boardContext$ = combineLatest({
    board: this.board$,
    currentUser: this.store.select(selectCurrentUser),
  });
  readonly currentUser$ = this.store.select(selectCurrentUser);
  selectedCard: Card | null = null;
  commentsByCardId: Partial<Record<string, CardComment[]>> = {};
  commentsLoading = false;
  commentsError: string | null = null;
  editingBoardHeader = false;
  hasBoardRoute = false;
  private lastCommentsBoardId: string | null = null;
  private lastCommentsCardIdsKey = '';
  private commentsMutationVersion = 0;

  readonly listForm = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(1)]],
  });

  readonly boardEditForm = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(1)]],
    description: [''],
  });

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('boardId')),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((boardId) => {
        if (boardId) {
          this.hasBoardRoute = true;
          this.store.dispatch(loadBoard({ boardId }));
          return;
        }

        this.hasBoardRoute = false;
      });

    this.board$
      .pipe(takeUntilDestroyed())
      .subscribe((board) => this.loadCommentsForBoard(board));
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
    this.store.dispatch(updateList(event));
  }

  removeList(listId: string): void {
    this.store.dispatch(deleteList({ listId }));
  }

  createCard(event: { listId: string; title: string; description?: string }): void {
    this.store.dispatch(createCard(event));
  }

  openCard(card: Card): void {
    this.selectedCard = card;
  }

  closeCard(): void {
    this.selectedCard = null;
  }

  saveCard(event: { cardId: string; title: string; description?: string }): void {
    this.store.dispatch(updateCard(event));
    this.closeCard();
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
    this.commentService
      .createComment(event.cardId, content)
      .pipe(take(1))
      .subscribe({
        next: (comment) => {
          const currentComments = this.getCommentsForCard(event.cardId);

          this.commentsMutationVersion++;
          this.commentsByCardId = {
            ...this.commentsByCardId,
            [event.cardId]: [...currentComments, comment],
          };
        },
        error: () => {
          this.commentsError = 'Komentar nije sacuvan.';
        },
      });
  }

  updateComment(event: { cardId: string; commentId: string; content: string }): void {
    const content = event.content.trim();

    if (!content) {
      return;
    }

    this.commentsError = null;
    this.commentService
      .updateComment(event.commentId, content)
      .pipe(take(1))
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
        },
        error: () => {
          this.commentsError = 'Komentar nije izmenjen.';
        },
      });
  }

  deleteComment(event: { cardId: string; commentId: string }): void {
    this.commentsError = null;
    this.commentService
      .deleteComment(event.commentId)
      .pipe(take(1))
      .subscribe({
        next: (deletedComment) => {
          const currentComments = this.getCommentsForCard(event.cardId);

          this.commentsMutationVersion++;
          this.commentsByCardId = {
            ...this.commentsByCardId,
            [event.cardId]: currentComments.filter((comment) => comment.id !== deletedComment.id),
          };
        },
        error: () => {
          this.commentsError = 'Komentar nije obrisan.';
        },
      });
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

  private loadCommentsForBoard(board: BoardModel | null): void {
    if (!board) {
      this.resetBoardComments();
      return;
    }

    const cards = this.getBoardCards(board);
    const cardIdsKey = cards.map((card) => card.id).sort().join('|');

    if (board.id !== this.lastCommentsBoardId) {
      this.resetBoardComments();
      this.lastCommentsBoardId = board.id;
    }

    if (!cards.length) {
      this.commentsByCardId = {};
      this.commentsLoading = false;
      this.commentsError = null;
      this.lastCommentsCardIdsKey = '';
      return;
    }

    if (cardIdsKey === this.lastCommentsCardIdsKey) {
      return;
    }

    this.lastCommentsCardIdsKey = cardIdsKey;
    this.commentsLoading = true;
    this.commentsError = null;
    const loadMutationVersion = this.commentsMutationVersion;

    forkJoin(
      cards.map((card) =>
        this.commentService.getComments(card.id).pipe(
          take(1),
          catchError(() => {
            this.commentsError = 'Neki komentari nisu ucitani.';
            return of([]);
          }),
          map((comments) => [card.id, comments] as const),
        ),
      ),
    )
      .pipe(
        finalize(() => {
          if (board.id === this.lastCommentsBoardId && cardIdsKey === this.lastCommentsCardIdsKey) {
            this.commentsLoading = false;
          }
        }),
      )
      .subscribe({
        next: (entries) => {
          if (board.id !== this.lastCommentsBoardId || cardIdsKey !== this.lastCommentsCardIdsKey) {
            return;
          }

          this.commentsByCardId =
            loadMutationVersion === this.commentsMutationVersion
              ? Object.fromEntries(entries)
              : this.mergeLoadedComments(entries);
        },
        error: () => {
          if (board.id !== this.lastCommentsBoardId || cardIdsKey !== this.lastCommentsCardIdsKey) {
            return;
          }

          this.commentsByCardId = {};
          this.lastCommentsCardIdsKey = '';
          this.commentsError = 'Komentari nisu ucitani.';
        },
      });
  }

  private getBoardCards(board: BoardModel): Card[] {
    return (board.lists ?? []).flatMap((list) => list.cards ?? []);
  }

  private getCommentsForCard(cardId: string): CardComment[] {
    return this.commentsByCardId[cardId] ?? [];
  }

  private resetBoardComments(): void {
    this.commentsByCardId = {};
    this.commentsLoading = false;
    this.commentsError = null;
    this.lastCommentsBoardId = null;
    this.lastCommentsCardIdsKey = '';
    this.commentsMutationVersion++;
  }

  private mergeLoadedComments(entries: readonly (readonly [string, CardComment[]])[]): Partial<Record<string, CardComment[]>> {
    const loadedCommentsByCardId = Object.fromEntries(entries);
    const nextCommentsByCardId: Partial<Record<string, CardComment[]>> = {
      ...this.commentsByCardId,
    };

    for (const [cardId, loadedComments] of entries) {
      const currentComments = this.commentsByCardId[cardId] ?? [];
      const loadedCommentIds = new Set(loadedComments.map((comment) => comment.id));
      const localOnlyComments = currentComments.filter((comment) => !loadedCommentIds.has(comment.id));
      const currentCommentsById = new Map(currentComments.map((comment) => [comment.id, comment]));

      nextCommentsByCardId[cardId] = [
        ...loadedComments.map((comment) => currentCommentsById.get(comment.id) ?? comment),
        ...localOnlyComments,
      ];
    }

    return {
      ...loadedCommentsByCardId,
      ...nextCommentsByCardId,
    };
  }
}
