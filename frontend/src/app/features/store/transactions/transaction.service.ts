import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/api';
import { Period, periodParams } from '../cash-register/cash-register.model';
import { OperationRow, TransactionRow } from './transaction.model';

const API_URL = `${API_BASE_URL}/store/transactions`;

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private readonly http = inject(HttpClient);

  transactions(period: Period): Observable<TransactionRow[]> {
    return this.http.get<TransactionRow[]>(API_URL, { params: periodParams(period) });
  }

  operations(period: Period): Observable<OperationRow[]> {
    return this.http.get<OperationRow[]>(`${API_URL}/operations`, { params: periodParams(period) });
  }
}
