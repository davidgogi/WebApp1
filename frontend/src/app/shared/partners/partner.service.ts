import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/api';
import { Partner, PartnerPayload } from './partner.model';

const API_URL = `${API_BASE_URL}/parameters/partners`;

@Injectable({
  providedIn: 'root',
})
export class PartnerService {
  private readonly http = inject(HttpClient);

  list(): Observable<Partner[]> {
    return this.http.get<Partner[]>(API_URL);
  }

  supplierOptions(): Observable<Pick<Partner, 'id' | 'name' | 'identificationCode'>[]> {
    return this.http.get<Pick<Partner, 'id' | 'name' | 'identificationCode'>[]>(`${API_URL}/supplier-options`);
  }

  create(payload: PartnerPayload): Observable<Partner> {
    return this.http.post<Partner>(API_URL, payload);
  }

  update(id: string, payload: Partial<PartnerPayload>): Observable<Partner> {
    return this.http.patch<Partner>(`${API_URL}/${id}`, payload);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${API_URL}/${id}`);
  }
}
