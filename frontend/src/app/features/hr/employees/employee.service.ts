import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/api';
import { Credentials } from '../../../core/auth/auth.model';
import { CreateEmployeePayload, Employee, Workplaces } from './employee.model';

const API_URL = `${API_BASE_URL}/hr/employees`;

@Injectable({
  providedIn: 'root',
})
export class EmployeeService {
  private readonly http = inject(HttpClient);

  list(): Observable<Employee[]> {
    return this.http.get<Employee[]>(API_URL);
  }

  create(payload: CreateEmployeePayload): Observable<Employee> {
    return this.http.post<Employee>(API_URL, payload);
  }

  workplaces(id: string): Observable<Workplaces> {
    return this.http.get<Workplaces>(`${API_URL}/${id}/workplaces`);
  }

  resetPin(id: string): Observable<void> {
    return this.http.post<void>(`${API_URL}/${id}/pin-reset`, {});
  }

  issueCredentials(id: string): Observable<Credentials> {
    return this.http.post<Credentials>(`${API_URL}/${id}/credentials`, {});
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${API_URL}/${id}`);
  }
}
