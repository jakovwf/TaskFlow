import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BoardList, Card } from '../../../../store/models';
import { BoardCard } from '../board-card/board-card';

@Component({
  selector: 'app-board-list',
  imports: [BoardCard, DragDropModule, FormsModule],
  templateUrl: './board-list.html',
  styleUrl: './board-list.scss',
})
export class BoardListComponent {
  @Input({ required: true }) list!: BoardList;
  @Input() connectedDropLists: string[] = [];
  @Input() loading: boolean | null = false;

  @Output() renameList = new EventEmitter<{ listId: string; title: string }>();
  @Output() deleteList = new EventEmitter<string>();
  @Output() createCard = new EventEmitter<{
    listId: string;
    title: string;
    description?: string;
  }>();
  @Output() cardSelected = new EventEmitter<Card>();
  @Output() cardDropped = new EventEmitter<CdkDragDrop<Card[]>>();

  readonly emptyCards: Card[] = [];
  cardTitle = '';
  cardDescription = '';

  emitRename(title: string): void {
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      return;
    }

    this.renameList.emit({ listId: this.list.id, title: trimmedTitle });
  }

  emitDelete(): void {
    this.deleteList.emit(this.list.id);
  }

  emitCreateCard(): void {
    const title = this.cardTitle.trim();
    const description = this.cardDescription.trim();

    if (!title) {
      return;
    }

    this.createCard.emit({
      listId: this.list.id,
      title,
      description: description || undefined,
    });
    this.cardTitle = '';
    this.cardDescription = '';
  }

  emitCardDrop(event: CdkDragDrop<Card[]>): void {
    this.cardDropped.emit(event);
  }
}
