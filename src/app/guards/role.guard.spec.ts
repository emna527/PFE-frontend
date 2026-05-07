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
}

export interface CreateUserDTO {
  nomComplet: string;
  email: string;
  password: string;
  role: string;
  tel?: string;
  telegram?: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private baseUrl = 'http://localhost:8081/user';

  constructor(private http: HttpClient) {}

  getAllUsers(): Observable<UserDTO[]> {
    return this.http.get<UserDTO[]>(`${this.baseUrl}/all`);
  }

  createUser(user: CreateUserDTO): Observable<UserDTO> {
    return this.http.post<UserDTO>(`${this.baseUrl}`, user);
  }

  updateUser(id: number, user: Partial<UserDTO>): Observable<UserDTO> {
    return this.http.put<UserDTO>(`${this.baseUrl}/${id}`, user); 
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`); 
  }
}