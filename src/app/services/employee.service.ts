import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface EmployeeDTO {
  id?: number;
  nomComplet: string;
  email: string;
  poste: string;
  departement: string;
  tel?: string;
  dateEmbauche?: string;
}

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private baseUrl = 'http://localhost:8081/employees';

  constructor(private http: HttpClient) {}

  getAll(): Observable<EmployeeDTO[]> {
    return this.http.get<EmployeeDTO[]>(`${this.baseUrl}/all`);
  }

  getById(id: number): Observable<EmployeeDTO> {
    return this.http.get<EmployeeDTO>(`${this.baseUrl}/${id}`);
  }

  create(employee: EmployeeDTO): Observable<EmployeeDTO> {
    return this.http.post<EmployeeDTO>(`${this.baseUrl}/add`, employee);
  }

  update(id: number, employee: EmployeeDTO): Observable<EmployeeDTO> {
    return this.http.put<EmployeeDTO>(`${this.baseUrl}/update/${id}`, employee);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/delete/${id}`);
  }
}