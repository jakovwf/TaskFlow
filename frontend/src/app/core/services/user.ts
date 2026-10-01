import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AdminActivity, PaginatedResponse, User } from '../../store/models';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly usersApiUrl = `${environment.apiUrl}/users`;

  updateUser(userId: string, data: Partial<Pick<User, 'displayName' | 'email' | 'avatarUrl'>>): Observable<User> {
    return this.http.patch<User>(`${this.usersApiUrl}/${userId}`, data);
  }

  searchUsers(query: string): Observable<User[]> {
    return this.http.get<User[]>(`${this.usersApiUrl}/search`, {
      params: { q: query },
    });
  }

  getAdminUsers(page: number, limit: number, search: string): Observable<PaginatedResponse<User>> {
    return this.http.get<PaginatedResponse<User>>(this.usersApiUrl, { params: { page, limit, search } });
  }

  getAdminUserActivities(userId: string, page: number, limit: number): Observable<PaginatedResponse<AdminActivity>> {
    return this.http.get<PaginatedResponse<AdminActivity>>(`${this.usersApiUrl}/${userId}/activities`, {
      params: { page, limit },
    });
  }

  updateUserRole(userId: string, userRole: 'ADMIN' | 'USER'): Observable<User> {
    return this.http.patch<User>(`${this.usersApiUrl}/${userId}/role`, { userRole });
  }

  deleteUser(userId: string): Observable<User> {
    return this.http.delete<User>(`${this.usersApiUrl}/${userId}`);
  }
}
