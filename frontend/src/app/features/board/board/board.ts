import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { map } from 'rxjs';
import { loadBoard } from '../../../store/boards/boards.actions';
import {
  selectBoardsError,
  selectBoardsLoading,
  selectSelectedBoard,
} from '../../../store/boards/boards.selectors';

@Component({
  selector: 'app-board',
  imports: [AsyncPipe, RouterLink],
  templateUrl: './board.html',
  styleUrl: './board.scss',
})
export class Board {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(Store);

  readonly board$ = this.store.select(selectSelectedBoard);
  readonly loading$ = this.store.select(selectBoardsLoading);
  readonly error$ = this.store.select(selectBoardsError);

  constructor() {
    this.route.paramMap
      .pipe(map((params) => params.get('boardId')))
      .subscribe((boardId) => {
        if (boardId) {
          this.store.dispatch(loadBoard({ boardId }));
        }
      });
  }
}
