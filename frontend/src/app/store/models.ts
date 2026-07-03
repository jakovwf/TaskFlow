export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  createdAt?: string;
}

export interface BoardMember {
  id: string;
  boardId: string;
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  user?: User;
}

export interface CardMember {
  id: string;
  cardId: string;
  userId: string;
  user?: User;
}

export interface Label {
  id: string;
  name: string;
  color: string;
  boardId: string;
}

export interface CardLabel {
  id: string;
  cardId: string;
  labelId: string;
  label: Label;
}

export interface Attachment {
  id: string;
  filename: string;
  url: string;
  publicId?: string | null;
  mimeType?: string | null;
  resourceType?: string | null;
  format?: string | null;
  cardId: string;
  uploadedById: string;
  createdAt: string;
  uploadedBy?: User;
}

export type BoardMemberRole = BoardMember['role'];
export type InviteStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';

export interface BoardInvite {
  id: string;
  token: string;
  invitedEmail: string;
  status: InviteStatus;
  role: BoardMemberRole;
  expiresAt: string;
  boardId?: string;
  invitedByUserId?: string;
  createdAt?: string;
  updatedAt?: string;
  board?: {
    id: string;
    title: string;
  };
  invitedBy?: User;
}

export interface AcceptInviteResponse {
  invite: BoardInvite;
  boardMember: BoardMember;
}

export type ActivityType =
  | 'CARD_CREATED'
  | 'CARD_MOVED'
  | 'CARD_UPDATED'
  | 'CARD_DELETED'
  | 'CARD_ASSIGNED'
  | 'CARD_UNASSIGNED'
  | 'COMMENT_ADDED'
  | 'COMMENT_DELETED'
  | 'LIST_CREATED'
  | 'LIST_RENAMED'
  | 'LIST_DELETED'
  | 'MEMBER_INVITED'
  | 'MEMBER_JOINED'
  | 'MEMBER_REMOVED'
  | 'BOARD_UPDATED';

export interface BoardActivityItem {
  id: string;
  type: ActivityType;
  payload: Record<string, unknown> | null;
  boardId: string;
  userId: string;
  createdAt: string;
  user?: User;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: 'OWNER' | 'MEMBER';
  user?: User;
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  createdAt?: string;
  owner?: User;
  members?: WorkspaceMember[];
}

export interface Card {
  id: string;
  title: string;
  description?: string | null;
  position: number;
  listId: string;
  dueDate?: string | null;
  isDone: boolean;
  coverColor?: string | null;
  createdAt?: string;
  list?: {
    id: string;
    title: string;
    boardId: string;
  };
  members?: CardMember[];
  attachments?: Attachment[];
  labels?: CardLabel[];
}

export interface CardComment {
  id: string;
  content: string;
  cardId: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  author?: User;
}

export interface BoardList {
  id: string;
  title: string;
  position: number;
  accentColor?: string | null;
  boardId: string;
  createdAt?: string;
  cards?: Card[];
}

export interface Board {
  id: string;
  title: string;
  description?: string | null;
  backgroundUrl?: string | null;
  backgroundColor?: string | null;
  workspaceId: string;
  createdAt?: string;
  members?: BoardMember[];
  workspace?: unknown;
  lists?: BoardList[];
  labels?: Label[];
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  message: string;
  isRead: boolean;
  relatedBoardId?: string | null;
  relatedCardId?: string | null;
  relatedInviteId?: string | null;
  createdAt?: string;
  relatedCard?: unknown;
  relatedInvite?: {
    id: string;
    token: string;
  } | null;
}

export interface NotificationPage {
  items: Notification[];
  page: number;
  limit: number;
  total: number;
  unreadCount: number;
  hasMore: boolean;
}

export interface AuthResponse {
  token?: string;
  accessToken?: string;
  user?: User;
}
