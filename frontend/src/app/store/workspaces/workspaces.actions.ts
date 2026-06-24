import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { Workspace } from '../models';

export const workspacesActions = createActionGroup({
  source: 'Workspaces',
  events: {
    'Load Workspaces': emptyProps(),
    'Load Workspaces Success': props<{ workspaces: Workspace[] }>(),
    'Load Workspaces Failure': props<{ error: string }>(),
    'Create Workspace': props<{ name: string }>(),
    'Create Workspace Success': props<{ workspace: Workspace }>(),
    'Create Workspace Failure': props<{ error: string }>(),
  },
});

export const {
  loadWorkspaces,
  loadWorkspacesSuccess,
  loadWorkspacesFailure,
  createWorkspace,
  createWorkspaceSuccess,
  createWorkspaceFailure,
} = workspacesActions;
