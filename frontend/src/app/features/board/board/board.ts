import { AsyncPipe } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { combineLatest, distinctUntilChanged, map } from 'rxjs';
import {
  createCard,
  createList,
  deleteCard,
  deleteList,
  loadBoard,
  reorderCards,
  reorderLists,
  updateCard,
  updateList,
} from '../../../store/boards/boards.actions';
import { selectCurrentUser } from '../../../store/auth/auth.selectors';
import {
  selectBoardsError,
  selectBoardsLoading,
  selectSelectedBoard,
} from '../../../store/boards/boards.selectors';
import { BoardList, Card } from '../../../store/models';
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

  readonly listForm = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(1)]],
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
          this.store.dispatch(loadBoard({ boardId }));
        }
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
}
