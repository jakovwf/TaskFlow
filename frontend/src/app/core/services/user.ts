import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../../store/models';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly usersApiUrl = `${environment.apiUrl}/users`;

  updateUser(userId: string, data: Partial<Pick<User, 'displayName' | 'avatarUrl'>>): Observable<User> {
    return this.http.patch<User>(`${this.usersApiUrl}/${userId}`, data);
  }

  searchUsers(query: string): Observable<User[]> {
    return this.http.get<User[]>(`${this.usersApiUrl}/search`, {
      params: { q: query },
    });
  }
}
