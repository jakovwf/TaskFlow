import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Card } from '../../../../store/models';

@Component({
  selector: 'app-board-card',
  imports: [],
  templateUrl: './board-card.html',
  styleUrl: './board-card.scss',
})
export class BoardCard {
  @Input({ required: true }) card!: Card;

  @Output() selected = new EventEmitter<Card>();

  selectCard(): void {
    this.selected.emit(this.card);
  }
}
