import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/api';
import { Store, StoreOptions, StorePayload } from './store.model';

const API_URL = `${API_BASE_URL}/store/stores`;

@Injectable({ providedIn: 'root' })
export class StoreService {
  private readonly http = inject(HttpClient);

  list(): Observable<Store[]> {
    return this.http.get<Store[]>(API_URL);
  }

  options(): Observable<StoreOptions> {
    return this.http.get<StoreOptions>(`${API_URL}/options`);
  }

  create(payload: StorePayload): Observable<Store> {
    return this.http.post<Store>(API_URL, payload);
  }

  update(id: string, payload: Partial<StorePayload>): Observable<Store> {
    return this.http.patch<Store>(`${API_URL}/${id}`, payload);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${API_URL}/${id}`);
  }
}
