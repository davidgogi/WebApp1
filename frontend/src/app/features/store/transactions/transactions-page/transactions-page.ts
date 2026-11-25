import { Component, OnInit, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Factory, LucideAngularModule, Receipt, Search, Trash2 } from 'lucide-angular';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { Modal } from '../../../../shared/modal/modal';
import { Pager } from '../../../../shared/pager/pager';
import { Pagination } from '../../../../shared/pager/pagination';
import { daysAgo, errorText, localDate } from '../../cash-register/cash-register.model';
import { Expense } from '../../record-expense/expense.model';
import { ExpenseService } from '../../record-expense/expense.service';
import { Store } from '../../stores/store.model';
import { StoreService } from '../../stores/store.service';
import {
  DOCUMENT_KIND_LABELS,
  DocumentKind,
  MONEY_METHOD_LABELS,
  MoneyMethod,
  OperationRow,
  TransactionRow,
} from '../transaction.model';
import { TransactionService } from '../transaction.service';

type Tab = 'transactions' | 'operations';

@Component({
  selector: 'app-transactions-page',
  imports: [TranslatePipe, DatePipe, DecimalPipe, FormsModule, RouterLink, LucideAngularModule, Modal, Pager],
  templateUrl: './transactions-page.html',
  styleUrl: './transactions-page.css',
})
export class TransactionsPage implements OnInit {
  private readonly transactionService = inject(TransactionService);
  private readonly expenseService = inject(ExpenseService);
  private readonly storeService = inject(StoreService);
  private readonly router = inject(Router);

  readonly tab = input<string>();

  protected readonly TransactionsIcon = Receipt;
  protected readonly OperationsIcon = Factory;
  protected readonly SearchIcon = Search;
  protected readonly DeleteIcon = Trash2;
  protected readonly kindLabels = DOCUMENT_KIND_LABELS;
  protected readonly methodLabels = MONEY_METHOD_LABELS;

  protected readonly activeTab = computed<Tab>(() => (this.tab() === 'operations' ? 'operations' : 'transactions'));

  protected readonly transactions = signal<TransactionRow[]>([]);
  protected readonly operations = signal<OperationRow[]>([]);
  protected readonly stores = signal<Store[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly from = signal(daysAgo(6));
  protected readonly to = signal(localDate(new Date()));
  protected readonly storeFilter = signal('');
  protected readonly search = signal('');
  protected readonly kindFilter = signal<'all' | DocumentKind>('all');
  protected readonly methodFilter = signal<'all' | MoneyMethod>('all');
  protected readonly showVoided = signal(true);

  protected readonly detail = signal<Expense | null>(null);
  protected readonly voidTarget = signal<TransactionRow | null>(null);
  protected readonly voidReason = signal('');
  protected readonly voidError = signal('');
  protected readonly isVoiding = signal(false);

  protected readonly filteredTransactions = computed(() =>
    this.transactions().filter(
      (row) =>
        this.passes(row.kind, row.method, row.status) &&
        this.matches([row.code, row.storeName, row.by, row.description ?? '', row.original?.code ?? '']),
    ),
  );
  protected readonly filteredOperations = computed(() =>
    this.operations().filter(
      (row) =>
        this.passes(row.kind, row.method, row.status) &&
        this.matches([row.name, row.detail ?? '', row.documentCode, row.storeName, row.by]),
    ),
  );
  protected readonly totals = computed(() => {
    const rows = this.activeTab() === 'transactions' ? this.filteredTransactions() : this.filteredOperations();
    const live = rows.filter((row) => row.status === 'active');
    const sum = (direction: 'in' | 'out') =>
      live.filter((row) => row.direction === direction).reduce((total, row) => total + row.amount, 0);
    return { in: sum('in'), out: sum('out') };
  });
  protected readonly transactionPages = new Pagination(
    () => this.filteredTransactions(),
    () => [this.search(), this.kindFilter(), this.methodFilter(), this.showVoided(), this.transactions()],
  );
  protected readonly operationPages = new Pagination(
    () => this.filteredOperations(),
    () => [this.search(), this.kindFilter(), this.methodFilter(), this.showVoided(), this.operations()],
  );

  constructor() {
    effect(() => {
      this.activeTab();
      untracked(() => this.load());
    });
  }

  ngOnInit(): void {
    this.storeService.list().subscribe((stores) => this.stores.set(stores));
  }

  load(): void {
    const period = { from: this.from(), to: this.to(), storeId: this.storeFilter() };
    this.isLoading.set(true);
    this.errorMessage.set('');
    const failed = (error: unknown) => {
      this.errorMessage.set(errorText(error, 'Could not load the transactions. Is the backend running?'));
      this.isLoading.set(false);
    };
    if (this.activeTab() === 'transactions') {
      this.transactionService.transactions(period).subscribe({
        next: (rows) => {
          this.transactions.set(rows);
          this.isLoading.set(false);
        },
        error: failed,
      });
    } else {
      this.transactionService.operations(period).subscribe({
        next: (rows) => {
          this.operations.set(rows);
          this.isLoading.set(false);
        },
        error: failed,
      });
    }
  }

  clearFilters(): void {
    this.search.set('');
    this.kindFilter.set('all');
    this.methodFilter.set('all');
    this.showVoided.set(true);
    this.storeFilter.set('');
    this.from.set(daysAgo(6));
    this.to.set(localDate(new Date()));
    this.load();
  }

  openOperation(row: OperationRow): void {
    if (row.kind === 'expense') {
      this.detail.set(row.expense);
    } else if (row.kind === 'coverage') {
      void this.router.navigate(['/store/cash-register', row.sessionId]);
    } else {
      void this.router.navigate(['/store/sales', row.documentId]);
    }
  }

  askVoid(row: TransactionRow): void {
    this.voidReason.set('');
    this.voidError.set('');
    this.voidTarget.set(row);
  }

  confirmVoid(): void {
    const row = this.voidTarget();
    if (!row) {
      return;
    }
    this.isVoiding.set(true);
    this.expenseService.voidExpense(row.id, this.voidReason().trim()).subscribe({
      next: () => {
        this.isVoiding.set(false);
        this.voidTarget.set(null);
        this.load();
      },
      error: (error) => {
        this.isVoiding.set(false);
        this.voidError.set(errorText(error, 'Could not delete the expense.'));
      },
    });
  }

  private passes(kind: DocumentKind, method: MoneyMethod, status: 'active' | 'voided'): boolean {
    return (
      (this.kindFilter() === 'all' || kind === this.kindFilter()) &&
      (this.methodFilter() === 'all' || method === this.methodFilter()) &&
      (this.showVoided() || status === 'active')
    );
  }

  private matches(values: string[]): boolean {
    const query = this.search().trim().toLowerCase();
    return !query || values.some((value) => value.toLowerCase().includes(query));
  }
}
