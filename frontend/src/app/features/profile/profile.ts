import { AsyncPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { finalize, take } from 'rxjs';
import { UserService } from '../../core/services/user';
import { loadMe } from '../../store/auth/auth.actions';
import { selectCurrentUser } from '../../store/auth/auth.selectors';
import { User } from '../../store/models';

@Component({
  selector: 'app-profile',
  imports: [AsyncPipe, ReactiveFormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly formBuilder = inject(FormBuilder);
  private readonly store = inject(Store);
  private readonly userService = inject(UserService);

  readonly currentUser$ = this.store.select(selectCurrentUser);
  loading = false;
  error: string | null = null;
  successMessage: string | null = null;
  private currentUser: User | null = null;

  readonly profileForm = this.formBuilder.nonNullable.group({
    displayName: ['', [Validators.required, Validators.minLength(1)]],
    avatarUrl: [''],
  });

  constructor() {
    this.currentUser$
      .pipe(takeUntilDestroyed())
      .subscribe((user) => {
        this.currentUser = user;

        if (user && !this.profileForm.dirty) {
          this.profileForm.setValue({
            displayName: user.displayName ?? '',
            avatarUrl: user.avatarUrl ?? '',
          });
        }

        this.cdr.markForCheck();
      });
  }

  saveProfile(): void {
    if (!this.currentUser || this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const { displayName, avatarUrl } = this.profileForm.getRawValue();
    const trimmedDisplayName = displayName.trim();

    if (!trimmedDisplayName) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = null;
    this.successMessage = null;
    this.cdr.markForCheck();

    this.userService
      .updateUser(this.currentUser.id, {
        displayName: trimmedDisplayName,
        avatarUrl: avatarUrl.trim() || null,
      })
      .pipe(
        take(1),
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (user) => {
          this.profileForm.markAsPristine();
          this.profileForm.setValue({
            displayName: user.displayName ?? '',
            avatarUrl: user.avatarUrl ?? '',
          });
          this.successMessage = 'Profil je sacuvan.';
          this.store.dispatch(loadMe());
          this.cdr.markForCheck();
        },
        error: (error: unknown) => {
          this.error = this.getErrorMessage(error);
          this.cdr.markForCheck();
        },
      });
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401) {
        return 'Morate biti prijavljeni da biste izmenili profil.';
      }

      if (error.status === 403) {
        return 'Mozete menjati samo svoj profil.';
      }

      if (error.status === 404) {
        return 'Korisnik nije pronadjen.';
      }
    }

    return 'Profil nije sacuvan. Pokusaj ponovo.';
  }
}
