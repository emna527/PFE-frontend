import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UserDTO {
  id: number;
  nomComplet: string;
  email: string;
  role: string;
  tel?: string;
  telegram?: string;
  areaName?: string;
  status?: string;
  zoneId?: number;
  siteName?: string;     // ✅ ajouté
}

export interface CreateUserDTO {
  nomComplet: string;
  email: string;
  password: string;
  role: string;
  tel?: string;
  telegram?: string;
  zoneId?: number;       // ✅ ajouté
  siteName?: string;     // ✅ ajouté
  areaName?: string;  
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private baseUrl = 'http://localhost:8081/user';
  private authUrl = 'http://localhost:8081/api/auth';

  constructor(private http: HttpClient) {}

  getAllUsers(): Observable<UserDTO[]> {
    return this.http.get<UserDTO[]>(`${this.baseUrl}/all`);
  }

  createUser(user: CreateUserDTO): Observable<UserDTO> {
    return this.http.post<UserDTO>(`${this.baseUrl}`, user);
  }

  getPendingUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.authUrl}/requests/pending`);
  }

  approveUser(id: number, data: { zoneId: number, siteName: string }): Observable<any> {
    return this.http.put(`${this.authUrl}/requests/${id}/approve`, data);
  }

  rejectUser(id: number): Observable<any> {
    return this.http.delete(`${this.authUrl}/requests/${id}/reject`);
  }

  updateUser(id: number, user: Partial<UserDTO>): Observable<UserDTO> {
    return this.http.put<UserDTO>(`${this.baseUrl}/${id}`, user);
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}