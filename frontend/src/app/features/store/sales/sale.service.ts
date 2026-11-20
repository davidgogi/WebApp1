import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/api';
import { Period, periodParams } from '../cash-register/cash-register.model';
import { SaleDetail, SaleListItem } from './sale.model';

const API_URL = `${API_BASE_URL}/store/sales`;

@Injectable({ providedIn: 'root' })
export class SaleService {
  private readonly http = inject(HttpClient);

  list(period: Period): Observable<SaleListItem[]> {
    return this.http.get<SaleListItem[]>(API_URL, { params: periodParams(period) });
  }

  detail(id: string): Observable<SaleDetail> {
    return this.http.get<SaleDetail>(`${API_URL}/${id}`);
  }

  returnLines(id: string, lines: { lineId: string; quantity: number }[], note?: string): Observable<SaleDetail> {
    return this.http.post<SaleDetail>(`${API_URL}/${id}/returns`, { lines, note });
  }
}
