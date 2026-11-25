import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, PenLine, Plus, RefreshCw, Send, Trash2 } from 'lucide-angular';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { Modal } from '../../../../shared/modal/modal';
import { errorText, localDate } from '../../cash-register/cash-register.model';
import { CashRegisterService } from '../../cash-register/cash-register.service';
import {
  BankAccount,
  EXPENSE_ITEM_STATUS_LABELS,
  ExpenseCategory,
  ExpenseItemStatus,
  ExpenseLinePayload,
  ExpenseType,
  ExpenseWorkspace,
  ShortageToCover,
} from '../expense.model';
import { ExpenseService } from '../expense.service';

interface Line {
  key: string;
  selected: boolean;
  date: string;
  typeId: string;
  supplierId: string;
  source: string;
  storeId: string;
  amount: number | null;
  purpose: string;
}

interface TypeOption {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
}

type CatalogForm =
  | { kind: 'category'; id: string | null; name: string; status: ExpenseItemStatus }
  | { kind: 'type'; id: string | null; categoryId: string; name: string; status: ExpenseItemStatus }
  | {
      kind: 'bank';
      id: string | null;
      name: string;
      accountNumber: string;
      openingBalance: number | null;
      status: ExpenseItemStatus;
    };

const CASH = 'cash';
const BANK = 'bank:';
const SHORTAGE = 'shortage:';
let nextKey = 0;

@Component({
  selector: 'app-record-expense-page',
  imports: [TranslatePipe, DatePipe, DecimalPipe, FormsModule, LucideAngularModule, Modal],
  templateUrl: './record-expense-page.html',
  styleUrl: './record-expense-page.css',
})
export class RecordExpensePage implements OnInit {
  private readonly expenseService = inject(ExpenseService);
  private readonly i18n = inject(I18nService);
  private readonly cashRegister = inject(CashRegisterService);

  protected readonly AddIcon = Plus;
  protected readonly RefreshIcon = RefreshCw;
  protected readonly SendIcon = Send;
  protected readonly EditIcon = PenLine;
  protected readonly DeleteIcon = Trash2;
  protected readonly statusLabels = EXPENSE_ITEM_STATUS_LABELS;

  protected readonly workspace = signal<ExpenseWorkspace | null>(null);
  protected readonly lines = signal<Line[]>([]);
  protected readonly categoryFilter = signal('');
  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly notice = signal('');

  protected readonly confirmOpen = signal(false);
  protected readonly single = signal<Line | null>(null);
  protected readonly singleError = signal('');
  protected readonly catalogForm = signal<CatalogForm | null>(null);
  protected readonly catalogError = signal('');
  protected readonly coverOpen = signal(false);
  protected readonly coverSessionId = signal('');
  protected readonly coverAmount = signal<number | null>(null);
  protected readonly coverNote = signal('');
  protected readonly coverError = signal('');
  protected readonly coverTarget = computed<ShortageToCover | undefined>(() =>
    this.workspace()?.shortages.find((shortage) => shortage.sessionId === this.coverSessionId()),
  );
  protected readonly coverLeftAfter = computed(() => {
    const target = this.coverTarget();
    return target ? Math.round((target.left - (Number(this.coverAmount()) || 0)) * 100) / 100 : null;
  });

  protected readonly canPost = computed(() => {
    const ws = this.workspace();
    return !!ws && (ws.canPostCash || ws.canPostBank);
  });
  protected readonly activeCategories = computed(() =>
    (this.workspace()?.categories ?? []).filter((category) => category.status === 'active'),
  );
  protected readonly typeOptions = computed<TypeOption[]>(() =>
    this.activeCategories().flatMap((category) =>
      category.types
        .filter((type) => type.status === 'active')
        .map((type) => ({ id: type.id, name: type.name, categoryId: category.id, categoryName: category.name })),
    ),
  );
  protected readonly activeBanks = computed(() =>
    (this.workspace()?.bankAccounts ?? []).filter((account) => account.status === 'active'),
  );
  protected readonly noSource = computed(() => {
    const ws = this.workspace();
    return (
      !!ws &&
      !ws.canPostCash &&
      (!ws.canPostBank || this.activeBanks().length === 0) &&
      (!ws.canCover || ws.shortages.length === 0)
    );
  });
  protected readonly noSourceHint = computed(() => {
    const ws = this.workspace();
    if (!ws) {
      return '';
    }
    if (ws.canManage) {
      return 'There is nothing to pay from yet. Add a bank account with "New bank account". Cash is paid only from a register, and the Store admin doesn\'t work a register.';
    }
    return ws.canPostBank
      ? 'There is nothing to pay from yet. Open your register (Store → Cash register) to pay from cash, or ask the Store admin to add a bank account.'
      : 'Open your register first (Store → Cash register): cash expenses are paid from it.';
  });
  protected readonly visibleLines = computed(() => {
    const filter = this.categoryFilter();
    return filter ? this.lines().filter((line) => this.typeOf(line.typeId)?.categoryId === filter) : this.lines();
  });
  protected readonly selectedLines = computed(() => this.lines().filter((line) => line.selected));
  protected readonly selectedTotal = computed(() =>
    this.selectedLines().reduce((sum, line) => sum + (Number(line.amount) || 0), 0),
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.expenseService.workspace().subscribe({
      next: (workspace) => {
        this.workspace.set(workspace);
        this.lines.set(this.initialLines());
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(errorText(error, 'Could not load expenses. Is the backend running?'));
        this.isLoading.set(false);
      },
    });
  }

