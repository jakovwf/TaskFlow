import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-confirm-modal',
  imports: [],
  templateUrl: './confirm-modal.html',
  styleUrl: './confirm-modal.scss',
})
export class ConfirmModalComponent {
  @Input() title = '';
  @Input() message = '';
  @Input() confirmText = 'Potvrdi';
  @Input() cancelText = 'Otkaži';
  @Input() danger = false;

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
}
