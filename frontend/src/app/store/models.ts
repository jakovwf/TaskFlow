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
  createdAt?: string;
}

export interface BoardList {
  id: string;
  title: string;
  position: number;
  boardId: string;
  createdAt?: string;
  cards?: Card[];
}

export interface Board {
  id: string;
  title: string;
  description?: string | null;
  backgroundUrl?: string | null;
  workspaceId: string;
  createdAt?: string;
  members?: BoardMember[];
  workspace?: unknown;
  lists?: BoardList[];
  labels?: unknown[];
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
  relatedInvite?: unknown;
}

export interface AuthResponse {
  token?: string;
  accessToken?: string;
  user?: User;
}
