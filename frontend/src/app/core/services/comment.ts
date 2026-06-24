import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CardComment } from '../../store/models';

@Injectable({
  providedIn: 'root',
})
export class CommentService {
  private readonly http = inject(HttpClient);

  getComments(cardId: string): Observable<CardComment[]> {
    return this.http.get<CardComment[]>(`${environment.apiUrl}/cards/${cardId}/comments`);
  }

  createComment(cardId: string, content: string): Observable<CardComment> {
    return this.http.post<CardComment>(`${environment.apiUrl}/cards/${cardId}/comments`, { content });
  }

  updateComment(commentId: string, content: string): Observable<CardComment> {
    return this.http.patch<CardComment>(`${environment.apiUrl}/comments/${commentId}`, { content });
  }

  deleteComment(commentId: string): Observable<CardComment> {
    return this.http.delete<CardComment>(`${environment.apiUrl}/comments/${commentId}`);
  }
}
