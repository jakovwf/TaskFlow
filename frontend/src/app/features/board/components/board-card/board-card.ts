import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CdkDragHandle } from '@angular/cdk/drag-drop';
import { Card } from '../../../../store/models';

@Component({
  selector: 'app-board-card',
  imports: [CdkDragHandle],
  templateUrl: './board-card.html',
  styleUrl: './board-card.scss',
})
export class BoardCard {
  @Input({ required: true }) card!: Card;

  @Output() selected = new EventEmitter<Card>();
  @Output() doneChange = new EventEmitter<{ cardId: string; isDone: boolean }>();

  selectCard(): void {
    this.selected.emit(this.card);
  }

  handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.selectCard();
    }
  }

  toggleDone(event: Event): void {
    event.stopPropagation();
    this.doneChange.emit({
      cardId: this.card.id,
      isDone: (event.target as HTMLInputElement).checked,
    });
  }
}
