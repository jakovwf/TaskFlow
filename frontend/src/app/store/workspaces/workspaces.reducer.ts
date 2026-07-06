import { EntityState, createEntityAdapter } from '@ngrx/entity';
import { createReducer, on } from '@ngrx/store';
import { logout } from '../auth/auth.actions';
import { Workspace } from '../models';
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

export interface WorkspacesState extends EntityState<Workspace> {
  loading: boolean;
  error: string | null;
}

export const workspacesAdapter = createEntityAdapter<Workspace>();

export const initialWorkspacesState: WorkspacesState = workspacesAdapter.getInitialState({
  loading: false,
  error: null,
});

export const workspacesReducer = createReducer(
  initialWorkspacesState,
  on(loadWorkspaces, createWorkspace, updateWorkspace, deleteWorkspace, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(loadWorkspacesSuccess, (state, { workspaces }) =>
    workspacesAdapter.setAll(workspaces, { ...state, loading: false, error: null }),
  ),
  on(createWorkspaceSuccess, (state, { workspace }) =>
    workspacesAdapter.addOne(workspace, { ...state, loading: false, error: null }),
  ),
  on(updateWorkspaceSuccess, (state, { workspace }) =>
    workspacesAdapter.upsertOne(workspace, { ...state, loading: false, error: null }),
  ),
  on(deleteWorkspaceSuccess, (state, { workspaceId }) =>
    workspacesAdapter.removeOne(workspaceId, { ...state, loading: false, error: null }),
  ),
  on(loadWorkspacesFailure, createWorkspaceFailure, updateWorkspaceFailure, deleteWorkspaceFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
  on(logout, () => initialWorkspacesState),
);
