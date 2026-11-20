import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Download, Eye, LucideAngularModule, PenLine, Plus, Search, Trash2, Upload } from 'lucide-angular';
import { Modal } from '../../../../shared/modal/modal';
import { Pager } from '../../../../shared/pager/pager';
import { Pagination } from '../../../../shared/pager/pagination';
import {
  COUNTERPARTY_TYPE_LABELS,
  COUNTERPARTY_STATUS_LABELS,
  ORGANIZATION_TYPE_LABELS,
  Counterparty,
  CounterpartyPreviewRow,
  CounterpartyStatus,
  OrganizationType,
  counterpartyTypeOf,
  vatLabel,
} from '../../../../shared/counterparties/counterparty.model';
import { XlsxImport } from '../../../../shared/xlsx-import/xlsx-import';
import { PreviewColumn, saveFile, today } from '../../../../shared/xlsx-import/xlsx-import.model';
import { CounterpartyForm } from '../../../../shared/counterparties/counterparty-form/counterparty-form';
import { CounterpartyService } from '../../../../shared/counterparties/counterparty.service';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { ColumnHeader, ColumnTable } from '../../../../shared/column-order/column-header';
import { ColumnLayout, ColumnOrder } from '../../../../shared/column-order/column-order';
import { ColumnFilter, FilterOption } from '../../../../shared/column-order/column-filter';
import { ColumnPicker } from '../../../../shared/column-order/column-picker';
import { SavedViews, SavedViewsMenu } from '../../../../shared/column-order/saved-views';

type ColumnKey =
  | 'name'
  | 'counterpartyType'
  | 'category'
  | 'idCode'
  | 'organizationType'
  | 'vat'
  | 'contactPerson'
  | 'phone'
  | 'email'
  | 'status';

const TRANSLATED: ColumnKey[] = ['counterpartyType', 'organizationType', 'vat', 'status'];

interface ViewState {
  search: string;
  counterpartyType: 'all' | 'supplier' | 'client';
  status: 'all' | CounterpartyStatus;
  organizationType: 'all' | OrganizationType;
  vat: 'all' | 'yes' | 'no';
  category: string;
  columnFilters: Partial<Record<string, string[]>>;
  showMore: boolean;
  columns: ColumnLayout;
}

function cell(counterparty: Counterparty, key: string): string {
  switch (key as ColumnKey) {
    case 'name':
      return counterparty.name;
    case 'counterpartyType':
      return COUNTERPARTY_TYPE_LABELS[counterpartyTypeOf(counterparty)];
    case 'category':
      return counterparty.category ?? '';
    case 'idCode':
      return counterparty.identificationCode ?? '';
    case 'organizationType':
      return ORGANIZATION_TYPE_LABELS[counterparty.organizationType];
    case 'vat':
      return vatLabel(counterparty.vatPayer);
    case 'contactPerson':
      return counterparty.contactPerson ?? '';
    case 'phone':
      return counterparty.phone ?? '';
    case 'email':
      return counterparty.email ?? '';
    case 'status':
      return COUNTERPARTY_STATUS_LABELS[counterparty.status];
  }
}

@Component({
  selector: 'app-counterparties-list',
  imports: [
    ColumnFilter,
    ColumnHeader,
    ColumnPicker,
    ColumnTable,
    SavedViewsMenu,
    TranslatePipe,
    FormsModule,
    LucideAngularModule,
    RouterLink,
    Modal,
    Pager,
    CounterpartyForm,
    XlsxImport,
  ],
  templateUrl: './counterparties-list.html',
})
export class CounterpartiesList implements OnInit {
  private readonly i18n = inject(I18nService);
  protected readonly columnOrder = new ColumnOrder('counterparties', [
    { key: 'name', label: 'Counterparty name' },
    { key: 'counterpartyType', label: 'Counterparty type' },
    { key: 'category', label: 'Category' },
    { key: 'idCode', label: 'Identification code' },
    { key: 'organizationType', label: 'Organization type' },
    { key: 'vat', label: 'VAT status' },
    { key: 'contactPerson', label: 'Contact person' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'status', label: 'Status' },
  ]);
  protected readonly views = new SavedViews<ViewState>('counterparties');
  protected readonly counterpartyService = inject(CounterpartyService);

