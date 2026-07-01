import { Injectable, signal } from '@angular/core';

export interface ConfirmModalState {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  danger: boolean;
}

@Injectable({ providedIn: 'root' })
export class ConfirmModalService {
  private readonly modalState = signal<ConfirmModalState | null>(null);
  private resolver: ((confirmed: boolean) => void) | null = null;

  readonly state = this.modalState.asReadonly();

  confirm(title: string, message: string, danger = true): Promise<boolean> {
    this.resolve(false);
    this.modalState.set({
      title,
      message,
      confirmText: 'Potvrdi',
      cancelText: 'Otkaži',
      danger,
    });

    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
    });
  }

  resolve(confirmed: boolean): void {
    this.resolver?.(confirmed);
    this.resolver = null;
    this.modalState.set(null);
  }
}