  typeOf(typeId: string): TypeOption | undefined {
    return this.typeOptions().find((type) => type.id === typeId);
  }

  isBank(line: Line): boolean {
    return line.source.startsWith(BANK);
  }

  shortageOf(line: Line): ShortageToCover | undefined {
    return line.source.startsWith(SHORTAGE)
      ? this.workspace()?.shortages.find((shortage) => SHORTAGE + shortage.sessionId === line.source)
      : undefined;
  }

  shortageLabel(shortage: ShortageToCover): string {
    const [year, month, day] = localDate(new Date(shortage.openedAt)).split('-');
    return this.i18n.t('Shortage · register {no}, {store}, {date} (left ₾{left})', {
      no: shortage.registerNo,
      store: shortage.storeName,
      date: `${day}.${month}.${year}`,
      left: shortage.left.toFixed(2),
    });
  }

  lineStore(line: Line): string {
    if (line.source === CASH) {
      return this.workspace()?.session?.storeName ?? '–';
    }
    return this.shortageOf(line)?.storeName ?? '–';
  }

  private withSourceDate(line: Line): Line {
    const shortage = this.shortageOf(line);
    if (shortage) {
      return { ...line, date: localDate(new Date(shortage.openedAt)) };
    }
    return line.source === CASH ? { ...line, date: this.workspace()!.today } : line;
  }

  cashLabel(): string {
    const session = this.workspace()?.session;
    return session
      ? this.i18n.t('Cash · register {no}, {store}', { no: session.registerNo, store: session.storeName })
      : '';
  }

  patch(key: string, change: Partial<Line>): void {
    this.lines.update((lines) =>
      lines.map((line) => {
        if (line.key !== key) {
          return line;
        }
        let next = { ...line, ...change };
        if (change.amount !== undefined && Number(change.amount) > 0) {
          next.selected = true;
        }
        if (change.source !== undefined) {
          next = this.withSourceDate(next);
        }
        return next;
      }),
    );
    this.errorMessage.set('');
  }

  addLine(): void {
    const line = this.newLine(this.typeOptions().find((type) => !this.categoryFilter() || type.categoryId === this.categoryFilter())?.id ?? '');
    this.lines.update((lines) => [...lines, { ...line, selected: true }]);
  }

  openConfirmation(): void {
    this.notice.set('');
    const problem = this.firstProblem(this.selectedLines());
    if (problem) {
      this.errorMessage.set(problem);
      return;
    }
    this.errorMessage.set('');
    this.confirmOpen.set(true);
  }

  submitSelected(): void {
    this.post(this.selectedLines(), () => {
      this.confirmOpen.set(false);
      this.load();
    }, (message) => {
      this.confirmOpen.set(false);
      this.errorMessage.set(message);
    });
  }

  openSingle(): void {
    this.singleError.set('');
    this.single.set(this.newLine(this.typeOptions()[0]?.id ?? ''));
  }

  patchSingle(change: Partial<Line>): void {
    this.single.update((line) => {
      if (!line) {
        return line;
      }
      const next = { ...line, ...change };
      return change.source !== undefined ? this.withSourceDate(next) : next;
    });
  }

  submitSingle(): void {
    const line = this.single();
    if (!line) {
      return;
    }
    const problem = this.firstProblem([line]);
    if (problem) {
      this.singleError.set(problem);
      return;
    }
    this.post([line], () => {
      this.single.set(null);
      this.load();
    }, (message) => this.singleError.set(message));
  }

