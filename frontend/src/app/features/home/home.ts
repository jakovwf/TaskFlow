import { AsyncPipe } from '@angular/common';
import { Component, HostListener, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import {
  createBoard,
  deleteBoard,
  loadMyBoards,
  updateBoardDetails,
} from '../../store/boards/boards.actions';
import {
  selectAllBoards,
  selectBoardsError,
  selectBoardsLoading,
} from '../../store/boards/boards.selectors';
import { Board, Workspace } from '../../store/models';
import {
  createWorkspace,
  deleteWorkspace,
  loadWorkspaces,
  updateWorkspace,
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
  editingWorkspaceId: string | null = null;
  editingBoardId: string | null = null;
  creatingBoardWorkspaceId: string | null = null;
  openBoardMenuId: string | null = null;

  readonly workspaceForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(1)]],
  });

  readonly workspaceEditForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(1)]],
  });

  readonly boardForm = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(1)]],
    description: [''],
  });

  readonly boardEditForm = this.formBuilder.nonNullable.group({
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

    const name = this.workspaceForm.getRawValue().name.trim();

    if (!name) {
      this.workspaceForm.markAllAsTouched();
      return;
    }

    this.store.dispatch(createWorkspace({ name }));
    this.workspaceForm.reset();
  }

  startWorkspaceEdit(workspace: Workspace): void {
    this.editingWorkspaceId = workspace.id;
    this.workspaceEditForm.setValue({ name: workspace.name });
  }

  cancelWorkspaceEdit(): void {
    this.editingWorkspaceId = null;
    this.workspaceEditForm.reset();
  }

  saveWorkspaceEdit(): void {
    if (!this.editingWorkspaceId || this.workspaceEditForm.invalid) {
      this.workspaceEditForm.markAllAsTouched();
      return;
    }

    const name = this.workspaceEditForm.getRawValue().name.trim();

    if (!name) {
      this.workspaceEditForm.markAllAsTouched();
      return;
    }

    this.store.dispatch(updateWorkspace({ workspaceId: this.editingWorkspaceId, name }));
    this.cancelWorkspaceEdit();
  }

  deleteWorkspace(workspaceId: string): void {
    if (!confirm('Da li ste sigurni da zelite da obrisete workspace?')) {
      return;
    }

    this.store.dispatch(deleteWorkspace({ workspaceId }));
  }

  boardsForWorkspace(boards: Board[], workspaceId: string): Board[] {
    return boards.filter((board) => board.workspaceId === workspaceId);
  }

  toggleBoardCreate(workspaceId: string): void {
    this.creatingBoardWorkspaceId =
      this.creatingBoardWorkspaceId === workspaceId ? null : workspaceId;
    this.boardForm.reset();
  }

  createBoard(workspaceId: string): void {
    if (this.boardForm.invalid) {
      this.boardForm.markAllAsTouched();
      return;
    }

    const { title, description } = this.boardForm.getRawValue();
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      this.boardForm.markAllAsTouched();
      return;
    }

    this.store.dispatch(
      createBoard({
        workspaceId,
        title: trimmedTitle,
        description: description.trim() || undefined,
      }),
    );
    this.boardForm.reset();
    this.creatingBoardWorkspaceId = null;
  }

  toggleBoardMenu(boardId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.openBoardMenuId = this.openBoardMenuId === boardId ? null : boardId;
  }

  @HostListener('document:click')
  closeBoardMenu(): void {
    this.openBoardMenuId = null;
  }

  startBoardEdit(board: Board): void {
    this.closeBoardMenu();
    this.editingBoardId = board.id;
    this.boardEditForm.setValue({
      title: board.title,
      description: board.description ?? '',
    });
  }

  cancelBoardEdit(): void {
    this.editingBoardId = null;
    this.boardEditForm.reset();
  }

  saveBoardEdit(): void {
    if (!this.editingBoardId || this.boardEditForm.invalid) {
      this.boardEditForm.markAllAsTouched();
      return;
    }

    const { title, description } = this.boardEditForm.getRawValue();
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      this.boardEditForm.markAllAsTouched();
      return;
    }

    this.store.dispatch(
      updateBoardDetails({
        boardId: this.editingBoardId,
        title: trimmedTitle,
        description: description.trim() || undefined,
      }),
    );
    this.cancelBoardEdit();
  }

  deleteBoard(boardId: string): void {
    this.closeBoardMenu();
    if (!confirm('Da li ste sigurni da zelite da obrisete board?')) {
      return;
    }

    this.store.dispatch(deleteBoard({ boardId }));
  }
}
