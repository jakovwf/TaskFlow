import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Card, CardComment, User } from '../../../../store/models';

@Component({
  selector: 'app-card-detail',
  imports: [DatePipe, FormsModule, ReactiveFormsModule],
  templateUrl: './card-detail.html',
  styleUrl: './card-detail.scss',
})
export class CardDetailComponent implements OnChanges {
  private readonly formBuilder = inject(FormBuilder);

  @Input() card: Card | null = null;
  @Input() comments: CardComment[] = [];
  @Input() commentsLoading = false;
  @Input() commentsError: string | null = null;
  @Input() currentUser: User | null = null;
  @Input() loading: boolean | null = false;

  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<{ cardId: string; title: string; description?: string }>();
  @Output() delete = new EventEmitter<{ cardId: string; listId: string }>();
  @Output() createComment = new EventEmitter<{ cardId: string; content: string }>();
  @Output() updateComment = new EventEmitter<{ cardId: string; commentId: string; content: string }>();
  @Output() deleteComment = new EventEmitter<{ cardId: string; commentId: string }>();

  newCommentContent = '';
  editingCommentId: string | null = null;
  editCommentContent = '';

  readonly form = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(1)]],
    description: [''],
  });

  ngOnChanges(changes: SimpleChanges): void {
    if ('card' in changes) {
      if (!this.card) {
        this.resetCommentEditor();
        this.newCommentContent = '';
        return;
      }

      this.form.setValue({
        title: this.card.title,
        description: this.card.description ?? '',
      });
      this.resetCommentEditor();
      this.newCommentContent = '';
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

  emitCreateComment(): void {
    if (!this.card) {
      return;
    }

    const content = this.newCommentContent.trim();

    if (!content) {
      return;
    }

    this.createComment.emit({ cardId: this.card.id, content });
    this.newCommentContent = '';
  }

  startEditComment(comment: CardComment): void {
    this.editingCommentId = comment.id;
    this.editCommentContent = comment.content;
  }

  cancelEditComment(): void {
    this.resetCommentEditor();
  }

  emitUpdateComment(commentId: string): void {
    if (!this.card) {
      return;
    }

    const content = this.editCommentContent.trim();

    if (!content) {
      return;
    }

    this.updateComment.emit({ cardId: this.card.id, commentId, content });
    this.resetCommentEditor();
  }

  emitDeleteComment(commentId: string): void {
    if (!this.card) {
      return;
    }

    this.deleteComment.emit({ cardId: this.card.id, commentId });
  }

  canEditComment(comment: CardComment): boolean {
    return !!this.currentUser && comment.authorId === this.currentUser.id;
  }

  private resetCommentEditor(): void {
    this.editingCommentId = null;
    this.editCommentContent = '';
  }
}
