import { AsyncPipe } from '@angular/common';
import { Component, HostListener, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { ConfirmModalService } from '../../shared/services/confirm-modal.service';
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
  imports: [AsyncPipe, ReactiveFormsModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly formBuilder = inject(FormBuilder);
  private readonly confirmModalService = inject(ConfirmModalService);
  private readonly router = inject(Router);
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
  activeDropdownId: string | null = null;
  readonly workspaceBoardPage: Record<string, number> = {};
  boardPageSize = this.getBoardPageSize();
  showNewWorkspaceForm = false;

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
    this.showNewWorkspaceForm = false;
  }

  toggleNewWorkspaceForm(): void {
    this.showNewWorkspaceForm = !this.showNewWorkspaceForm;
    this.workspaceForm.reset();
  }

  startWorkspaceEdit(workspace: Workspace): void {
    this.closeDropdown();
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

  async deleteWorkspace(workspaceId: string): Promise<void> {
    this.closeDropdown();
    if (!(await this.confirmModalService.confirm('Brisanje workspace-a', 'Da li ste sigurni da želite da obrišete workspace?'))) {
      return;
    }

    this.store.dispatch(deleteWorkspace({ workspaceId }));
  }

  boardsForWorkspace(boards: Board[], workspaceId: string): Board[] {
    return boards.filter((board) => board.workspaceId === workspaceId);
  }

  visibleBoardsForWorkspace(boards: Board[], workspaceId: string): Board[] {
    const workspaceBoards = this.boardsForWorkspace(boards, workspaceId);
    const page = this.workspaceBoardPageIndex(workspaceBoards.length, workspaceId);
    const start = page * this.boardPageSize;
    return workspaceBoards.slice(start, start + this.boardPageSize);
  }

  workspaceBoardPageIndex(boardCount: number, workspaceId: string): number {
    const lastPage = Math.max(0, Math.ceil(boardCount / this.boardPageSize) - 1);
    return Math.min(this.workspaceBoardPage[workspaceId] ?? 0, lastPage);
  }

  workspaceBoardPageCount(boardCount: number): number {
    return Math.ceil(boardCount / this.boardPageSize);
  }

  changeWorkspaceBoardPage(workspaceId: string, boardCount: number, direction: -1 | 1): void {
    const currentPage = this.workspaceBoardPageIndex(boardCount, workspaceId);
    const lastPage = Math.max(0, this.workspaceBoardPageCount(boardCount) - 1);
    this.workspaceBoardPage[workspaceId] = Math.min(lastPage, Math.max(0, currentPage + direction));
    this.closeDropdown();
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

  toggleDropdown(dropdownId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.activeDropdownId = this.activeDropdownId === dropdownId ? null : dropdownId;
  }

  @HostListener('document:click')
  closeDropdown(): void {
    this.activeDropdownId = null;
  }

  @HostListener('window:resize')
  handleViewportResize(): void {
    const nextPageSize = this.getBoardPageSize();

    if (nextPageSize === this.boardPageSize) {
      return;
    }

    const previousPageSize = this.boardPageSize;
    Object.keys(this.workspaceBoardPage).forEach((workspaceId) => {
      const firstVisibleBoardIndex = this.workspaceBoardPage[workspaceId] * previousPageSize;
      this.workspaceBoardPage[workspaceId] = Math.floor(firstVisibleBoardIndex / nextPageSize);
    });
    this.boardPageSize = nextPageSize;
    this.closeDropdown();
  }

  private getBoardPageSize(): number {
    return typeof window !== 'undefined' && window.innerWidth < 640 ? 2 : 4;
  }

  openBoard(boardId: string): void {
    void this.router.navigate(['/b', boardId]);
  }

  startBoardEdit(board: Board): void {
    this.closeDropdown();
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

  async deleteBoard(boardId: string): Promise<void> {
    this.closeDropdown();
    if (!(await this.confirmModalService.confirm('Brisanje boarda', 'Da li ste sigurni da želite da obrišete board?'))) {
      return;
    }

    this.store.dispatch(deleteBoard({ boardId }));
  }
}