  protected readonly ViewIcon = Eye;
  protected readonly EditIcon = PenLine;
  protected readonly DeleteIcon = Trash2;
  protected readonly PlusIcon = Plus;
  protected readonly SearchIcon = Search;
  protected readonly ImportIcon = Upload;
  protected readonly ExportIcon = Download;

  protected readonly counterparties = signal<Counterparty[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly search = signal('');
  protected readonly counterpartyTypeFilter = signal<'all' | 'supplier' | 'client'>('all');
  protected readonly statusFilter = signal<'all' | CounterpartyStatus>('all');
  protected readonly organizationTypeFilter = signal<'all' | OrganizationType>('all');
  protected readonly vatFilter = signal<'all' | 'yes' | 'no'>('all');
  protected readonly categoryFilter = signal('all');
  protected readonly columnFilters = signal<Partial<Record<string, string[]>>>({});
  protected readonly showMore = signal(false);

  protected readonly categories = computed(() =>
    [...new Set(this.counterparties().flatMap((p) => (p.category ? [p.category] : [])))].sort((a, b) => a.localeCompare(b)),
  );
  protected readonly moreFilterCount = computed(
    () =>
      Number(this.organizationTypeFilter() !== 'all') + Number(this.vatFilter() !== 'all') + Number(this.categoryFilter() !== 'all'),
  );
  protected readonly hasFilters = computed(
    () =>
      this.search().trim() !== '' ||
      this.counterpartyTypeFilter() !== 'all' ||
      this.statusFilter() !== 'all' ||
      this.moreFilterCount() > 0 ||
      Object.keys(this.columnFilters()).length > 0,
  );
  protected readonly filterOptions = computed(() => {
    this.i18n.language();
    const options: Partial<Record<string, FilterOption[]>> = {};
    for (const { key } of this.columnOrder.available()) {
      const values = [...new Set(this.counterparties().map((p) => cell(p, key)))];
      const translated = TRANSLATED.includes(key as ColumnKey);
      options[key] = values
        .map((value) => ({ value, label: translated ? this.i18n.t(value) : value }))
        .sort((a, b) => a.label.localeCompare(b.label));
    }
    return options;
  });
  protected readonly filtered = computed(() => {
    const query = this.search().trim().toLowerCase();
    const counterpartyType = this.counterpartyTypeFilter();
    const status = this.statusFilter();
    const organizationType = this.organizationTypeFilter();
    const vat = this.vatFilter();
    const category = this.categoryFilter();
    const columnFilters = Object.entries(this.columnFilters());
    return this.counterparties().filter(
      (p) =>
        (counterpartyType === 'all' || (counterpartyType === 'supplier' ? p.isSupplier : p.isClient)) &&
        (status === 'all' || p.status === status) &&
        (organizationType === 'all' || p.organizationType === organizationType) &&
        (vat === 'all' || p.vatPayer === (vat === 'yes')) &&
        (category === 'all' || p.category === category) &&
        columnFilters.every(([key, values]) => !values || values.includes(cell(p, key))) &&
        (!query ||
          [p.name, p.identificationCode, p.category, p.contactPerson, p.phone, p.email].some((value) =>
            (value ?? '').toLowerCase().includes(query),
          )),
    );
  });
  protected readonly pages = new Pagination(
    () => this.filtered(),
    () => [
      this.search(),
      this.counterpartyTypeFilter(),
      this.statusFilter(),
      this.organizationTypeFilter(),
      this.vatFilter(),
      this.categoryFilter(),
      this.columnFilters(),
    ],
  );

  protected readonly isFormOpen = signal(false);
  protected readonly isImportOpen = signal(false);
  protected readonly isExporting = signal(false);
  protected readonly importColumns: PreviewColumn<CounterpartyPreviewRow>[] = [
    { label: 'Counterparty name', value: (row) => row.name, strong: true },
    { label: 'Counterparty type', value: (row) => COUNTERPARTY_TYPE_LABELS[row.counterpartyType] },
    { label: 'Category', value: (row) => row.category },
    { label: 'Identification code', value: (row) => row.identificationCode ?? '—' },
    { label: 'Organization type', value: (row) => ORGANIZATION_TYPE_LABELS[row.organizationType] },
    { label: 'VAT status', value: (row) => vatLabel(row.vatPayer) },
    { label: 'Contact person', value: (row) => row.contactPerson ?? '—' },
    { label: 'Status', value: (row) => COUNTERPARTY_STATUS_LABELS[row.status] },
  ];
  protected readonly editing = signal<Counterparty | null>(null);

  protected readonly captureView = (): ViewState => ({
    search: this.search(),
    counterpartyType: this.counterpartyTypeFilter(),
    status: this.statusFilter(),
    organizationType: this.organizationTypeFilter(),
    vat: this.vatFilter(),
    category: this.categoryFilter(),
    columnFilters: this.columnFilters(),
    showMore: this.showMore(),
    columns: this.columnOrder.layout(),
  });

  ngOnInit(): void {
    this.loadCounterparties();
  }

  loadCounterparties(): void {
    this.isLoading.set(true);
    this.counterpartyService.list().subscribe({
      next: (counterparties) => {
        this.counterparties.set(counterparties);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load counterparties. Is the backend running?');
        this.isLoading.set(false);
      },
    });
  }

  exportCounterparties(): void {
    this.isExporting.set(true);
    this.counterpartyService.export().subscribe({
      next: (blob) => {
        this.isExporting.set(false);
        saveFile(blob, `counterparties-${today()}.xlsx`);
      },
      error: () => {
        this.isExporting.set(false);
        this.errorMessage.set('Could not export the counterparties. Is the backend running?');
      },
    });
  }

  cell(counterparty: Counterparty, key: string): string {
    return cell(counterparty, key);
  }

  optionsFor(key: string): FilterOption[] {
    return this.filterOptions()[key] ?? [];
  }

  selectedFor(key: string): string[] | null {
    return this.columnFilters()[key] ?? null;
  }

  setColumnFilter(key: string, values: string[] | null): void {
    this.columnFilters.update((filters) => {
      const { [key]: _, ...rest } = filters;
      return values === null ? rest : { ...rest, [key]: values };
    });
  }

  clearFilters(): void {
    this.search.set('');
    this.counterpartyTypeFilter.set('all');
    this.statusFilter.set('all');
    this.organizationTypeFilter.set('all');
    this.vatFilter.set('all');
    this.categoryFilter.set('all');
    this.columnFilters.set({});
  }

  applyView(state: unknown): void {
    if (!state) {
      this.clearFilters();
      this.showMore.set(false);
      this.columnOrder.reset();
      return;
    }
    const view = state as ViewState;
    this.search.set(view.search ?? '');
    this.counterpartyTypeFilter.set(view.counterpartyType ?? 'all');
    this.statusFilter.set(view.status ?? 'all');
    this.organizationTypeFilter.set(view.organizationType ?? 'all');
    this.vatFilter.set(view.vat ?? 'all');
    this.categoryFilter.set(view.category ?? 'all');
    this.columnFilters.set(view.columnFilters ?? {});
    this.showMore.set(!!view.showMore);
    if (view.columns) {
      this.columnOrder.restore(view.columns);
    }
  }

  openAddForm(): void {
    this.editing.set(null);
    this.isFormOpen.set(true);
  }

  editCounterparty(counterparty: Counterparty): void {
    this.editing.set(counterparty);
    this.isFormOpen.set(true);
  }

  onSaved(): void {
    this.isFormOpen.set(false);
    this.loadCounterparties();
  }

  deleteCounterparty(counterparty: Counterparty): void {
    if (!this.i18n.confirm(this.i18n.t('Delete the counterparty {name}?', { name: counterparty.name }))) {
      return;
    }
    this.errorMessage.set('');
    this.counterpartyService.remove(counterparty.id).subscribe({
      next: () => this.loadCounterparties(),
      error: (error: HttpErrorResponse) =>
        this.errorMessage.set(error.error?.message ?? 'Could not delete the counterparty.'),
    });
  }

  protected isUsed(counterparty: Counterparty): boolean {
    return counterparty.productCount + counterparty.receiptCount > 0;
  }

  protected deleteTitle(counterparty: Counterparty): string {
    return this.isUsed(counterparty) ? 'In use on products or receipts: set it to Inactive instead' : 'Delete';
  }
}
