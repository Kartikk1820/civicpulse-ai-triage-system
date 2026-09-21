import { Injectable, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

const RECONNECT_DELAY_MS = 3000;

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private auth = inject(AuthService);

  private issuesSocket?: WebSocket;
  private notificationsSocket?: WebSocket;

  private issuesSubject = new Subject<any>();
  private notificationsSubject = new Subject<any>();

  issueEvents$ = this.issuesSubject.asObservable();
  notificationEvents$ = this.notificationsSubject.asObservable();

  connectIssuesFeed(): void {
    if (this.issuesSocket && this.issuesSocket.readyState <= WebSocket.OPEN) {
      return;
    }
    this.open(`${environment.wsUrl}/issues/`, this.issuesSubject, (socket) => (this.issuesSocket = socket), () =>
      this.connectIssuesFeed()
    );
  }

  connectNotifications(): void {
    const token = this.auth.getAccessToken();
    if (!token) {
      return;
    }
    if (this.notificationsSocket && this.notificationsSocket.readyState <= WebSocket.OPEN) {
      return;
    }
    this.open(
      `${environment.wsUrl}/notifications/?token=${encodeURIComponent(token)}`,
      this.notificationsSubject,
      (socket) => (this.notificationsSocket = socket),
      () => this.connectNotifications()
    );
  }

  disconnectAll(): void {
    this.issuesSocket?.close();
    this.notificationsSocket?.close();
    this.issuesSocket = undefined;
    this.notificationsSocket = undefined;
  }

  private open(url: string, subject: Subject<any>, assign: (s: WebSocket) => void, reconnect: () => void): void {
    const socket = new WebSocket(url);
    assign(socket);

    socket.onmessage = (event) => {
      try {
        subject.next(JSON.parse(event.data));
      } catch {
        // ignore malformed payloads
      }
    };

    socket.onclose = () => {
      setTimeout(reconnect, RECONNECT_DELAY_MS);
    };

    socket.onerror = () => {
      socket.close();
    };
  }
}
