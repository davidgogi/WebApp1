import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/api';
import {
  BankAccount,
  BankAccountPayload,
  CatalogItemPayload,
  Expense,
  ExpenseCategory,
  ExpenseLinePayload,
  ExpenseWorkspace,
} from './expense.model';

const API_URL = `${API_BASE_URL}/store/expenses`;

@Injectable({ providedIn: 'root' })
export class ExpenseService {
  private readonly http = inject(HttpClient);

  workspace(): Observable<ExpenseWorkspace> {
    return this.http.get<ExpenseWorkspace>(`${API_URL}/workspace`);
  }

  create(lines: ExpenseLinePayload[]): Observable<Expense[]> {
    return this.http.post<Expense[]>(API_URL, { lines });
  }

  voidExpense(id: string, reason: string): Observable<Expense> {
    return this.http.post<Expense>(`${API_URL}/${id}/void`, { reason });
  }

  createCategory(payload: CatalogItemPayload): Observable<ExpenseCategory[]> {
    return this.http.post<ExpenseCategory[]>(`${API_URL}/categories`, payload);
  }

  updateCategory(id: string, payload: CatalogItemPayload): Observable<ExpenseCategory[]> {
    return this.http.patch<ExpenseCategory[]>(`${API_URL}/categories/${id}`, payload);
  }

  removeCategory(id: string): Observable<ExpenseCategory[]> {
    return this.http.delete<ExpenseCategory[]>(`${API_URL}/categories/${id}`);
  }

  createType(categoryId: string, payload: CatalogItemPayload): Observable<ExpenseCategory[]> {
    return this.http.post<ExpenseCategory[]>(`${API_URL}/categories/${categoryId}/types`, payload);
  }

  updateType(id: string, payload: CatalogItemPayload): Observable<ExpenseCategory[]> {
    return this.http.patch<ExpenseCategory[]>(`${API_URL}/types/${id}`, payload);
  }

  removeType(id: string): Observable<ExpenseCategory[]> {
    return this.http.delete<ExpenseCategory[]>(`${API_URL}/types/${id}`);
  }

  createBankAccount(payload: BankAccountPayload): Observable<BankAccount[]> {
    return this.http.post<BankAccount[]>(`${API_URL}/bank-accounts`, payload);
  }

  updateBankAccount(id: string, payload: BankAccountPayload): Observable<BankAccount[]> {
    return this.http.patch<BankAccount[]>(`${API_URL}/bank-accounts/${id}`, payload);
  }

  removeBankAccount(id: string): Observable<BankAccount[]> {
    return this.http.delete<BankAccount[]>(`${API_URL}/bank-accounts/${id}`);
  }
}
