import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BoardList } from '../../store/models';

export interface CreateListData {
  title: string;
}

export interface UpdateListData {
  title?: string;
  accentColor?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class ListService {
  private readonly http = inject(HttpClient);

  createList(boardId: string, data: CreateListData): Observable<BoardList> {
    return this.http.post<BoardList>(`${environment.apiUrl}/boards/${boardId}/lists`, data);
  }

  updateList(listId: string, data: UpdateListData): Observable<BoardList> {
    return this.http.patch<BoardList>(`${environment.apiUrl}/lists/${listId}`, data);
  }

  deleteList(listId: string): Observable<BoardList> {
    return this.http.delete<BoardList>(`${environment.apiUrl}/lists/${listId}`);
  }
}
