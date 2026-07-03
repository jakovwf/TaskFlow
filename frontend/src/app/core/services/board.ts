import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Board, BoardActivityItem, BoardInvite, BoardMember, BoardMemberRole } from '../../store/models';

export interface CreateBoardData {
  title: string;
  description?: string;
  backgroundUrl?: string;
}

export interface UpdateBoardData {
  title?: string;
  description?: string;
  backgroundUrl?: string | null;
  backgroundColor?: string | null;
}

export interface CreateBoardInviteData {
  inviteeEmail: string;
}

export interface ReorderListItem {
  id: string;
  position: number;
}

export interface ReorderCardItem {
  id: string;
  listId: string;
  position: number;
}

@Injectable({
  providedIn: 'root',
})
export class BoardService {
  private readonly http = inject(HttpClient);
  private readonly boardsApiUrl = `${environment.apiUrl}/boards`;
  private readonly workspacesApiUrl = `${environment.apiUrl}/workspaces`;

  getBoards(): Observable<Board[]> {
    return this.http.get<Board[]>(this.boardsApiUrl);
  }

  createBoard(workspaceId: string, data: CreateBoardData): Observable<Board> {
    return this.http.post<Board>(`${this.workspacesApiUrl}/${workspaceId}/boards`, data);
  }

  getBoard(boardId: string): Observable<Board> {
    return this.http.get<Board>(`${this.boardsApiUrl}/${boardId}`);
  }

  getBoardMembers(boardId: string): Observable<BoardMember[]> {
    return this.http.get<BoardMember[]>(`${this.boardsApiUrl}/${boardId}/members`);
  }

  updateBoardMemberRole(boardId: string, userId: string, role: BoardMemberRole): Observable<BoardMember> {
    return this.http.patch<BoardMember>(`${this.boardsApiUrl}/${boardId}/members/${userId}`, { role });
  }

  removeBoardMember(boardId: string, userId: string): Observable<BoardMember> {
    return this.http.delete<BoardMember>(`${this.boardsApiUrl}/${boardId}/members/${userId}`);
  }

  getBoardInvites(boardId: string): Observable<BoardInvite[]> {
    return this.http.get<BoardInvite[]>(`${this.boardsApiUrl}/${boardId}/invites`);
  }

  getBoardActivity(boardId: string): Observable<BoardActivityItem[]> {
    return this.http.get<BoardActivityItem[]>(`${this.boardsApiUrl}/${boardId}/activity`);
  }

  createBoardInvite(boardId: string, data: CreateBoardInviteData): Observable<BoardInvite> {
    return this.http.post<BoardInvite>(`${this.boardsApiUrl}/${boardId}/invites`, data);
  }

  deleteBoardInvite(boardId: string, inviteId: string): Observable<BoardInvite> {
    return this.http.delete<BoardInvite>(`${this.boardsApiUrl}/${boardId}/invites/${inviteId}`);
  }

  updateBoard(boardId: string, data: UpdateBoardData): Observable<Board> {
    return this.http.patch<Board>(`${this.boardsApiUrl}/${boardId}`, data);
  }

  deleteBoard(boardId: string): Observable<Board> {
    return this.http.delete<Board>(`${this.boardsApiUrl}/${boardId}`);
  }

  reorderLists(boardId: string, items: ReorderListItem[]): Observable<Board['lists']> {
    return this.http.patch<Board['lists']>(`${this.boardsApiUrl}/${boardId}/lists/reorder`, {
      items,
    });
  }

  reorderCards(boardId: string, items: ReorderCardItem[]): Observable<NonNullable<Board['lists']>[number]['cards']> {
    return this.http.patch<NonNullable<Board['lists']>[number]['cards']>(
      `${this.boardsApiUrl}/${boardId}/cards/reorder`,
      { items },
    );
  }
}
