import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';

export interface AdminAccount {
  id: string;
  name: string;
  email: string;
  role: 'admin';
  isActive: boolean;
  createdAt?: string;
}

export interface CreateAdminInput {
  name: string;
  email: string;
  password: string;
}

export interface UpdateAdminInput {
  name?: string;
  email?: string;
  password?: string;
  isActive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class TeamService {
  constructor(private readonly http: HttpClient) {}

  getAdmins(): Observable<AdminAccount[]> {
    return this.http.get<AdminAccount[]>(`${API_BASE_URL}/users`, {
      withCredentials: true,
    });
  }

  createAdmin(input: CreateAdminInput): Observable<AdminAccount> {
    return this.http.post<AdminAccount>(`${API_BASE_URL}/users`, input, {
      withCredentials: true,
    });
  }

  updateAdmin(id: string, input: UpdateAdminInput): Observable<AdminAccount> {
    return this.http.patch<AdminAccount>(
      `${API_BASE_URL}/users/${encodeURIComponent(id)}`,
      input,
      { withCredentials: true },
    );
  }
}
