import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Workspace } from '../../store/models';

export interface CreateWorkspaceData {
  name: string;
}

export interface UpdateWorkspaceData {
  name?: string;
}

@Injectable({
  providedIn: 'root',
})
export class WorkspaceService {
  private readonly http = inject(HttpClient);
  private readonly workspacesApiUrl = `${environment.apiUrl}/workspaces`;

  getWorkspaces(): Observable<Workspace[]> {
    return this.http.get<Workspace[]>(this.workspacesApiUrl);
  }

  createWorkspace(data: CreateWorkspaceData): Observable<Workspace> {
    return this.http.post<Workspace>(this.workspacesApiUrl, data);
  }

  getWorkspace(id: string): Observable<Workspace> {
    return this.http.get<Workspace>(`${this.workspacesApiUrl}/${id}`);
  }

  updateWorkspace(id: string, data: UpdateWorkspaceData): Observable<Workspace> {
    return this.http.patch<Workspace>(`${this.workspacesApiUrl}/${id}`, data);
  }

  deleteWorkspace(id: string): Observable<Workspace> {
    return this.http.delete<Workspace>(`${this.workspacesApiUrl}/${id}`);
  }
}
