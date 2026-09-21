import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, firstValueFrom, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthTokens, User } from '../models/user.model';

const ACCESS_KEY = 'civicpulse_access';
const REFRESH_KEY = 'civicpulse_refresh';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  get isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  get isAdmin(): boolean {
    return this.currentUser?.role === 'admin';
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  }

  register(payload: { username: string; email: string; password: string; phone?: string }): Observable<User> {
    return this.http.post<User>(`${environment.apiUrl}/auth/register/`, payload);
  }

  login(username: string, password: string): Observable<AuthTokens> {
    return this.http.post<AuthTokens>(`${environment.apiUrl}/auth/login/`, { username, password }).pipe(
      tap((tokens) => {
        localStorage.setItem(ACCESS_KEY, tokens.access);
        localStorage.setItem(REFRESH_KEY, tokens.refresh);
        this.fetchMe().subscribe();
      })
    );
  }

  refreshAccessToken(): Observable<{ access: string }> {
    return this.http
      .post<{ access: string }>(`${environment.apiUrl}/auth/refresh/`, { refresh: this.getRefreshToken() })
      .pipe(tap((res) => localStorage.setItem(ACCESS_KEY, res.access)));
  }

  fetchMe(): Observable<User> {
    return this.http.get<User>(`${environment.apiUrl}/auth/me/`).pipe(tap((user) => this.currentUserSubject.next(user)));
  }

  updateMe(payload: { email?: string; phone?: string }): Observable<User> {
    return this.http
      .patch<User>(`${environment.apiUrl}/auth/me/`, payload)
      .pipe(tap((user) => this.currentUserSubject.next(user)));
  }

  async bootstrap(): Promise<void> {
    if (!this.getAccessToken()) {
      return;
    }
    try {
      await firstValueFrom(this.fetchMe());
    } catch {
      this.logout();
    }
  }

  logout(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    this.currentUserSubject.next(null);
  }
}
