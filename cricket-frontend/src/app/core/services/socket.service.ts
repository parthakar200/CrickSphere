import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { TokenStorageService } from './token-storage.service';

/**
 * Wraps the raw socket.io-client connection. One socket per browser tab,
 * created lazily on first use and authenticated with the current access
 * token (read fresh at connect time, not cached, since it can be rotated by
 * the HTTP refresh interceptor independently of this socket's lifecycle).
 */
@Injectable({ providedIn: 'root' })
export class SocketService {
  private tokens = inject(TokenStorageService);
  private socket: Socket | null = null;

  private connect(): Socket {
    if (this.socket?.connected) return this.socket;

    this.socket = io(environment.socketUrl, {
      auth: { token: this.tokens.getAccessToken() },
      transports: ['websocket', 'polling'],
    });
    return this.socket;
  }

  joinMatch(matchId: string): void {
    this.connect().emit('match:join', { matchId });
  }

  leaveMatch(matchId: string): void {
    this.socket?.emit('match:leave', { matchId });
  }

  /** Generic typed listener factory — wraps socket.on/off as an Observable so it auto-cleans on unsubscribe. */
  on<T>(event: string): Observable<T> {
    return new Observable<T>((subscriber) => {
      const socket = this.connect();
      const handler = (payload: T) => subscriber.next(payload);
      socket.on(event, handler);
      return () => socket.off(event, handler);
    });
  }

  emitWithAck<TPayload, TAck>(event: string, payload: TPayload): Promise<TAck> {
    return new Promise((resolve) => {
      this.connect().emit(event, payload, (ack: TAck) => resolve(ack));
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }
}
