import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Socket, io } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private readonly authService = inject(AuthService);
  private socket?: Socket;
  private activeBoardId?: string;
  private readonly listeners = new Map<string, Set<(data: unknown) => void>>();

  connect(token: string): void {
    const authToken = token || this.authService.getToken();

    if (!authToken) {
      return;
    }

    this.disconnect();
    this.socket = io(environment.apiUrl, {
      auth: { token: authToken },
      transports: ['websocket'],
    });

    this.listeners.forEach((listeners, event) => {
      listeners.forEach((listener) => this.socket?.on(event, listener));
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = undefined;
    this.activeBoardId = undefined;
  }

  joinBoard(boardId: string): void {
    if (this.activeBoardId && this.activeBoardId !== boardId) {
      this.socket?.emit('board:leave', { boardId: this.activeBoardId });
    }

    this.activeBoardId = boardId;
    this.socket?.emit('board:join', { boardId });
  }

  leaveBoard(boardId: string): void {
    this.socket?.emit('board:leave', { boardId });

    if (this.activeBoardId === boardId) {
      this.activeBoardId = undefined;
    }
  }

  leaveCurrentBoard(): void {
    if (this.activeBoardId) {
      this.leaveBoard(this.activeBoardId);
    }
  }

  on<T>(event: string): Observable<T> {
    return new Observable<T>((observer) => {
      const listener = (data: unknown) => observer.next(data as T);
      const eventListeners = this.listeners.get(event) ?? new Set<(data: unknown) => void>();
      eventListeners.add(listener);
      this.listeners.set(event, eventListeners);
      this.socket?.on(event, listener);

      return () => {
        this.socket?.off(event, listener);
        eventListeners.delete(listener);

        if (eventListeners.size === 0) {
          this.listeners.delete(event);
        }
      };
    });
  }

  get socketId(): string | undefined {
    return this.socket?.id;
  }
}
