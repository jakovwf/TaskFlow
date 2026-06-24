import { EntityState, createEntityAdapter } from '@ngrx/entity';
import { createReducer, on } from '@ngrx/store';
import { Board, BoardList, Card } from '../models';
import {
  addBoard,
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
  removeBoard,
  reorderCards,
  reorderCardsFailure,
  reorderCardsSuccess,
  reorderLists,
  reorderListsFailure,
  reorderListsSuccess,
  updateBoard,
  updateBoardDetails,
  updateBoardDetailsFailure,
  updateBoardDetailsSuccess,
  updateCard,
  updateCardFailure,
  updateCardSuccess,
  updateList,
  updateListFailure,
  updateListSuccess,
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
  on(
    loadMyBoards,
    loadBoard,
    createBoard,
    updateBoardDetails,
    deleteBoard,
    createList,
    updateList,
    deleteList,
    createCard,
    updateCard,
    deleteCard,
    reorderLists,
    reorderCards,
    (state) => ({ ...state, loading: true, error: null }),
  ),
  on(loadMyBoardsSuccess, (state, { boards }) =>
    boardsAdapter.setAll(boards, { ...state, loading: false, error: null }),
  ),
  on(
    loadMyBoardsFailure,
    loadBoardFailure,
    createBoardFailure,
    updateBoardDetailsFailure,
    deleteBoardFailure,
    createListFailure,
    updateListFailure,
    deleteListFailure,
    createCardFailure,
    updateCardFailure,
    deleteCardFailure,
    reorderListsFailure,
    reorderCardsFailure,
    (state, { error }) => ({ ...state, loading: false, error }),
  ),
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
  on(updateBoardDetailsSuccess, (state, { board }) =>
    boardsAdapter.upsertOne(board, { ...state, loading: false, error: null }),
  ),
  on(deleteBoardSuccess, (state, { boardId }) =>
    boardsAdapter.removeOne(boardId, {
      ...state,
      selectedBoardId: state.selectedBoardId === boardId ? null : state.selectedBoardId,
      loading: false,
      error: null,
    }),
  ),
  on(createListSuccess, (state, { list }) =>
    updateSelectedBoard(state, (board) => ({
      ...board,
      lists: [...(board.lists ?? []), list].sort(sortByPosition),
    })),
  ),
  on(updateListSuccess, (state, { list }) =>
    updateSelectedBoard(state, (board) => ({
      ...board,
      lists: (board.lists ?? []).map((existingList) =>
        existingList.id === list.id ? { ...existingList, ...list } : existingList,
      ),
    })),
  ),
  on(deleteListSuccess, (state, { listId }) =>
    updateSelectedBoard(state, (board) => ({
      ...board,
      lists: (board.lists ?? []).filter((list) => list.id !== listId),
    })),
  ),
  on(createCardSuccess, (state, { card }) =>
    updateSelectedBoard(state, (board) => ({
      ...board,
      lists: (board.lists ?? []).map((list) =>
        list.id === card.listId
          ? { ...list, cards: [...(list.cards ?? []), card].sort(sortByPosition) }
          : list,
      ),
    })),
  ),
  on(updateCardSuccess, (state, { card }) =>
    updateSelectedBoard(state, (board) => ({
      ...board,
      lists: (board.lists ?? []).map((list) => ({
        ...list,
        cards: (list.cards ?? []).map((existingCard) =>
          existingCard.id === card.id ? { ...existingCard, ...card } : existingCard,
        ),
      })),
    })),
  ),
  on(deleteCardSuccess, (state, { cardId, listId }) =>
    updateSelectedBoard(state, (board) => ({
      ...board,
      lists: (board.lists ?? []).map((list) =>
        list.id === listId
          ? { ...list, cards: (list.cards ?? []).filter((card) => card.id !== cardId) }
          : list,
      ),
    })),
  ),
  on(reorderListsSuccess, (state, { lists }) =>
    updateSelectedBoard(state, (board) => ({
      ...board,
      lists: lists
        .map((list) => ({
          ...list,
          cards: [...(list.cards ?? [])].sort(sortByPosition),
        }))
        .sort(sortByPosition),
    })),
  ),
  on(reorderCardsSuccess, (state, { cards }) =>
    updateSelectedBoard(state, (board) => ({
      ...board,
      lists: (board.lists ?? [])
        .map((list) => ({
          ...list,
          cards: cards
            .filter((card) => card.listId === list.id)
            .sort(sortByPosition),
        }))
        .sort(sortByPosition),
    })),
  ),
  on(addBoard, (state, { board }) => boardsAdapter.addOne(board, state)),
  on(updateBoard, (state, { board }) => boardsAdapter.upsertOne(board, state)),
  on(removeBoard, (state, { boardId }) => boardsAdapter.removeOne(boardId, state)),
);

function updateSelectedBoard(state: BoardsState, update: (board: Board) => Board): BoardsState {
  if (!state.selectedBoardId) {
    return { ...state, loading: false };
  }

  const selectedBoard = state.entities[state.selectedBoardId];

  if (!selectedBoard) {
    return { ...state, loading: false };
  }

  return boardsAdapter.upsertOne(update(selectedBoard), {
    ...state,
    loading: false,
    error: null,
  });
}

function sortByPosition<T extends BoardList | Card>(a: T, b: T): number {
  return a.position - b.position;
}
