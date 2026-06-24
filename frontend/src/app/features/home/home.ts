import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { createBoard, loadMyBoards } from '../../store/boards/boards.actions';
import {
  selectAllBoards,
  selectBoardsError,
  selectBoardsLoading,
} from '../../store/boards/boards.selectors';
import {
  createWorkspace,
  loadWorkspaces,
} from '../../store/workspaces/workspaces.actions';
import {
  selectAllWorkspaces,
  selectWorkspacesError,
  selectWorkspacesLoading,
} from '../../store/workspaces/workspaces.selectors';

@Component({
  selector: 'app-home',
  imports: [AsyncPipe, ReactiveFormsModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly formBuilder = inject(FormBuilder);
  private readonly store = inject(Store);

  readonly workspaces$ = this.store.select(selectAllWorkspaces);
  readonly boards$ = this.store.select(selectAllBoards);
  readonly workspacesLoading$ = this.store.select(selectWorkspacesLoading);
  readonly boardsLoading$ = this.store.select(selectBoardsLoading);
  readonly workspacesError$ = this.store.select(selectWorkspacesError);
  readonly boardsError$ = this.store.select(selectBoardsError);

  readonly workspaceForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(1)]],
  });

  readonly boardForm = this.formBuilder.nonNullable.group({
    workspaceId: ['', Validators.required],
    title: ['', [Validators.required, Validators.minLength(1)]],
    description: [''],
  });

  constructor() {
    this.store.dispatch(loadWorkspaces());
    this.store.dispatch(loadMyBoards());
  }

  createWorkspace(): void {
    if (this.workspaceForm.invalid) {
      this.workspaceForm.markAllAsTouched();
      return;
    }

    const { name } = this.workspaceForm.getRawValue();
    this.store.dispatch(createWorkspace({ name }));
    this.workspaceForm.reset();
  }

  createBoard(): void {
    if (this.boardForm.invalid) {
      this.boardForm.markAllAsTouched();
      return;
    }

    const { workspaceId, title, description } = this.boardForm.getRawValue();
    this.store.dispatch(
      createBoard({
        workspaceId,
        title,
        description: description.trim() || undefined,
      }),
    );
    this.boardForm.patchValue({ title: '', description: '' });
  }
}
