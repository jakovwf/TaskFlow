import { EntityState, createEntityAdapter } from '@ngrx/entity';
import { createReducer, on } from '@ngrx/store';
import { Board } from '../models';
import {
  addBoard,
  createBoard,
  createBoardFailure,
  createBoardSuccess,
  loadBoard,
  loadBoardFailure,
  loadBoardSuccess,
  loadMyBoards,
  loadMyBoardsFailure,
  loadMyBoardsSuccess,
  removeBoard,
  updateBoard,
} from './boards.actions';

export interface BoardsState extends EntityState<Board> {
  selectedBoardId: string | null;
  loading: boolean;
  error: string | null;
}

export const boardsAdapter = createEntityAdapter<Board>();

export const initialBoardsState: BoardsState = boardsAdapter.getInitialState({
  selectedBoardId: null,
  loading: false,
  error: null,
});

export const boardsReducer = createReducer(
  initialBoardsState,
  on(loadMyBoards, loadBoard, createBoard, (state) => ({ ...state, loading: true, error: null })),
  on(loadMyBoardsSuccess, (state, { boards }) =>
    boardsAdapter.setAll(boards, { ...state, loading: false, error: null }),
  ),
  on(loadMyBoardsFailure, loadBoardFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
  on(createBoardFailure, (state, { error }) => ({ ...state, loading: false, error })),
  on(loadBoardSuccess, (state, { board }) =>
    boardsAdapter.upsertOne(board, {
      ...state,
      selectedBoardId: board.id,
      loading: false,
      error: null,
    }),
  ),
  on(createBoardSuccess, (state, { board }) =>
    boardsAdapter.addOne(board, { ...state, loading: false, error: null }),
  ),
  on(addBoard, (state, { board }) => boardsAdapter.addOne(board, state)),
  on(updateBoard, (state, { board }) => boardsAdapter.upsertOne(board, state)),
  on(removeBoard, (state, { boardId }) => boardsAdapter.removeOne(boardId, state)),
);
