import { Injectable, inject } from '@angular/core';
import {
  Attachment,
  BoardList,
  BoardMemberRole,
  Card,
  CardComment,
  CardLabel,
  User,
} from '../../store/models';
import { SocketService } from './socket.service';

@Injectable({ providedIn: 'root' })
export class BoardSocketService {
  private readonly socketService = inject(SocketService);

  readonly cardCreated$ = this.socketService.on<{ card: Card; listId: string }>('card:created');
  readonly cardUpdated$ = this.socketService.on<{ card: Card }>('card:updated');
  readonly cardDeleted$ = this.socketService.on<{ cardId: string; listId: string }>('card:deleted');
  readonly cardsReordered$ = this.socketService.on<{
    items: { id: string; listId: string; position: number }[];
  }>('cards:reordered');
  readonly listCreated$ = this.socketService.on<{ list: BoardList }>('list:created');
  readonly listUpdated$ = this.socketService.on<{ list: BoardList }>('list:updated');
  readonly listDeleted$ = this.socketService.on<{ listId: string }>('list:deleted');
  readonly listsReordered$ = this.socketService.on<{
    items: { id: string; position: number }[];
  }>('lists:reordered');
  readonly commentAdded$ = this.socketService.on<{
    comment: CardComment;
    cardId: string;
    boardId: string;
  }>('comment:added');
  readonly commentDeleted$ = this.socketService.on<{
    commentId: string;
    cardId: string;
    boardId: string;
  }>('comment:deleted');
  readonly cardLabelAdded$ = this.socketService.on<{
    cardId: string;
    label: CardLabel;
    boardId: string;
  }>('card:label:added');
  readonly cardLabelRemoved$ = this.socketService.on<{
    cardId: string;
    labelId: string;
    boardId: string;
  }>('card:label:removed');
  readonly cardMemberAdded$ = this.socketService.on<{
    cardId: string;
    user: User;
    boardId: string;
  }>('card:member:added');
  readonly cardMemberRemoved$ = this.socketService.on<{
    cardId: string;
    userId: string;
    boardId: string;
  }>('card:member:removed');
  readonly attachmentAdded$ = this.socketService.on<{
    attachment: Attachment;
    cardId: string;
    boardId: string;
  }>('attachment:added');
  readonly attachmentDeleted$ = this.socketService.on<{
    attachmentId: string;
    cardId: string;
    boardId: string;
  }>('attachment:deleted');
  readonly memberJoined$ = this.socketService.on<{
    user: User;
    role: BoardMemberRole;
    boardId: string;
  }>('member:joined');
  readonly boardUpdated$ = this.socketService.on<{
    boardId: string;
    title: string;
    description: string | null;
    backgroundUrl: string | null;
    backgroundColor: string | null;
  }>('board:updated');
}
