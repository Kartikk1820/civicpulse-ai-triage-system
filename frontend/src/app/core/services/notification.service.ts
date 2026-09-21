import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, tap } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../../environments/environment';
import { AppNotification } from '../models/notification.model';
import { WebSocketService } from './websocket.service';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);
  private ws = inject(WebSocketService);
  private auth = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  private notificationsSubject = new BehaviorSubject<AppNotification[]>([]);
  notifications$ = this.notificationsSubject.asObservable();

  get unreadCount(): number {
    return this.notificationsSubject.value.filter((n) => !n.is_read).length;
  }

  init(): void {
    if (!this.auth.isAuthenticated) {
      return;
    }
    this.fetchAll().subscribe();
    this.ws.connectNotifications();
    this.ws.notificationEvents$.subscribe((payload) => {
      this.notificationsSubject.next([
        { id: payload.id, issue: payload.issue_id, message: payload.message, is_read: false, created_at: payload.created_at },
        ...this.notificationsSubject.value,
      ]);
      this.snackBar.open(payload.message, 'View', { duration: 6000 });
    });
  }

  fetchAll() {
    return this.http
      .get<AppNotification[] | { results: AppNotification[] }>(`${environment.apiUrl}/notifications/`)
      .pipe(
        tap((res) => {
          const list = Array.isArray(res) ? res : res.results;
          this.notificationsSubject.next(list);
        })
      );
  }

  markRead(id: number) {
    return this.http.post(`${environment.apiUrl}/notifications/${id}/read/`, {}).pipe(
      tap(() => {
        this.notificationsSubject.next(
          this.notificationsSubject.value.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
      })
    );
  }

  markAllRead() {
    return this.http.post(`${environment.apiUrl}/notifications/read-all/`, {}).pipe(
      tap(() => {
        this.notificationsSubject.next(this.notificationsSubject.value.map((n) => ({ ...n, is_read: true })));
      })
    );
  }
}
