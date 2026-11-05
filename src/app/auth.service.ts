import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { map, Observable, tap } from 'rxjs';
import { API_BASE_URL } from './api.config';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin';
  isActive: boolean;
}

interface AuthResponse {
  user: AppUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly user = signal<AppUser | null>(null);

  constructor(private readonly http: HttpClient) {}

  login(email: string, password: string): Observable<AppUser> {
    return this.http
      .post<AuthResponse>(
        `${API_BASE_URL}/auth/login`,
        { email, password },
        { withCredentials: true },
      )
      .pipe(
        map((response) => response.user),
        tap((user) => this.user.set(user)),
      );
  }

  getCurrentUser(): Observable<AppUser> {
    return this.http
      .get<AppUser>(`${API_BASE_URL}/auth/me`, { withCredentials: true })
      .pipe(tap((user) => this.user.set(user)));
  }

  logout(): Observable<void> {
    return this.http
      .post<{ success: true }>(
        `${API_BASE_URL}/auth/logout`,
        {},
        { withCredentials: true },
      )
      .pipe(
        map(() => undefined),
        tap(() => this.user.set(null)),
      );
  }

  setUser(user: AppUser | null): void {
    this.user.set(user);
  }
}
