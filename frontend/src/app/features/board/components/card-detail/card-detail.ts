import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { take } from 'rxjs';
import { CommentService } from '../../../../core/services/comment';
import { Card, CardComment, User } from '../../../../store/models';

@Component({
  selector: 'app-card-detail',
  imports: [DatePipe, FormsModule, ReactiveFormsModule],
  templateUrl: './card-detail.html',
  styleUrl: './card-detail.scss',
})
export class CardDetailComponent implements OnChanges {
  private readonly commentService = inject(CommentService);
  private readonly formBuilder = inject(FormBuilder);

  @Input() card: Card | null = null;
  @Input() currentUser: User | null = null;
  @Input() loading: boolean | null = false;

  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<{ cardId: string; title: string; description?: string }>();
  @Output() delete = new EventEmitter<{ cardId: string; listId: string }>();

  comments: CardComment[] = [];
  commentsLoading = false;
  commentsError: string | null = null;
  newCommentContent = '';
  editingCommentId: string | null = null;
  editCommentContent = '';

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
      this.resetCommentEditor();
      this.loadComments(this.card.id);
    }

    if ('card' in changes && !this.card) {
      this.comments = [];
      this.resetCommentEditor();
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

  createComment(): void {
    if (!this.card) {
      return;
    }

    const content = this.newCommentContent.trim();

    if (!content) {
      return;
    }

    this.commentsLoading = true;
    this.commentsError = null;
    this.commentService
      .createComment(this.card.id, content)
      .pipe(take(1))
      .subscribe({
        next: (comment) => {
          this.comments = [...this.comments, comment];
          this.newCommentContent = '';
          this.commentsLoading = false;
        },
        error: () => {
          this.commentsError = 'Komentar nije sacuvan.';
          this.commentsLoading = false;
        },
      });
  }

  startEditComment(comment: CardComment): void {
    this.editingCommentId = comment.id;
    this.editCommentContent = comment.content;
    this.commentsError = null;
  }

  cancelEditComment(): void {
    this.resetCommentEditor();
  }

  updateComment(commentId: string): void {
    const content = this.editCommentContent.trim();

    if (!content) {
      return;
    }

    this.commentsLoading = true;
    this.commentsError = null;
    this.commentService
      .updateComment(commentId, content)
      .pipe(take(1))
      .subscribe({
        next: (updatedComment) => {
          this.comments = this.comments.map((comment) =>
            comment.id === updatedComment.id ? updatedComment : comment,
          );
          this.resetCommentEditor();
          this.commentsLoading = false;
        },
        error: () => {
          this.commentsError = 'Komentar nije izmenjen.';
          this.commentsLoading = false;
        },
      });
  }

  deleteComment(commentId: string): void {
    this.commentsLoading = true;
    this.commentsError = null;
    this.commentService
      .deleteComment(commentId)
      .pipe(take(1))
      .subscribe({
        next: (deletedComment) => {
          this.comments = this.comments.filter((comment) => comment.id !== deletedComment.id);
          this.commentsLoading = false;
        },
        error: () => {
          this.commentsError = 'Komentar nije obrisan.';
          this.commentsLoading = false;
        },
      });
  }

  canEditComment(comment: CardComment): boolean {
    return !!this.currentUser && comment.authorId === this.currentUser.id;
  }

  private loadComments(cardId: string): void {
    this.commentsLoading = true;
    this.commentsError = null;
    this.commentService
      .getComments(cardId)
      .pipe(take(1))
      .subscribe({
        next: (comments) => {
          this.comments = comments;
          this.commentsLoading = false;
        },
        error: () => {
          this.commentsError = 'Komentari nisu ucitani.';
          this.commentsLoading = false;
        },
      });
  }

  private resetCommentEditor(): void {
    this.editingCommentId = null;
    this.editCommentContent = '';
  }
}
