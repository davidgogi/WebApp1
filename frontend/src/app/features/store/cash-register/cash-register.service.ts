import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/api';
import { Period, RegisterAvailability, RegisterSession, RegisterSessionDetail, periodParams } from './cash-register.model';

const API_URL = `${API_BASE_URL}/store/cash-register`;

@Injectable({ providedIn: 'root' })
export class CashRegisterService {
  private readonly http = inject(HttpClient);

  list(period: Period): Observable<RegisterSession[]> {
    return this.http.get<RegisterSession[]>(`${API_URL}/sessions`, { params: periodParams(period) });
  }

  detail(id: string): Observable<RegisterSessionDetail> {
    return this.http.get<RegisterSessionDetail>(`${API_URL}/sessions/${id}`);
  }

  current(): Observable<RegisterSessionDetail | null> {
    return this.http.get<RegisterSessionDetail | null>(`${API_URL}/sessions/current`);
  }

  registers(storeId: string): Observable<RegisterAvailability[]> {
    return this.http.get<RegisterAvailability[]>(`${API_URL}/registers`, { params: { storeId } });
  }

  pin(): Observable<{ hasPin: boolean }> {
    return this.http.get<{ hasPin: boolean }>(`${API_URL}/pin`);
  }

  setPin(newPin: string, currentPin?: string): Observable<{ hasPin: boolean }> {
    return this.http.put<{ hasPin: boolean }>(`${API_URL}/pin`, { newPin, currentPin });
  }

  open(payload: { storeId: string; registerNo: number; openingCash: number; note?: string; pin: string }): Observable<RegisterSessionDetail> {
    return this.http.post<RegisterSessionDetail>(`${API_URL}/sessions`, payload);
  }

  close(id: string, payload: { countedCash: number; note?: string; pin: string }): Observable<RegisterSessionDetail> {
    return this.http.post<RegisterSessionDetail>(`${API_URL}/sessions/${id}/close`, payload);
  }

  moveCash(id: string, payload: { kind: 'in' | 'out'; amount: number; note: string }): Observable<RegisterSessionDetail> {
    return this.http.post<RegisterSessionDetail>(`${API_URL}/sessions/${id}/cash-moves`, payload);
  }

  comment(id: string, comment: string): Observable<RegisterSessionDetail> {
    return this.http.patch<RegisterSessionDetail>(`${API_URL}/sessions/${id}/comment`, { comment });
  }

  cover(id: string, payload: { amount: number; note?: string }): Observable<RegisterSessionDetail> {
    return this.http.post<RegisterSessionDetail>(`${API_URL}/sessions/${id}/coverages`, payload);
  }
}
