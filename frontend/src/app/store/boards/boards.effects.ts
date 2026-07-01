import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, concatMap, exhaustMap, map, merge, mergeMap, of, switchMap, takeUntil, tap } from 'rxjs';
import { BoardSocketService } from '../../core/services/board-socket.service';
import { BoardService } from '../../core/services/board';
import { CardService } from '../../core/services/card';
import { ListService } from '../../core/services/list';
import { SocketService } from '../../core/services/socket.service';
import {
  cardCreatedRemotely,
  boardUpdatedRemotely,
  cardDeletedRemotely,
  cardUpdatedRemotely,
  cardsReorderedRemotely,
  createBoard,
  createBoardFailure,
  createBoardSuccess,
  createCard,
  createCardFailure,
  createCardSuccess,
  createList,
  createListFailure,
  createListSuccess,
  deleteCard,
  deleteCardFailure,
  deleteCardSuccess,
  deleteBoard,
  deleteBoardFailure,
  deleteBoardSuccess,
  deleteList,
  deleteListFailure,
  deleteListSuccess,
  loadBoard,
  loadBoardFailure,
  loadBoardSuccess,
  loadMyBoards,
  loadMyBoardsFailure,
  loadMyBoardsSuccess,
  listCreatedRemotely,
  listDeletedRemotely,
  listsReorderedRemotely,
  listUpdatedRemotely,
  reorderCards,
  reorderCardsFailure,
  reorderCardsSuccess,
  reorderLists,
  reorderListsFailure,
  reorderListsSuccess,
  updateCard,
  updateCardFailure,
  updateCardSuccess,
  updateBoardDetails,
  updateBoardDetailsFailure,
  updateBoardDetailsSuccess,
  updateList,
  updateListFailure,
  updateListSuccess,
} from './boards.actions';

@Injectable()
export class BoardsEffects {
  private readonly actions$ = inject(Actions);
  private readonly boardService = inject(BoardService);
  private readonly listService = inject(ListService);
  private readonly cardService = inject(CardService);
  private readonly socketService = inject(SocketService);
  private readonly boardSocketService = inject(BoardSocketService);
  private readonly router = inject(Router);

