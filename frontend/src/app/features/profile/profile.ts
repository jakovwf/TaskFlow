import { AsyncPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { EMPTY, catchError, finalize, switchMap, take } from 'rxjs';
import { CloudinaryService } from '../../core/services/cloudinary.service';
import { PushNotificationService } from '../../core/services/push-notification.service';
import { UserService } from '../../core/services/user';
import { ToastService } from '../../shared/services/toast.service';
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
  private readonly cloudinaryService = inject(CloudinaryService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly pushService = inject(PushNotificationService);
  private readonly store = inject(Store);
  private readonly toastService = inject(ToastService);
  private readonly userService = inject(UserService);

  readonly currentUser$ = this.store.select(selectCurrentUser);
  readonly pushSubscription$ = this.pushService.subscription$;
  readonly pushSupported = this.pushService.isEnabled;
  loading = false;
  uploadLoading = false;
  uploadError: string | null = null;
  pushLoading = false;
  pushError: string | null = null;
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
          this.toastService.success('Profil je sačuvan.');
          this.store.dispatch(loadMe());
          this.cdr.markForCheck();
        },
        error: () => {
          this.toastService.error('Profil nije sačuvan. Pokušaj ponovo.');
          this.cdr.markForCheck();
        },
      });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    input.value = '';

    if (!file.type.startsWith('image/')) {
      this.uploadError = 'Dozvoljene su samo slike.';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.uploadError = 'Maksimalna veličina je 5MB.';
      return;
    }

    if (!this.currentUser) {
      this.uploadError = 'Korisnik nije učitan. Pokušaj ponovo.';
      return;
    }

    const userId = this.currentUser.id;
    this.uploadLoading = true;
    this.uploadError = null;
    this.cdr.markForCheck();

    this.cloudinaryService
      .uploadImage(file)
      .pipe(
        switchMap((avatarUrl) => this.userService.updateUser(userId, { avatarUrl })),
        catchError(() => {
          this.uploadError = 'Upload nije uspeo. Pokušaj ponovo.';
          this.cdr.markForCheck();
          return EMPTY;
        }),
        finalize(() => {
          this.uploadLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((updatedUser) => {
        this.currentUser = updatedUser;
        this.profileForm.controls.avatarUrl.setValue(updatedUser.avatarUrl ?? '');
        this.store.dispatch(loadMe());
        this.cdr.markForCheck();
      });
  }

  async onPushToggle(event: Event): Promise<void> {
    if (!this.pushSupported) {
      this.pushError = 'Push notifikacije nisu podržane u ovom browseru';
      return;
    }

    const enabled = (event.target as HTMLInputElement).checked;
    this.pushLoading = true;
    this.pushError = null;
    this.cdr.markForCheck();

    try {
      if (enabled) {
        await this.pushService.requestSubscription();
      } else {
        await this.pushService.cancelSubscription();
      }
    } catch (error: unknown) {
      this.pushError = this.getPushErrorMessage(error);
    } finally {
      this.pushLoading = false;
      this.cdr.markForCheck();
    }
  }

  private getPushErrorMessage(error: unknown): string {
    if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
      return 'Dozvola za notifikacije je blokirana. Omogući je u podešavanjima browsera.';
    }

    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'Backend nije dostupan ili je zahtev blokiran. Proveri mrežu i API adresu.';
      }

      if (error.status === 401) {
        return 'Sesija je istekla. Prijavi se ponovo pa uključi push notifikacije.';
      }

      return `Backend je odbio push zahtev (HTTP ${error.status}).`;
    }

    if (error instanceof Error) {
      if (error.message === 'VAPID_PUBLIC_KEY_MISSING') {
        return 'Backend nema podešen VAPID public key.';
      }

      if (error.message === 'SERVICE_WORKER_UNSUPPORTED') {
        return 'Ovaj browser ne podržava service worker.';
      }

      if (error.name === 'NotAllowedError') {
        return 'Browser nije dozvolio push notifikacije.';
      }

      if (error.name === 'InvalidStateError') {
        return 'Service worker nije spreman. Osveži stranicu i pokušaj ponovo.';
      }

      if (error.name === 'AbortError') {
        return 'Browser push servis je odbio registraciju. Proveri dozvole, ad blocker/VPN i pokušaj bez Incognito režima.';
      }
    }

    return 'Promena push notifikacija nije uspela. Pokušaj ponovo.';
  }

}
