import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/api';
import { AppModule, Credentials } from '../../../core/auth/auth.model';
import { Company, CreateCompanyPayload } from './company.model';

const API_URL = `${API_BASE_URL}/superadmin/companies`;

@Injectable({ providedIn: 'root' })
export class CompanyService {
  private readonly http = inject(HttpClient);

  list(): Observable<Company[]> {
    return this.http.get<Company[]>(API_URL);
  }

  create(payload: CreateCompanyPayload): Observable<{ company: Company; credentials: Credentials }> {
    return this.http.post<{ company: Company; credentials: Credentials }>(API_URL, payload);
  }

  update(id: string, payload: { name?: string; modules?: AppModule[] }): Observable<Company> {
    return this.http.patch<Company>(`${API_URL}/${id}`, payload);
  }

  resetAdminPassword(id: string): Observable<Credentials> {
    return this.http.post<Credentials>(`${API_URL}/${id}/reset-admin-password`, {});
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${API_URL}/${id}`);
  }
}
