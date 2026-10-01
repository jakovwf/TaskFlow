import { DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, HostListener, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { catchError, debounceTime, distinctUntilChanged, finalize, map, of, switchMap, take, tap } from 'rxjs';
import { BoardService } from '../../core/services/board';
import { UserService } from '../../core/services/user';
import { WorkspaceService } from '../../core/services/workspace';
import { ConfirmModalService } from '../../shared/services/confirm-modal.service';
import { ToastService } from '../../shared/services/toast.service';
import { AdminActivity, AdminBoard, AdminWorkspace, User } from '../../store/models';

type AdminTab = 'users' | 'boards' | 'workspaces';

@Component({
  selector: 'app-admin',
  imports: [DatePipe, ReactiveFormsModule],
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
})
export class Admin {
  private readonly boardsService = inject(BoardService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly confirmModal = inject(ConfirmModalService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly usersService = inject(UserService);
  private readonly workspacesService = inject(WorkspaceService);

  readonly pageSize = 10;
  activeTab: AdminTab = 'users';
  users: User[] = [];
  boards: AdminBoard[] = [];
  workspaces: AdminWorkspace[] = [];
  activities: AdminActivity[] = [];
  selectedUser: User | null = null;
  editingUser: User | null = null;
  usersPage = 1;
  boardsPage = 1;
  workspacesPage = 1;
  activitiesPage = 1;
  usersTotalPages = 1;
  boardsTotalPages = 1;
  workspacesTotalPages = 1;
  activitiesTotalPages = 1;
  userSearch = '';
  boardSearch = '';
  workspaceSearch = '';
  usersLoading = false;
  boardsLoading = false;
  workspacesLoading = false;
  activitiesLoading = false;
  error: string | null = null;
  busyId: string | null = null;

  readonly editUserForm = this.formBuilder.nonNullable.group({
    displayName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    avatarUrl: [''],
  });
  readonly userSearchControl = this.formBuilder.nonNullable.control('');
  readonly boardSearchControl = this.formBuilder.nonNullable.control('');
  readonly workspaceSearchControl = this.formBuilder.nonNullable.control('');

  constructor() {
    this.bindSearch();
    this.loadUsers();
  }

  setTab(tab: AdminTab): void {
    this.activeTab = tab;
    this.error = null;
    if (tab === 'boards' && this.boards.length === 0) this.loadBoards();
    if (tab === 'workspaces' && this.workspaces.length === 0) this.loadWorkspaces();
  }

  private bindSearch(): void {
    this.userSearchControl.valueChanges
      .pipe(
        debounceTime(300),
        map((query) => query.trim()),
        distinctUntilChanged(),
        tap((query) => {
          this.userSearch = query;
          this.usersPage = 1;
        }),
        switchMap(() => {
          this.usersLoading = true;
          this.error = null;
          this.cdr.markForCheck();
          return this.usersService.getAdminUsers(1, this.pageSize, this.userSearch).pipe(
            catchError(() => {
              this.usersLoading = false;
              this.error = 'Korisnici nisu mogli da se ucitaju.';
              this.cdr.markForCheck();
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          if (!response) return;
          this.users = response.data;
          this.usersPage = response.page;
          this.usersTotalPages = Math.max(response.totalPages, 1);
          this.usersLoading = false;
          this.cdr.markForCheck();
        },
      });

    this.boardSearchControl.valueChanges
      .pipe(
        debounceTime(300),
        map((query) => query.trim()),
        distinctUntilChanged(),
        tap((query) => {
          this.boardSearch = query;
          this.boardsPage = 1;
        }),
        switchMap(() => {
          this.boardsLoading = true;
          this.error = null;
          this.cdr.markForCheck();
          return this.boardsService.getAdminBoards(1, this.pageSize, this.boardSearch).pipe(
            catchError(() => {
              this.boardsLoading = false;
              this.error = 'Boardovi nisu mogli da se ucitaju.';
              this.cdr.markForCheck();
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          if (!response) return;
          this.boards = response.data;
          this.boardsPage = response.page;
          this.boardsTotalPages = Math.max(response.totalPages, 1);
          this.boardsLoading = false;
          this.cdr.markForCheck();
        },
      });

    this.workspaceSearchControl.valueChanges
      .pipe(
        debounceTime(300),
        map((query) => query.trim()),
        distinctUntilChanged(),
        tap((query) => {
          this.workspaceSearch = query;
          this.workspacesPage = 1;
        }),
        switchMap(() => {
          this.workspacesLoading = true;
          this.error = null;
          this.cdr.markForCheck();
          return this.workspacesService.getAdminWorkspaces(1, this.pageSize, this.workspaceSearch).pipe(
            catchError(() => {
              this.workspacesLoading = false;
              this.error = 'Workspace-ovi nisu mogli da se ucitaju.';
              this.cdr.markForCheck();
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          if (!response) return;
          this.workspaces = response.data;
          this.workspacesPage = response.page;
          this.workspacesTotalPages = Math.max(response.totalPages, 1);
          this.workspacesLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  loadUsers(page = this.usersPage): void {
    this.usersLoading = true;
    this.error = null;
    this.usersService.getAdminUsers(page, this.pageSize, this.userSearch.trim()).pipe(
      take(1),
      finalize(() => { this.usersLoading = false; this.cdr.markForCheck(); }),
    ).subscribe({
      next: (response) => {
        this.users = response.data;
        this.usersPage = response.page;
        this.usersTotalPages = Math.max(response.totalPages, 1);
        this.cdr.markForCheck();
      },
      error: () => this.error = 'Korisnici nisu mogli da se učitaju.',
    });
  }

  loadBoards(page = this.boardsPage): void {
    this.boardsLoading = true;
    this.error = null;
    this.boardsService.getAdminBoards(page, this.pageSize, this.boardSearch.trim()).pipe(
      take(1),
      finalize(() => { this.boardsLoading = false; this.cdr.markForCheck(); }),
    ).subscribe({
      next: (response) => {
        this.boards = response.data;
        this.boardsPage = response.page;
        this.boardsTotalPages = Math.max(response.totalPages, 1);
      },
      error: () => this.error = 'Boardovi nisu mogli da se učitaju.',
    });
  }

  loadWorkspaces(page = this.workspacesPage): void {
    this.workspacesLoading = true;
    this.error = null;
    this.workspacesService.getAdminWorkspaces(page, this.pageSize, this.workspaceSearch.trim()).pipe(
      take(1),
      finalize(() => { this.workspacesLoading = false; this.cdr.markForCheck(); }),
    ).subscribe({
      next: (response) => {
        this.workspaces = response.data;
        this.workspacesPage = response.page;
        this.workspacesTotalPages = Math.max(response.totalPages, 1);
      },
      error: () => this.error = 'Workspace-ovi nisu mogli da se učitaju.',
    });
  }

  showUser(user: User): void {
    this.selectedUser = user;
    this.editingUser = null;
    this.activitiesPage = 1;
    this.loadActivities();
  }

  loadActivities(page = this.activitiesPage): void {
    if (!this.selectedUser) return;
    this.activitiesLoading = true;
    this.usersService.getAdminUserActivities(this.selectedUser.id, page, this.pageSize).pipe(
      take(1),
      finalize(() => { this.activitiesLoading = false; this.cdr.markForCheck(); }),
    ).subscribe({
      next: (response) => {
        this.activities = response.data;
        this.activitiesPage = response.page;
        this.activitiesTotalPages = Math.max(response.totalPages, 1);
      },
      error: () => this.error = 'Aktivnosti nisu mogle da se učitaju.',
    });
  }

  startEdit(user: User): void {
    this.editingUser = user;
    this.selectedUser = null;
    this.editUserForm.setValue({
      displayName: user.displayName,
      email: user.email,
      avatarUrl: user.avatarUrl ?? '',
    });
  }

  cancelUserPanel(): void {
    this.selectedUser = null;
    this.editingUser = null;
    this.activities = [];
    this.editUserForm.reset();
  }

  @HostListener('document:keydown.escape')
  closeUserPanelOnEscape(): void {
    if (this.editingUser || this.selectedUser) this.cancelUserPanel();
  }

  saveUser(): void {
    if (!this.editingUser || this.editUserForm.invalid || this.busyId) {
      this.editUserForm.markAllAsTouched();
      return;
    }
    const userId = this.editingUser.id;
    const value = this.editUserForm.getRawValue();
    this.busyId = userId;
    this.usersService.updateUser(userId, {
      displayName: value.displayName.trim(),
      email: value.email.trim(),
      avatarUrl: value.avatarUrl.trim() || null,
    }).pipe(
      take(1),
      finalize(() => { this.busyId = null; this.cdr.markForCheck(); }),
    ).subscribe({
      next: () => { this.toast.success('Korisnik je sačuvan.'); this.cancelUserPanel(); this.loadUsers(); },
      error: () => this.toast.error('Izmena korisnika nije uspela.'),
    });
  }

  async changeRole(user: User): Promise<void> {
    if (this.busyId) return;
    const nextRole = user.userRole === 'ADMIN' ? 'USER' : 'ADMIN';
    if (!(await this.confirmModal.confirm('Promena globalne role', `Promeniti rolu korisnika ${user.displayName} u ${nextRole}?`, false))) return;
    this.busyId = user.id;
    this.usersService.updateUserRole(user.id, nextRole).pipe(
      take(1),
      finalize(() => { this.busyId = null; this.cdr.markForCheck(); }),
    ).subscribe({
      next: () => { this.toast.success('Globalna rola je promenjena.'); this.loadUsers(); },
      error: () => this.toast.error('Promena role nije uspela.'),
    });
  }

  async deleteUser(user: User): Promise<void> {
    if (this.busyId) return;
    const message = `Brisanje uklanja profil, membership-e, aktivnosti i workspace-ove koje korisnik poseduje, zajedno sa njihovim boardovima. Drugi korisnici ostaju sačuvani.`;
    if (!(await this.confirmModal.confirm(`Obrisati ${user.displayName}?`, message))) return;
    this.busyId = user.id;
    this.usersService.deleteUser(user.id).pipe(
      take(1),
      finalize(() => { this.busyId = null; this.cdr.markForCheck(); }),
    ).subscribe({
      next: () => {
        this.toast.success('Korisnik je obrisan.');
        this.cancelUserPanel();
        this.loadUsers(this.users.length === 1 && this.usersPage > 1 ? this.usersPage - 1 : this.usersPage);
      },
      error: () => this.toast.error('Brisanje korisnika nije uspelo.'),
    });
  }

  async deleteBoard(board: AdminBoard): Promise<void> {
    if (this.busyId || !(await this.confirmModal.confirm('Brisanje boarda', `Board \"${board.title}\" i njegov sadržaj biće trajno obrisani.`))) return;
    this.busyId = board.id;
    this.boardsService.deleteBoardAsAdmin(board.id).pipe(
      take(1),
      finalize(() => { this.busyId = null; this.cdr.markForCheck(); }),
    ).subscribe({
      next: () => { this.toast.success('Board je obrisan.'); this.loadBoards(this.boards.length === 1 && this.boardsPage > 1 ? this.boardsPage - 1 : this.boardsPage); },
      error: () => this.toast.error('Brisanje boarda nije uspelo.'),
    });
  }

  async deleteWorkspace(workspace: AdminWorkspace): Promise<void> {
    if (this.busyId || !(await this.confirmModal.confirm('Brisanje workspace-a', `Workspace \"${workspace.name}\" i njegovi boardovi biće trajno obrisani.`))) return;
    this.busyId = workspace.id;
    this.workspacesService.deleteWorkspaceAsAdmin(workspace.id).pipe(
      take(1),
      finalize(() => { this.busyId = null; this.cdr.markForCheck(); }),
    ).subscribe({
      next: () => { this.toast.success('Workspace je obrisan.'); this.loadWorkspaces(this.workspaces.length === 1 && this.workspacesPage > 1 ? this.workspacesPage - 1 : this.workspacesPage); },
      error: () => this.toast.error('Brisanje workspace-a nije uspelo.'),
    });
  }

}
