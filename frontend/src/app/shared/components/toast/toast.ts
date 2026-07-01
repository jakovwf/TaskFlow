import { Component, inject } from '@angular/core';
import { ToastService, ToastType } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  imports: [],
  templateUrl: './toast.html',
  styleUrl: './toast.scss',
})
export class ToastComponent {
  readonly toastService = inject(ToastService);

  icon(type: ToastType): string {
    return { success: '✓', error: '!', warning: '⚠', info: 'i' }[type];
  }
}
