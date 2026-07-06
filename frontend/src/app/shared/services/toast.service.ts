import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
  visible: boolean;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toastMessages = signal<ToastMessage[]>([]);
  private nextId = 0;

  readonly toasts = this.toastMessages.asReadonly();

  success(message: string): void {
    this.add(message, 'success');
  }

  error(message: string): void {
    this.add(message, 'error');
  }

  warning(message: string): void {
    this.add(message, 'warning');
  }

  info(message: string): void {
    this.add(message, 'info');
  }

  dismiss(id: number): void {
    this.toastMessages.update((toasts) =>
      toasts.map((toast) => (toast.id === id ? { ...toast, visible: false } : toast)),
    );
    setTimeout(() => {
      this.toastMessages.update((toasts) => toasts.filter((toast) => toast.id !== id));
    }, 300);
  }

  private add(message: string, type: ToastType): void {
    const toast: ToastMessage = { id: ++this.nextId, message, type, visible: false };
    this.toastMessages.update((toasts) => [...toasts, toast].slice(-3));
    setTimeout(() => {
      this.toastMessages.update((toasts) =>
        toasts.map((item) => (item.id === toast.id ? { ...item, visible: true } : item)),
      );
    });
    setTimeout(() => this.dismiss(toast.id), 3000);
  }
}
