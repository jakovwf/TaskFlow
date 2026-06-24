import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Card } from '../../../../store/models';

@Component({
  selector: 'app-card-detail',
  imports: [ReactiveFormsModule],
  templateUrl: './card-detail.html',
  styleUrl: './card-detail.scss',
})
export class CardDetailComponent implements OnChanges {
  private readonly formBuilder = inject(FormBuilder);

  @Input() card: Card | null = null;
  @Input() loading: boolean | null = false;

  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<{ cardId: string; title: string; description?: string }>();
  @Output() delete = new EventEmitter<{ cardId: string; listId: string }>();

  readonly form = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(1)]],
    description: [''],
  });

  ngOnChanges(changes: SimpleChanges): void {
    if ('card' in changes && this.card) {
      this.form.setValue({
        title: this.card.title,
        description: this.card.description ?? '',
      });
    }
  }

  emitClose(): void {
    this.close.emit();
  }

  emitSave(): void {
    if (!this.card || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { title, description } = this.form.getRawValue();
    this.save.emit({
      cardId: this.card.id,
      title,
      description: description.trim() || undefined,
    });
  }

  emitDelete(): void {
    if (!this.card) {
      return;
    }

    this.delete.emit({ cardId: this.card.id, listId: this.card.listId });
  }
}
