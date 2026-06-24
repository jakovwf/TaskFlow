import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap } from 'rxjs';
import { WorkspaceService } from '../../core/services/workspace';
import {
  createWorkspace,
  createWorkspaceFailure,
  createWorkspaceSuccess,
  loadWorkspaces,
  loadWorkspacesFailure,
  loadWorkspacesSuccess,
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
      switchMap(({ name }) =>
        this.workspaceService.createWorkspace({ name }).pipe(
          map((workspace) => createWorkspaceSuccess({ workspace })),
          catchError((error: unknown) =>
            of(createWorkspaceFailure({ error: this.getErrorMessage(error) })),
          ),
        ),
      ),
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