  readonly loadMyBoards$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadMyBoards),
      switchMap(() =>
        this.boardService.getBoards().pipe(
          map((boards) => loadMyBoardsSuccess({ boards })),
          catchError((error: unknown) => of(loadMyBoardsFailure({ error: this.getErrorMessage(error) }))),
        ),
      ),
    ),
  );

  readonly loadBoard$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadBoard),
      switchMap(({ boardId }) =>
        this.boardService.getBoard(boardId).pipe(
          map((board) => loadBoardSuccess({ board })),
          catchError((error: unknown) => of(loadBoardFailure({ error: this.getErrorMessage(error) }))),
        ),
      ),
    ),
  );

  readonly createBoard$ = createEffect(() =>
    this.actions$.pipe(
      ofType(createBoard),
      exhaustMap(({ workspaceId, title, description }) =>
        this.boardService.createBoard(workspaceId, { title, description }).pipe(
          map((board) => createBoardSuccess({ board })),
          catchError((error: unknown) => of(createBoardFailure({ error: this.getErrorMessage(error) }))),
        ),
      ),
    ),
  );

  readonly updateBoardDetails$ = createEffect(() =>
    this.actions$.pipe(
      ofType(updateBoardDetails),
      exhaustMap(({ boardId, title, description }) =>
        this.boardService.updateBoard(boardId, { title, description }).pipe(
          map((board) => updateBoardDetailsSuccess({ board })),
          catchError((error: unknown) => of(updateBoardDetailsFailure({ error: this.getErrorMessage(error) }))),
        ),
      ),
    ),
  );

  readonly deleteBoard$ = createEffect(() =>
    this.actions$.pipe(
      ofType(deleteBoard),
      mergeMap(({ boardId }) =>
        this.boardService.deleteBoard(boardId).pipe(
          map(() => deleteBoardSuccess({ boardId })),
          catchError((error: unknown) => of(deleteBoardFailure({ error: this.getErrorMessage(error) }))),
        ),
      ),
    ),
  );

  readonly navigateHomeAfterDeleteBoard$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(deleteBoardSuccess),
        tap(() => void this.router.navigate(['/home'])),
      ),
    { dispatch: false },
  );

  readonly createList$ = createEffect(() =>
    this.actions$.pipe(
      ofType(createList),
      exhaustMap(({ boardId, title }) =>
        this.listService.createList(boardId, { title }).pipe(
          map((list) => createListSuccess({ list })),
          catchError((error: unknown) => of(createListFailure({ error: this.getErrorMessage(error) }))),
        ),
      ),
    ),
  );

  readonly updateList$ = createEffect(() =>
    this.actions$.pipe(
      ofType(updateList),
      exhaustMap(({ listId, title }) =>
        this.listService.updateList(listId, { title }).pipe(
          map((list) => updateListSuccess({ list })),
          catchError((error: unknown) => of(updateListFailure({ error: this.getErrorMessage(error) }))),
        ),
      ),
    ),
  );

  readonly deleteList$ = createEffect(() =>
    this.actions$.pipe(
      ofType(deleteList),
      mergeMap(({ listId }) =>
        this.listService.deleteList(listId).pipe(
          map((list) => deleteListSuccess({ listId: list.id })),
          catchError((error: unknown) => of(deleteListFailure({ error: this.getErrorMessage(error) }))),
        ),
      ),
    ),
  );

  readonly createCard$ = createEffect(() =>
    this.actions$.pipe(
      ofType(createCard),
      exhaustMap(({ listId, title, description }) =>
        this.cardService.createCard(listId, { title, description }).pipe(
          map((card) => createCardSuccess({ card })),
          catchError((error: unknown) => of(createCardFailure({ error: this.getErrorMessage(error) }))),
        ),
      ),
    ),
  );

  readonly updateCard$ = createEffect(() =>
    this.actions$.pipe(
      ofType(updateCard),
      exhaustMap(({ cardId, title, description }) =>
        this.cardService.updateCard(cardId, { title, description }).pipe(
          map((card) => updateCardSuccess({ card })),
          catchError((error: unknown) => of(updateCardFailure({ error: this.getErrorMessage(error) }))),
        ),
      ),
    ),
  );

  readonly deleteCard$ = createEffect(() =>
    this.actions$.pipe(
      ofType(deleteCard),
      mergeMap(({ cardId }) =>
        this.cardService.deleteCard(cardId).pipe(
          map((card) => deleteCardSuccess({ cardId: card.id, listId: card.listId })),
          catchError((error: unknown) => of(deleteCardFailure({ error: this.getErrorMessage(error) }))),
        ),
      ),
    ),
  );

  readonly reorderLists$ = createEffect(() =>
    this.actions$.pipe(
      ofType(reorderLists),
      concatMap(({ boardId, items }) =>
        this.boardService.reorderLists(boardId, items).pipe(
          map((lists) => reorderListsSuccess({ lists: lists ?? [] })),
          catchError((error: unknown) => of(reorderListsFailure({ error: this.getErrorMessage(error) }))),
        ),
      ),
    ),
  );

  readonly reorderCards$ = createEffect(() =>
    this.actions$.pipe(
      ofType(reorderCards),
      concatMap(({ boardId, items }) =>
        this.boardService.reorderCards(boardId, items).pipe(
          map((cards) => reorderCardsSuccess({ cards: cards ?? [] })),
          catchError((error: unknown) => of(reorderCardsFailure({ error: this.getErrorMessage(error) }))),
        ),
      ),
    ),
  );

  readonly boardSocketConnect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadBoardSuccess),
      switchMap(({ board }) => {
        this.socketService.joinBoard(board.id);

        return merge(
          this.boardSocketService.cardCreated$.pipe(
            map(({ card }) => cardCreatedRemotely({ card })),
          ),
          this.boardSocketService.cardUpdated$.pipe(
            map(({ card }) => cardUpdatedRemotely({ card })),
          ),
          this.boardSocketService.cardDeleted$.pipe(map((data) => cardDeletedRemotely(data))),
          this.boardSocketService.cardsReordered$.pipe(map((data) => cardsReorderedRemotely(data))),
          this.boardSocketService.listCreated$.pipe(
            map(({ list }) => listCreatedRemotely({ list })),
          ),
          this.boardSocketService.listUpdated$.pipe(
            map(({ list }) => listUpdatedRemotely({ list })),
          ),
          this.boardSocketService.listDeleted$.pipe(map((data) => listDeletedRemotely(data))),
          this.boardSocketService.listsReordered$.pipe(map((data) => listsReorderedRemotely(data))),
          this.boardSocketService.boardUpdated$.pipe(map((data) => boardUpdatedRemotely(data))),
        ).pipe(takeUntil(this.actions$.pipe(ofType(loadBoard))));
      }),
    ),
  );

  readonly boardSocketDisconnect$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(loadBoard),
        tap(() => this.socketService.leaveCurrentBoard()),
      ),
    { dispatch: false },
  );

  private getErrorMessage(error: unknown): string {
    return typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message?: string }).message)
      : 'Request failed.';
  }
}
