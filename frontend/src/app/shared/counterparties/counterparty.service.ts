import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/api';
import { ImportReport, ImportSource } from '../xlsx-import/xlsx-import.model';
import { Counterparty, CounterpartyDocument, CounterpartyReceipt, CounterpartyDocumentType, CounterpartyHistoryEntry, CounterpartyPayload, CounterpartyPreviewRow } from './counterparty.model';

const API_URL = `${API_BASE_URL}/parameters/counterparties`;

@Injectable({
  providedIn: 'root',
})
export class CounterpartyService {
  private readonly http = inject(HttpClient);

  list(): Observable<Counterparty[]> {
    return this.http.get<Counterparty[]>(API_URL);
  }

  get(id: string): Observable<Counterparty> {
    return this.http.get<Counterparty>(`${API_URL}/${id}`);
  }

  documents(id: string): Observable<CounterpartyDocument[]> {
    return this.http.get<CounterpartyDocument[]>(`${API_URL}/${id}/documents`);
  }

  uploadDocument(id: string, file: File, type: CounterpartyDocumentType, validUntil: string): Observable<CounterpartyDocument> {
    const form = this.fileForm(file);
    form.append('type', type);
    if (validUntil) {
      form.append('validUntil', validUntil);
    }
    return this.http.post<CounterpartyDocument>(`${API_URL}/${id}/documents`, form);
  }

  downloadDocument(id: string, documentId: string): Observable<Blob> {
    return this.http.get(`${API_URL}/${id}/documents/${documentId}/file`, { responseType: 'blob' });
  }

  removeDocument(id: string, documentId: string): Observable<void> {
    return this.http.delete<void>(`${API_URL}/${id}/documents/${documentId}`);
  }

  receipts(id: string): Observable<CounterpartyReceipt[]> {
    return this.http.get<CounterpartyReceipt[]>(`${API_BASE_URL}/wms/receipts`, { params: { supplierId: id } });
  }

  supplierOptions(): Observable<Pick<Counterparty, 'id' | 'name' | 'identificationCode'>[]> {
    return this.http.get<Pick<Counterparty, 'id' | 'name' | 'identificationCode'>[]>(`${API_URL}/supplier-options`);
  }

  categories(): Observable<string[]> {
    return this.http.get<string[]>(`${API_URL}/categories`);
  }

  history(id: string): Observable<CounterpartyHistoryEntry[]> {
    return this.http.get<CounterpartyHistoryEntry[]>(`${API_URL}/${id}/history`);
  }

  create(payload: CounterpartyPayload): Observable<Counterparty> {
    return this.http.post<Counterparty>(API_URL, payload);
  }

  update(id: string, payload: Partial<CounterpartyPayload>): Observable<Counterparty> {
    return this.http.patch<Counterparty>(`${API_URL}/${id}`, payload);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${API_URL}/${id}`);
  }

  readonly importSource: ImportSource<CounterpartyPreviewRow> = {
    template: () => this.http.get(`${API_URL}/import/template`, { responseType: 'blob' }),
    example: () => this.http.get(`${API_URL}/import/example`, { responseType: 'blob' }),
    check: (file) =>
      this.http.post<ImportReport<CounterpartyPreviewRow>>(`${API_URL}/import/check`, this.fileForm(file)),
    import: (file) => this.http.post<ImportReport<CounterpartyPreviewRow>>(`${API_URL}/import`, this.fileForm(file)),
  };

  export(): Observable<Blob> {
    return this.http.get(`${API_URL}/export`, { responseType: 'blob' });
  }

  private fileForm(file: File): FormData {
    const form = new FormData();
    form.append('file', file);
    return form;
  }
}
