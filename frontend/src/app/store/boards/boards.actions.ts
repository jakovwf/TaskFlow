import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { Board } from '../models';

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
  addBoard,
  updateBoard,
  removeBoard,
} = boardsActions;
