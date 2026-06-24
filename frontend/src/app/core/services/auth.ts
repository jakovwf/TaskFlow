import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { finalize, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, User } from '../../store/models';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly tokenKey = 'auth_token';
  private readonly authApiUrl = `${environment.apiUrl}/auth`;

  constructor(private readonly http: HttpClient) {}

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.authApiUrl}/login`, { email, password })
      .pipe(tap((response) => this.storeTokenFromResponse(response)));
  }

  register(email: string, password: string, displayName: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.authApiUrl}/register`, { email, password, displayName })
      .pipe(tap((response) => this.storeTokenFromResponse(response)));
  }

  logout(): Observable<unknown> {
    return this.http.post<unknown>(`${this.authApiUrl}/logout`, {}).pipe(finalize(() => this.clearToken()));
  }

  clearToken(): void {
    localStorage.removeItem(this.tokenKey);
  }

  me(): Observable<User> {
    return this.http.get<User>(`${this.authApiUrl}/me`);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  private storeTokenFromResponse(response: AuthResponse): void {
    const token = response.token ?? response.accessToken;

    if (token) {
      localStorage.setItem(this.tokenKey, token);
    }
  }
}
