import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BoardList, Card } from '../../../../store/models';
import { BoardCard } from '../board-card/board-card';
import { LIST_ACCENT_COLORS } from '../../appearance-options';

@Component({
  selector: 'app-board-list',
  imports: [BoardCard, DragDropModule, FormsModule],
  templateUrl: './board-list.html',
  styleUrl: './board-list.scss',
})
export class BoardListComponent implements OnChanges {
  @Input({ required: true }) list!: BoardList;
  @Input() connectedDropLists: string[] = [];
  @Input() loading: boolean | null = false;
  @Input() renaming = false;
  @Input() renameError: string | null = null;

  @Output() renameList = new EventEmitter<{ listId: string; title: string }>();
  @Output() deleteList = new EventEmitter<string>();
  @Output() createCard = new EventEmitter<{
    listId: string;
    title: string;
    description?: string;
  }>();
  @Output() cardSelected = new EventEmitter<Card>();
  @Output() cardDoneChange = new EventEmitter<{ cardId: string; isDone: boolean }>();
  @Output() accentColorChange = new EventEmitter<{ listId: string; accentColor: string | null }>();
  @Output() cardDropped = new EventEmitter<CdkDragDrop<Card[]>>();

  readonly emptyCards: Card[] = [];
  readonly accentColors = LIST_ACCENT_COLORS;
  editableListTitle = '';
  cardTitle = '';
  cardDescription = '';

  ngOnChanges(changes: SimpleChanges): void {
    if ('list' in changes || 'renameError' in changes) {
      this.editableListTitle = this.list.title;
    }
  }

  commitListTitle(): void {
    if (this.renaming) {
      return;
    }

    const trimmedTitle = this.editableListTitle.trim();

    if (!trimmedTitle) {
      this.editableListTitle = this.list.title;
      return;
    }

    if (trimmedTitle === this.list.title) {
      this.editableListTitle = this.list.title;
      return;
    }

    this.renameList.emit({ listId: this.list.id, title: trimmedTitle });
  }

  cancelListTitle(): void {
    this.editableListTitle = this.list.title;
  }

  handleListTitleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.commitListTitle();
      (event.target as HTMLInputElement | null)?.blur();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelListTitle();
      (event.target as HTMLInputElement | null)?.blur();
    }
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

  setAccentColor(accentColor: string | null): void {
    if (this.list.accentColor !== accentColor) {
      this.accentColorChange.emit({ listId: this.list.id, accentColor });
    }
  }
}
