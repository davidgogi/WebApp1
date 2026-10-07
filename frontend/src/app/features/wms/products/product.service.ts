import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/api';
import { Product, ProductPayload } from './product.model';

const API_URL = `${API_BASE_URL}/wms/products`;

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private readonly http = inject(HttpClient);

  list(): Observable<Product[]> {
    return this.http.get<Product[]>(API_URL);
  }

  create(payload: ProductPayload): Observable<Product> {
    return this.http.post<Product>(API_URL, payload);
  }

  update(id: string, payload: Partial<ProductPayload>): Observable<Product> {
    return this.http.patch<Product>(`${API_URL}/${id}`, payload);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${API_URL}/${id}`);
  }
}
