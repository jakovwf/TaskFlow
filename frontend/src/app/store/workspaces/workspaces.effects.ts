import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, exhaustMap, map, mergeMap, of, switchMap } from 'rxjs';
import { WorkspaceService } from '../../core/services/workspace';
import { loadMyBoards } from '../boards/boards.actions';
import {
  createWorkspace,
  createWorkspaceFailure,
  createWorkspaceSuccess,
  deleteWorkspace,
  deleteWorkspaceFailure,
  deleteWorkspaceSuccess,
  loadWorkspaces,
  loadWorkspacesFailure,
  loadWorkspacesSuccess,
  updateWorkspace,
  updateWorkspaceFailure,
  updateWorkspaceSuccess,
} from './workspaces.actions';

@Injectable()
export class WorkspacesEffects {
  private readonly actions$ = inject(Actions);
  private readonly workspaceService = inject(WorkspaceService);

  readonly loadWorkspaces$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadWorkspaces),
      switchMap(() =>
        this.workspaceService.getWorkspaces().pipe(
          map((workspaces) => loadWorkspacesSuccess({ workspaces })),
          catchError((error: unknown) =>
            of(loadWorkspacesFailure({ error: this.getErrorMessage(error) })),
          ),
        ),
      ),
    ),
  );

  readonly createWorkspace$ = createEffect(() =>
    this.actions$.pipe(
      ofType(createWorkspace),
      exhaustMap(({ name }) =>
        this.workspaceService.createWorkspace({ name }).pipe(
          map((workspace) => createWorkspaceSuccess({ workspace })),
          catchError((error: unknown) =>
            of(createWorkspaceFailure({ error: this.getErrorMessage(error) })),
          ),
        ),
      ),
    ),
  );

  readonly updateWorkspace$ = createEffect(() =>
    this.actions$.pipe(
      ofType(updateWorkspace),
      exhaustMap(({ workspaceId, name }) =>
        this.workspaceService.updateWorkspace(workspaceId, { name }).pipe(
          map((workspace) => updateWorkspaceSuccess({ workspace })),
          catchError((error: unknown) =>
            of(updateWorkspaceFailure({ error: this.getErrorMessage(error) })),
          ),
        ),
      ),
    ),
  );

  readonly deleteWorkspace$ = createEffect(() =>
    this.actions$.pipe(
      ofType(deleteWorkspace),
      mergeMap(({ workspaceId }) =>
        this.workspaceService.deleteWorkspace(workspaceId).pipe(
          map(() => deleteWorkspaceSuccess({ workspaceId })),
          catchError((error: unknown) =>
            of(deleteWorkspaceFailure({ error: this.getErrorMessage(error) })),
          ),
        ),
      ),
    ),
  );

  readonly reloadBoardsAfterWorkspaceDelete$ = createEffect(() =>
    this.actions$.pipe(
      ofType(deleteWorkspaceSuccess),
      map(() => loadMyBoards()),
    ),
  );

  private getErrorMessage(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const httpError = error as { error?: { message?: string } | string; message?: string };

      if (typeof httpError.error === 'string') {
        return httpError.error;
      }

      return httpError.error?.message ?? httpError.message ?? 'Request failed.';
    }

    return 'Request failed.';
  }
}