  openCover(): void {
    const first = this.workspace()?.shortages[0];
    this.coverError.set('');
    this.coverNote.set('');
    this.coverSessionId.set(first?.sessionId ?? '');
    this.coverAmount.set(first?.left ?? null);
    this.coverOpen.set(true);
  }

  chooseShortage(sessionId: string): void {
    this.coverSessionId.set(sessionId);
    this.coverAmount.set(this.coverTarget()?.left ?? null);
  }

  submitCover(): void {
    const target = this.coverTarget();
    const amount = Number(this.coverAmount());
    if (!target) {
      this.coverError.set('Choose a register.');
      return;
    }
    if (!(amount > 0) || Math.round(amount * 100) !== amount * 100) {
      this.coverError.set('Enter an amount above ₾0 with at most 2 decimals.');
      return;
    }
    if (!this.coverNote().trim()) {
      this.coverError.set('Write where the missing money went.');
      return;
    }
    if (amount > target.left) {
      this.coverError.set(this.i18n.t('At most ₾{amount} of the shortage is left to cover', { amount: target.left.toFixed(2) }));
      return;
    }
    this.isSaving.set(true);
    this.cashRegister.cover(target.sessionId, { amount, note: this.coverNote().trim() }).subscribe({
      next: (session) => {
        this.isSaving.set(false);
        this.coverOpen.set(false);
        const last = session.coverages[session.coverages.length - 1];
        this.notice.set(this.i18n.t('Recorded {codes}', { codes: last?.expenseCode ?? last?.code ?? '' }));
        this.load();
      },
      error: (error) => {
        this.isSaving.set(false);
        this.coverError.set(errorText(error, 'Could not cover the shortage.'));
      },
    });
  }

  openCatalog(form: CatalogForm): void {
    this.catalogError.set('');
    this.catalogForm.set(form);
  }

  newCategory(): void {
    this.openCatalog({ kind: 'category', id: null, name: '', status: 'active' });
  }

  editCategory(category: ExpenseCategory): void {
    this.openCatalog({ kind: 'category', id: category.id, name: category.name, status: category.status });
  }

  newType(categoryId = ''): void {
    this.openCatalog({
      kind: 'type',
      id: null,
      categoryId: categoryId || this.activeCategories()[0]?.id || '',
      name: '',
      status: 'active',
    });
  }

  editType(type: ExpenseType): void {
    this.openCatalog({ kind: 'type', id: type.id, categoryId: type.categoryId, name: type.name, status: type.status });
  }

  newBank(): void {
    this.openCatalog({ kind: 'bank', id: null, name: '', accountNumber: '', openingBalance: null, status: 'active' });
  }

  editBank(account: BankAccount): void {
    this.openCatalog({
      kind: 'bank',
      id: account.id,
      name: account.name,
      accountNumber: account.accountNumber ?? '',
      openingBalance: account.openingBalance,
      status: account.status,
    });
  }

  patchCatalog(change: Record<string, unknown>): void {
    this.catalogForm.update((form) => (form ? ({ ...form, ...change } as CatalogForm) : form));
  }

  saveCatalog(): void {
    const form = this.catalogForm();
    if (!form) {
      return;
    }
    if (!form.name.trim()) {
      this.catalogError.set('Enter a name.');
      return;
    }
    const done = {
      next: () => {
        this.catalogForm.set(null);
        this.load();
      },
      error: (error: unknown) => this.catalogError.set(errorText(error, 'Could not save.')),
    };
    if (form.kind === 'category') {
      const payload = { name: form.name.trim(), status: form.status };
      (form.id ? this.expenseService.updateCategory(form.id, payload) : this.expenseService.createCategory(payload)).subscribe(done);
    } else if (form.kind === 'type') {
      if (!form.categoryId) {
        this.catalogError.set('Choose a category.');
        return;
      }
      const payload = { name: form.name.trim(), status: form.status };
      (form.id
        ? this.expenseService.updateType(form.id, { ...payload, categoryId: form.categoryId })
        : this.expenseService.createType(form.categoryId, payload)
      ).subscribe(done);
    } else {
      const payload = {
        name: form.name.trim(),
        accountNumber: form.accountNumber.trim() || null,
        openingBalance: Number(form.openingBalance) || 0,
        status: form.status,
      };
      (form.id ? this.expenseService.updateBankAccount(form.id, payload) : this.expenseService.createBankAccount(payload)).subscribe(done);
    }
  }

