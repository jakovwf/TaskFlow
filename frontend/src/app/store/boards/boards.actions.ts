import { createAction, createActionGroup, emptyProps, props } from '@ngrx/store';
import { Board, BoardList, Card } from '../models';

export const boardsActions = createActionGroup({
  source: 'Boards',
  events: {
    'Load My Boards': emptyProps(),
    'Load My Boards Success': props<{ boards: Board[] }>(),
    'Load My Boards Failure': props<{ error: string }>(),
    'Load Board': props<{ boardId: string }>(),
    'Load Board Success': props<{ board: Board }>(),
    'Load Board Failure': props<{ error: string }>(),
    'Create Board': props<{ workspaceId: string; title: string; description?: string }>(),
    'Create Board Success': props<{ board: Board }>(),
    'Create Board Failure': props<{ error: string }>(),
    'Update Board Details': props<{ boardId: string; title: string; description?: string }>(),
    'Update Board Details Success': props<{ board: Board }>(),
    'Update Board Details Failure': props<{ error: string }>(),
    'Delete Board': props<{ boardId: string }>(),
    'Delete Board Success': props<{ boardId: string }>(),
    'Delete Board Failure': props<{ error: string }>(),
    'Create List': props<{ boardId: string; title: string }>(),
    'Create List Success': props<{ list: BoardList }>(),
    'Create List Failure': props<{ error: string }>(),
    'Update List': props<{ listId: string; title: string }>(),
    'Update List Success': props<{ list: BoardList }>(),
    'Update List Failure': props<{ error: string }>(),
    'Delete List': props<{ listId: string }>(),
    'Delete List Success': props<{ listId: string }>(),
    'Delete List Failure': props<{ error: string }>(),
    'Create Card': props<{ listId: string; title: string; description?: string }>(),
    'Create Card Success': props<{ card: Card }>(),
    'Create Card Failure': props<{ error: string }>(),
    'Update Card': props<{ cardId: string; title: string; description?: string }>(),
    'Update Card Success': props<{ card: Card }>(),
    'Update Card Failure': props<{ error: string }>(),
    'Delete Card': props<{ cardId: string }>(),
    'Delete Card Success': props<{ cardId: string; listId: string }>(),
    'Delete Card Failure': props<{ error: string }>(),
    'Reorder Lists': props<{ boardId: string; items: { id: string; position: number }[] }>(),
    'Reorder Lists Success': props<{ lists: BoardList[] }>(),
    'Reorder Lists Failure': props<{ error: string }>(),
    'Reorder Cards': props<{ boardId: string; items: { id: string; listId: string; position: number }[] }>(),
    'Reorder Cards Success': props<{ cards: Card[] }>(),
    'Reorder Cards Failure': props<{ error: string }>(),
    'Add Board': props<{ board: Board }>(),
    'Update Board': props<{ board: Board }>(),
    'Remove Board': props<{ boardId: string }>(),
  },
});

export const {
  loadMyBoards,
  loadMyBoardsSuccess,
  loadMyBoardsFailure,
  loadBoard,
  loadBoardSuccess,
  loadBoardFailure,
  createBoard,
  createBoardSuccess,
  createBoardFailure,
  updateBoardDetails,
  updateBoardDetailsSuccess,
  updateBoardDetailsFailure,
  deleteBoard,
  deleteBoardSuccess,
  deleteBoardFailure,
  createList,
  createListSuccess,
  createListFailure,
  updateList,
  updateListSuccess,
  updateListFailure,
  deleteList,
  deleteListSuccess,
  deleteListFailure,
  createCard,
  createCardSuccess,
  createCardFailure,
  updateCard,
  updateCardSuccess,
  updateCardFailure,
  deleteCard,
  deleteCardSuccess,
  deleteCardFailure,
  reorderLists,
  reorderListsSuccess,
  reorderListsFailure,
  reorderCards,
  reorderCardsSuccess,
  reorderCardsFailure,
  addBoard,
  updateBoard,
  removeBoard,
} = boardsActions;

export const cardCreatedRemotely = createAction(
  '[Board Socket] Card Created',
  props<{ card: Card }>(),
);
export const cardUpdatedRemotely = createAction(
  '[Board Socket] Card Updated',
  props<{ card: Card }>(),
);
export const cardDeletedRemotely = createAction(
  '[Board Socket] Card Deleted',
  props<{ cardId: string; listId: string }>(),
);
export const cardsReorderedRemotely = createAction(
  '[Board Socket] Cards Reordered',
  props<{ items: { id: string; listId: string; position: number }[] }>(),
);
export const listCreatedRemotely = createAction(
  '[Board Socket] List Created',
  props<{ list: BoardList }>(),
);
export const listUpdatedRemotely = createAction(
  '[Board Socket] List Updated',
  props<{ list: BoardList }>(),
);
export const listDeletedRemotely = createAction(
  '[Board Socket] List Deleted',
  props<{ listId: string }>(),
);
export const listsReorderedRemotely = createAction(
  '[Board Socket] Lists Reordered',
  props<{ items: { id: string; position: number }[] }>(),
);
export const boardUpdatedRemotely = createAction(
  '[Board Socket] Board Updated',
  props<{
    boardId: string;
    title: string;
    description: string | null;
    backgroundUrl: string | null;
    backgroundColor: string | null;
  }>(),
);
