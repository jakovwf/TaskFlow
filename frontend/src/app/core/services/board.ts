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
}
