import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Board } from '../../store/models';

export interface CreateBoardData {
  title: string;
  description?: string;
  backgroundUrl?: string;
}

export interface UpdateBoardData {
  title?: string;
  description?: string;
  backgroundUrl?: string;
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
