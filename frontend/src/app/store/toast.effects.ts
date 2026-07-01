import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { tap } from 'rxjs';
import { ToastService } from '../shared/services/toast.service';
import {
  createBoardSuccess,
  createCardSuccess,
  createListSuccess,
  deleteBoardSuccess,
  deleteCardSuccess,
  deleteListSuccess,
  updateBoardDetailsSuccess,
  updateCardSuccess,
  updateListSuccess,
} from './boards/boards.actions';
import {
  createWorkspaceSuccess,
  deleteWorkspaceSuccess,
  updateWorkspaceSuccess,
} from './workspaces/workspaces.actions';

@Injectable()
export class ToastEffects {
  private readonly actions$ = inject(Actions);
  private readonly toastService = inject(ToastService);

  readonly successfulSave$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(
          createWorkspaceSuccess,
          updateWorkspaceSuccess,
          createBoardSuccess,
          updateBoardDetailsSuccess,
          createListSuccess,
          updateListSuccess,
          createCardSuccess,
          updateCardSuccess,
        ),
        tap(() => this.toastService.success('Uspešno sačuvano')),
      ),
    { dispatch: false },
  );

  readonly successfulDelete$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(
          deleteWorkspaceSuccess,
          deleteBoardSuccess,
          deleteListSuccess,
          deleteCardSuccess,
        ),
        tap(() => this.toastService.success('Uspešno obrisano')),
      ),
    { dispatch: false },
  );
}
