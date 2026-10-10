import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/api';
import { RegisterAvailability, RegisterSession, RegisterSessionDetail } from './cash-register.model';

const API_URL = `${API_BASE_URL}/store/cash-register/sessions`;

@Injectable({ providedIn: 'root' })
export class CashRegisterService {
  private readonly http = inject(HttpClient);

  // Admins get every session, a manager those of his stores, a cashier only his own.
  list(): Observable<RegisterSession[]> {
    return this.http.get<RegisterSession[]>(API_URL);
  }

  detail(id: string): Observable<RegisterSessionDetail> {
    return this.http.get<RegisterSessionDetail>(`${API_URL}/${id}`);
  }

  // The register the current user has open right now, or null.
  current(): Observable<RegisterSession | null> {
    return this.http.get<RegisterSession | null>(`${API_URL}/current`);
  }

  // The registers of one of my stores and who has each open, for the open-register form.
  registers(storeId: string): Observable<RegisterAvailability[]> {
    return this.http.get<RegisterAvailability[]>(`${API_BASE_URL}/store/cash-register/registers`, {
      params: { storeId },
    });
  }

  open(storeId: string, registerNo: number, openingCash: number): Observable<RegisterSession> {
    return this.http.post<RegisterSession>(API_URL, { storeId, registerNo, openingCash });
  }

  close(id: string, closingCash: number): Observable<RegisterSession> {
    return this.http.post<RegisterSession>(`${API_URL}/${id}/close`, { closingCash });
  }
}
