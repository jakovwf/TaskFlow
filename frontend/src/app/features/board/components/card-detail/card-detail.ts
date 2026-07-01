import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Attachment, BoardMember, Card, CardComment, CardLabel, CardMember, Label, User } from '../../../../store/models';

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
  @Input() commentSaving = false;
  @Input() commentsError: string | null = null;
  @Input() cardTitleSaving = false;
  @Input() cardTitleError: string | null = null;
  @Input() boardMembers: BoardMember[] = [];
  @Input() canManageMembers = false;
  @Input() boardLabels: Label[] = [];
  @Input() canManageLabels = false;
  @Input() labelSaving = false;
  @Input() labelError: string | null = null;
  @Input() memberAssignmentSaving = false;
  @Input() memberAssignmentError: string | null = null;
  @Input() attachmentUploading = false;
  @Input() attachmentDeletingId: string | null = null;
  @Input() attachmentError: string | null = null;
  @Input() currentUser: User | null = null;
  @Input() loading: boolean | null = false;

  @Output() close = new EventEmitter<void>();
  @Output() saveTitle = new EventEmitter<{ cardId: string; title: string }>();
  @Output() save = new EventEmitter<{ cardId: string; title: string; description?: string }>();
  @Output() delete = new EventEmitter<{ cardId: string; listId: string }>();
  @Output() assignMember = new EventEmitter<{ cardId: string; userId: string }>();
  @Output() unassignMember = new EventEmitter<{ cardId: string; userId: string }>();
  @Output() toggleLabel = new EventEmitter<{ cardId: string; labelId: string; assigned: boolean }>();
  @Output() createLabel = new EventEmitter<{ name: string; color: string }>();
  @Output() updateLabel = new EventEmitter<{ labelId: string; name: string; color: string }>();
  @Output() deleteLabel = new EventEmitter<string>();
  @Output() uploadAttachment = new EventEmitter<{ cardId: string; file: File }>();
  @Output() deleteAttachment = new EventEmitter<{ cardId: string; attachmentId: string }>();
  @Output() createComment = new EventEmitter<{ cardId: string; content: string }>();
  @Output() updateComment = new EventEmitter<{ cardId: string; commentId: string; content: string }>();
  @Output() deleteComment = new EventEmitter<{ cardId: string; commentId: string }>();

  newCommentContent = '';
  editingCommentId: string | null = null;
  editCommentContent = '';
  selectedMemberId = '';
  newLabelName = '';
  newLabelColor = '#2563eb';
  editingLabelId: string | null = null;
  editLabelName = '';
  editLabelColor = '#2563eb';
  failedAttachmentPreviewIds = new Set<string>();

  readonly form = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(1)]],
    description: [''],
  });

  ngOnChanges(changes: SimpleChanges): void {
    if ('card' in changes) {
      if (!this.card) {
        this.resetCommentEditor();
        this.newCommentContent = '';
        this.selectedMemberId = '';
        this.resetLabelEditor();
        this.failedAttachmentPreviewIds.clear();
        return;
      }

      this.form.setValue({
        title: this.card.title,
        description: this.card.description ?? '',
      });
      this.resetCommentEditor();
      this.newCommentContent = '';
      this.selectedMemberId = '';
      this.resetLabelEditor();
      this.failedAttachmentPreviewIds.clear();
    }

    if ('cardTitleError' in changes && this.cardTitleError && this.card) {
      this.form.controls.title.setValue(this.card.title);
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

  commitTitle(): void {
    if (!this.card || this.cardTitleSaving) {
      return;
    }

    const title = this.form.controls.title.value.trim();

    if (!title) {
      this.form.controls.title.setValue(this.card.title);
      return;
    }

    if (title === this.card.title) {
      this.form.controls.title.setValue(this.card.title);
      return;
    }

    this.saveTitle.emit({
      cardId: this.card.id,
      title,
    });
  }

  cancelTitle(): void {
    if (!this.card) {
      return;
    }

    this.form.controls.title.setValue(this.card.title);
  }

  handleTitleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.commitTitle();
      (event.target as HTMLInputElement | null)?.blur();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelTitle();
      (event.target as HTMLInputElement | null)?.blur();
    }
  }

  emitDelete(): void {
    if (!this.card) {
      return;
    }

    this.delete.emit({ cardId: this.card.id, listId: this.card.listId });
  }

  emitAssignMember(): void {
    if (!this.card || !this.selectedMemberId || this.memberAssignmentSaving) {
      return;
    }

    this.assignMember.emit({
      cardId: this.card.id,
      userId: this.selectedMemberId,
    });
    this.selectedMemberId = '';
  }

  emitUnassignMember(userId: string): void {
    if (!this.card || this.memberAssignmentSaving) {
      return;
    }

    this.unassignMember.emit({
      cardId: this.card.id,
      userId,
    });
  }

  cardLabels(): CardLabel[] {
    return this.card?.labels ?? [];
  }

  isLabelAssigned(labelId: string): boolean {
    return this.cardLabels().some((cardLabel) => cardLabel.labelId === labelId);
  }

  emitToggleLabel(event: Event, labelId: string): void {
    if (!this.card || this.labelSaving) {
      return;
    }

    this.toggleLabel.emit({
      cardId: this.card.id,
      labelId,
      assigned: (event.target as HTMLInputElement).checked,
    });
  }

  emitCreateLabel(): void {
    const name = this.newLabelName.trim();

    if (!name || this.labelSaving) {
      return;
    }

    this.createLabel.emit({ name, color: this.newLabelColor });
    this.newLabelName = '';
  }

  startEditLabel(label: Label): void {
    this.editingLabelId = label.id;
    this.editLabelName = label.name;
    this.editLabelColor = label.color;
  }

  cancelEditLabel(): void {
    this.resetLabelEditor();
  }

  emitUpdateLabel(): void {
    const name = this.editLabelName.trim();

    if (!this.editingLabelId || !name || this.labelSaving) {
      return;
    }

    this.updateLabel.emit({
      labelId: this.editingLabelId,
      name,
      color: this.editLabelColor,
    });
    this.resetLabelEditor();
  }

  emitDeleteLabel(labelId: string): void {
    if (!this.labelSaving) {
      this.deleteLabel.emit(labelId);
    }
  }

  emitUploadAttachment(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];

    if (!this.card || !file || this.attachmentUploading) {
      return;
    }

    this.uploadAttachment.emit({
      cardId: this.card.id,
      file,
    });

    if (input) {
      input.value = '';
    }
  }

  emitDeleteAttachment(attachmentId: string): void {
    if (!this.card || this.attachmentDeletingId) {
      return;
    }

    this.deleteAttachment.emit({
      cardId: this.card.id,
      attachmentId,
    });
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

  assignedMembers(): CardMember[] {
    return this.card?.members ?? [];
  }

  attachments(): Attachment[] {
    return this.card?.attachments ?? [];
  }

  canDeleteAttachment(attachment: Attachment): boolean {
    if (!this.currentUser) {
      return false;
    }

    if (attachment.uploadedById === this.currentUser.id) {
      return true;
    }

    const role = this.boardMembers.find((member) => member.userId === this.currentUser?.id)?.role;

    return role === 'OWNER' || role === 'ADMIN';
  }

  isImageAttachment(attachment: Attachment): boolean {
    if (this.failedAttachmentPreviewIds.has(attachment.id)) {
      return false;
    }

    if (attachment.mimeType) {
      return attachment.mimeType.startsWith('image/');
    }

    return ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(this.attachmentExtension(attachment));
  }

  attachmentKind(attachment: Attachment): string {
    if (this.isPdfAttachment(attachment)) {
      return 'PDF';
    }

    if (this.isImageAttachment(attachment)) {
      return 'Slika';
    }

    return 'Fajl';
  }

  attachmentBadgeLabel(attachment: Attachment): string {
    if (this.isPdfAttachment(attachment)) {
      return 'PDF';
    }

    if (this.isImageAttachment(attachment)) {
      return 'IMG';
    }

    return 'FILE';
  }

  markAttachmentPreviewFailed(attachmentId: string): void {
    this.failedAttachmentPreviewIds = new Set([...this.failedAttachmentPreviewIds, attachmentId]);
  }

  getAttachmentDownloadUrl(attachment: Attachment): string {
    if (!attachment.url) {
      return '#';
    }

    if (attachment.url.includes('/upload/fl_attachment/')) {
      return attachment.url;
    }

    if (attachment.url.includes('/upload/')) {
      return attachment.url.replace('/upload/', '/upload/fl_attachment/');
    }

    return attachment.url;
  }

  openAttachment(attachment: Attachment): void {
    if (attachment.mimeType?.startsWith('image/')) {
      window.open(attachment.url, '_blank');
      return;
    }

    if (attachment.mimeType === 'application/pdf') {
      const viewerUrl = attachment.url.replace(
        '/raw/upload/',
        '/raw/upload/fl_attachment:false/',
      );
      window.open(viewerUrl, '_blank');
      return;
    }

    window.open(attachment.url, '_blank');
  }

  availableBoardMembers(): BoardMember[] {
    const assignedUserIds = new Set(this.assignedMembers().map((member) => member.userId));

    return this.boardMembers.filter((member) => !assignedUserIds.has(member.userId));
  }

  displayUser(user: User | undefined | null): string {
    return user?.displayName || user?.email || 'Korisnik';
  }

  userInitial(user: User | undefined | null): string {
    return this.displayUser(user).slice(0, 1).toUpperCase();
  }

  private isPdfAttachment(attachment: Attachment): boolean {
    return attachment.mimeType === 'application/pdf' || this.attachmentExtension(attachment) === 'pdf';
  }

  private attachmentExtension(attachment: Attachment): string {
    const filename = attachment.filename.toLowerCase();
    const extension = filename.includes('.') ? filename.split('.').pop() : '';

    return extension ?? '';
  }

  private resetCommentEditor(): void {
    this.editingCommentId = null;
    this.editCommentContent = '';
  }

  private resetLabelEditor(): void {
    this.editingLabelId = null;
    this.editLabelName = '';
    this.editLabelColor = '#2563eb';
  }
}
