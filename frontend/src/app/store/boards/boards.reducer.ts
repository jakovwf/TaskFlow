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
  reordering: boolean;
  error: string | null;
  reorderError: string | null;
  reorderBackupBoard: Board | null;
}

export const boardsAdapter = createEntityAdapter<Board>();

export const initialBoardsState: BoardsState = boardsAdapter.getInitialState({
  selectedBoardId: null,
  loading: false,
  reordering: false,
  error: null,
  reorderError: null,
  reorderBackupBoard: null,
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
  on(reorderLists, (state, { items }) =>
    startSelectedBoardReorder(state, (board) => ({
      ...board,
      lists: applyReorderedListItems(board.lists ?? [], items),
    })),
  ),
  on(reorderCards, (state, { items }) =>
    startSelectedBoardReorder(state, (board) => ({
      ...board,
      lists: applyReorderedCardItems(board.lists ?? [], items),
    })),
  ),
  on(reorderListsSuccess, (state, { lists }) =>
    finishSelectedBoardReorder(state, (board) => ({
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
    finishSelectedBoardReorder(state, (board) => ({
      ...board,
      lists: mergeReorderedCards(board.lists ?? [], cards).sort(sortByPosition),
    })),
  ),
  on(reorderListsFailure, reorderCardsFailure, (state, { error }) => {
    const nextState = {
      ...state,
      reordering: false,
      reorderError: error,
      reorderBackupBoard: null,
    };

    return state.reorderBackupBoard
      ? boardsAdapter.upsertOne(state.reorderBackupBoard, nextState)
      : nextState;
  }),
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

function startSelectedBoardReorder(state: BoardsState, update: (board: Board) => Board): BoardsState {
  const reorderState = {
    ...state,
    reordering: true,
    reorderError: null,
  };

  if (!state.selectedBoardId) {
    return reorderState;
  }

  const selectedBoard = state.entities[state.selectedBoardId];

  if (!selectedBoard) {
    return reorderState;
  }

  return boardsAdapter.upsertOne(update(selectedBoard), {
    ...reorderState,
    reorderBackupBoard: state.reorderBackupBoard ?? selectedBoard,
  });
}

function finishSelectedBoardReorder(state: BoardsState, update: (board: Board) => Board): BoardsState {
  const reorderState = {
    ...state,
    reordering: false,
    reorderError: null,
    reorderBackupBoard: null,
  };

  if (!state.selectedBoardId) {
    return reorderState;
  }

  const selectedBoard = state.entities[state.selectedBoardId];

  if (!selectedBoard) {
    return reorderState;
  }

  return boardsAdapter.upsertOne(update(selectedBoard), reorderState);
}

function sortByPosition<T extends BoardList | Card>(a: T, b: T): number {
  return a.position - b.position;
}

function applyReorderedListItems(
  lists: BoardList[],
  items: { id: string; position: number }[],
): BoardList[] {
  const positionsByListId = new Map(items.map((item) => [item.id, item.position]));

  return lists
    .map((list) =>
      positionsByListId.has(list.id)
        ? { ...list, position: positionsByListId.get(list.id) ?? list.position }
        : list,
    )
    .sort(sortByPosition);
}

function applyReorderedCardItems(
  lists: BoardList[],
  items: { id: string; listId: string; position: number }[],
): BoardList[] {
  const itemsByCardId = new Map(items.map((item) => [item.id, item]));
  const cards = lists.flatMap((list) =>
    (list.cards ?? []).map((card) => {
      const reorderedItem = itemsByCardId.get(card.id);

      return reorderedItem
        ? { ...card, listId: reorderedItem.listId, position: reorderedItem.position }
        : card;
    }),
  );

  return lists.map((list) => ({
    ...list,
    cards: cards.filter((card) => card.listId === list.id).sort(sortByPosition),
  }));
}

function mergeReorderedCards(lists: BoardList[], reorderedCards: Card[]): BoardList[] {
  const reorderedCardsById = new Map(reorderedCards.map((card) => [card.id, card]));
  const reorderedCardIds = new Set(reorderedCards.map((card) => card.id));

  return lists.map((list) => {
    const existingCards = list.cards ?? [];
    const unchangedCards = existingCards
      .filter((card) => !reorderedCardIds.has(card.id))
      .map((card) => reorderedCardsById.get(card.id) ?? card);
    const cardsForList = [
      ...unchangedCards,
      ...reorderedCards.filter((card) => card.listId === list.id),
    ].sort(sortByPosition);

    return {
      ...list,
      cards: cardsForList,
    };
  });
}
