import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/api';
import { PaymentMethod } from '../cash-register/cash-register.model';
import { SaleDetail } from '../sales/sale.model';
import { PosCatalog } from './pos.model';

const API_URL = `${API_BASE_URL}/store/pos`;

@Injectable({ providedIn: 'root' })
export class PosService {
  private readonly http = inject(HttpClient);

  catalog(): Observable<PosCatalog> {
    return this.http.get<PosCatalog>(`${API_URL}/catalog`);
  }

  sell(payload: {
    items: { productId: string; quantity: number }[];
    paymentMethod: PaymentMethod;
    cashReceived?: number;
  }): Observable<SaleDetail> {
    return this.http.post<SaleDetail>(`${API_URL}/sales`, payload);
  }
}
