import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/api';
import { Category, CategoryPayload, CategoryStatus, ProductGroup } from './category.model';

const API_URL = `${API_BASE_URL}/wms/categories`;

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  private readonly http = inject(HttpClient);

  list(): Observable<Category[]> {
    return this.http.get<Category[]>(API_URL);
  }

  create(payload: CategoryPayload): Observable<Category> {
    return this.http.post<Category>(API_URL, payload);
  }

  update(id: string, payload: Partial<CategoryPayload>): Observable<Category> {
    return this.http.patch<Category>(`${API_URL}/${id}`, payload);
  }

  remove(id: string, move?: { moveToCategoryId: string; moveToGroupId?: string }): Observable<void> {
    return this.http.delete<void>(`${API_URL}/${id}`, { params: move ?? {} });
  }

  createGroup(categoryId: string, payload: { name: string; status?: CategoryStatus }): Observable<ProductGroup> {
    return this.http.post<ProductGroup>(`${API_URL}/${categoryId}/groups`, payload);
  }

  updateGroup(
    categoryId: string,
    id: string,
    payload: { name?: string; status?: CategoryStatus },
  ): Observable<ProductGroup> {
    return this.http.patch<ProductGroup>(`${API_URL}/${categoryId}/groups/${id}`, payload);
  }

  removeGroup(
    categoryId: string,
    id: string,
    move?: { moveToGroupId: string } | { noGroup: 'true' },
  ): Observable<void> {
    return this.http.delete<void>(`${API_URL}/${categoryId}/groups/${id}`, { params: move ?? {} });
  }
}
