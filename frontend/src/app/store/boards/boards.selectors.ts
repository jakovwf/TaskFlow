import { createFeatureSelector, createSelector } from '@ngrx/store';
import { selectCurrentUser } from '../auth/auth.selectors';
import { boardsAdapter, BoardsState } from './boards.reducer';

export const selectBoardsState = createFeatureSelector<BoardsState>('boards');

const adapterSelectors = boardsAdapter.getSelectors(selectBoardsState);

export const selectAllBoards = adapterSelectors.selectAll;
export const selectBoardEntities = adapterSelectors.selectEntities;

export const selectMyBoards = createSelector(selectAllBoards, selectCurrentUser, (boards, user) =>
  user
    ? boards.filter((board) =>
        board.members?.some((member) => member.userId === user.id && member.role === 'OWNER'),
      )
    : [],
);

export const selectMemberBoards = createSelector(selectAllBoards, selectCurrentUser, (boards, user) =>
  user
    ? boards.filter((board) =>
        board.members?.some((member) => member.userId === user.id && member.role !== 'OWNER'),
      )
    : [],
);

export const selectBoardById = (boardId: string) =>
  createSelector(selectBoardEntities, (entities) => entities[boardId] ?? null);

export const selectSelectedBoard = createSelector(
  selectBoardsState,
  selectBoardEntities,
  (state, entities) => (state.selectedBoardId ? entities[state.selectedBoardId] ?? null : null),
);

export const selectBoardsLoading = createSelector(selectBoardsState, (state) => state.loading);

export const selectBoardsReordering = createSelector(selectBoardsState, (state) => state.reordering);

export const selectBoardsError = createSelector(selectBoardsState, (state) => state.error);

export const selectBoardsReorderError = createSelector(selectBoardsState, (state) => state.reorderError);
