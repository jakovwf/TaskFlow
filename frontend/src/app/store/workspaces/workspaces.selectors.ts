import { createFeatureSelector, createSelector } from '@ngrx/store';
import { workspacesAdapter, WorkspacesState } from './workspaces.reducer';

export const selectWorkspacesState = createFeatureSelector<WorkspacesState>('workspaces');

const adapterSelectors = workspacesAdapter.getSelectors(selectWorkspacesState);

export const selectAllWorkspaces = adapterSelectors.selectAll;
export const selectWorkspaceEntities = adapterSelectors.selectEntities;

export const selectWorkspacesLoading = createSelector(
  selectWorkspacesState,
  (state) => state.loading,
);

export const selectWorkspacesError = createSelector(
  selectWorkspacesState,
  (state) => state.error,
);
