import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/api';
import { Period, periodParams } from '../cash-register/cash-register.model';
import { DailyReport } from './report.model';

const API_URL = `${API_BASE_URL}/store/reports`;

@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly http = inject(HttpClient);

  daily(period: Period): Observable<DailyReport> {
    return this.http.get<DailyReport>(`${API_URL}/daily`, { params: periodParams(period) });
  }

  dailyExport(period: Period): Observable<Blob> {
    return this.http.get(`${API_URL}/daily/export`, { params: periodParams(period), responseType: 'blob' });
  }

  cashMovementExport(sessionId: string): Observable<Blob> {
    return this.http.get(`${API_URL}/cash-movement/${sessionId}/export`, { responseType: 'blob' });
  }
}