  removeCategory(category: ExpenseCategory): void {
    if (this.i18n.confirm('Delete the category {name} and its types?', { name: category.name })) {
      this.expenseService.removeCategory(category.id).subscribe(this.afterRemove());
    }
  }

  removeType(type: ExpenseType): void {
    if (this.i18n.confirm('Delete the expense type {name}?', { name: type.name })) {
      this.expenseService.removeType(type.id).subscribe(this.afterRemove());
    }
  }

  removeBank(account: BankAccount): void {
    if (this.i18n.confirm('Delete the bank account {name}?', { name: account.name })) {
      this.expenseService.removeBankAccount(account.id).subscribe(this.afterRemove());
    }
  }

  sourceText(line: Line): string {
    if (line.source === CASH) {
      return this.cashLabel();
    }
    const shortage = this.shortageOf(line);
    if (shortage) {
      return this.shortageLabel(shortage);
    }
    return this.activeBanks().find((account) => BANK + account.id === line.source)?.name ?? '';
  }

  private afterRemove() {
    return {
      next: () => this.load(),
      error: (error: unknown) => this.errorMessage.set(errorText(error, 'Could not delete.')),
    };
  }

  private post(lines: Line[], done: () => void, failed: (message: string) => void): void {
    this.isSaving.set(true);
    this.expenseService.create(lines.map((line) => this.payload(line))).subscribe({
      next: (created) => {
        this.isSaving.set(false);
        this.notice.set(
          this.i18n.t('Recorded {codes}', { codes: created.map((expense) => expense.code).join(', ') }),
        );
        done();
      },
      error: (error) => {
        this.isSaving.set(false);
        failed(errorText(error, 'Could not record the expenses.'));
      },
    });
  }

  private payload(line: Line): ExpenseLinePayload {
    const bank = this.isBank(line);
    const shortage = this.shortageOf(line);
    return {
      typeId: line.typeId,
      source: bank ? 'bank' : shortage ? 'shortage' : 'cash',
      ...(bank ? { bankAccountId: line.source.slice(BANK.length), storeId: line.storeId, expenseDate: line.date } : {}),
      ...(shortage ? { sessionId: shortage.sessionId } : {}),
      supplierId: line.supplierId || null,
      amount: Number(line.amount),
      purpose: line.purpose.trim(),
    };
  }

  private firstProblem(lines: Line[]): string {
    if (lines.length === 0) {
      return 'Choose at least one line.';
    }
    const ws = this.workspace()!;
    for (const [index, line] of lines.entries()) {
      const at = (text: string) => (lines.length > 1 ? this.i18n.t('Line {no}: {problem}', { no: index + 1, problem: this.i18n.t(text) }) : text);
      if (!line.typeId) {
        return at('Choose an expense type.');
      }
      if (!line.source) {
        return at('Choose where the money comes from.');
      }
      if (this.isBank(line)) {
        if (!line.storeId) {
          return at('Choose a store.');
        }
        if (!line.date || line.date > ws.today) {
          return at("Choose a date that isn't in the future.");
        }
      }
      const amount = Number(line.amount);
      if (!(amount > 0) || Math.round(amount * 100) !== amount * 100) {
        return at('Enter an amount above ₾0 with at most 2 decimals.');
      }
      const shortage = this.shortageOf(line);
      if (shortage) {
        const total = lines
          .filter((other) => other.source === line.source)
          .reduce((sum, other) => sum + (Number(other.amount) || 0), 0);
        if (Math.round(total * 100) > Math.round(shortage.left * 100)) {
          return at(this.i18n.t('At most ₾{amount} of the shortage is left to cover', { amount: shortage.left.toFixed(2) }));
        }
      }
      if (!line.purpose.trim()) {
        return at('Write the purpose of the expense.');
      }
    }
    return '';
  }

  private newLine(typeId: string): Line {
    const ws = this.workspace()!;
    return {
      key: `line-${nextKey++}`,
      selected: false,
      date: ws.today,
      typeId,
      supplierId: '',
      source: ws.canPostCash ? CASH : '',
      storeId: ws.stores.length === 1 ? ws.stores[0].id : ws.session?.storeId ?? '',
      amount: null,
      purpose: '',
    };
  }

  private initialLines(): Line[] {
    if (!this.canPost()) {
      return [];
    }
    return [...this.typeOptions()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((type) => this.newLine(type.id));
  }
}
