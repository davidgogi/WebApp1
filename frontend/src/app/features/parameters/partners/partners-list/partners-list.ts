import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Download, Eye, LucideAngularModule, PenLine, Plus, Search, Trash2, Upload } from 'lucide-angular';
import { Modal } from '../../../../shared/modal/modal';
import { Pager } from '../../../../shared/pager/pager';
import { Pagination } from '../../../../shared/pager/pagination';
import {
  PARTNER_ROLE_LABELS,
  PARTNER_STATUS_LABELS,
  PARTNER_TYPE_LABELS,
  Partner,
  PartnerPreviewRow,
  PartnerStatus,
  PartnerType,
  partnerRole,
  vatLabel,
} from '../../../../shared/partners/partner.model';
import { XlsxImport } from '../../../../shared/xlsx-import/xlsx-import';
import { PreviewColumn, saveFile, today } from '../../../../shared/xlsx-import/xlsx-import.model';
import { PartnerForm } from '../../../../shared/partners/partner-form/partner-form';
import { PartnerService } from '../../../../shared/partners/partner.service';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { ColumnHeader, ColumnTable } from '../../../../shared/column-order/column-header';
import { ColumnLayout, ColumnOrder } from '../../../../shared/column-order/column-order';
import { ColumnFilter, FilterOption } from '../../../../shared/column-order/column-filter';
import { ColumnPicker } from '../../../../shared/column-order/column-picker';
import { SavedViews, SavedViewsMenu } from '../../../../shared/column-order/saved-views';

type ColumnKey =
  | 'name'
  | 'role'
  | 'category'
  | 'idCode'
  | 'type'
  | 'vat'
  | 'contactPerson'
  | 'phone'
  | 'email'
  | 'status';

const TRANSLATED: ColumnKey[] = ['role', 'type', 'vat', 'status'];

interface ViewState {
  search: string;
  role: 'all' | 'supplier' | 'client';
  status: 'all' | PartnerStatus;
  type: 'all' | PartnerType;
  vat: 'all' | 'yes' | 'no';
  category: string;
  columnFilters: Partial<Record<string, string[]>>;
  showMore: boolean;
  columns: ColumnLayout;
}

function cell(partner: Partner, key: string): string {
  switch (key as ColumnKey) {
    case 'name':
      return partner.name;
    case 'role':
      return PARTNER_ROLE_LABELS[partnerRole(partner)];
    case 'category':
      return partner.category ?? '';
    case 'idCode':
      return partner.identificationCode ?? '';
    case 'type':
      return PARTNER_TYPE_LABELS[partner.type];
    case 'vat':
      return vatLabel(partner.vatPayer);
    case 'contactPerson':
      return partner.contactPerson ?? '';
    case 'phone':
      return partner.phone ?? '';
    case 'email':
      return partner.email ?? '';
    case 'status':
      return PARTNER_STATUS_LABELS[partner.status];
  }
}

@Component({
  selector: 'app-partners-list',
  imports: [
    ColumnFilter,
    ColumnHeader,
    ColumnPicker,
    ColumnTable,
    SavedViewsMenu,
    TranslatePipe,
    FormsModule,
    LucideAngularModule,
    Modal,
    Pager,
    PartnerForm,
    XlsxImport,
  ],
  templateUrl: './partners-list.html',
})
export class PartnersList implements OnInit {
  private readonly i18n = inject(I18nService);
  protected readonly columnOrder = new ColumnOrder('counterparties', [
    { key: 'name', label: 'Counterparty name' },
    { key: 'role', label: 'Counterparty type' },
    { key: 'category', label: 'Category' },
    { key: 'idCode', label: 'Identification code' },
    { key: 'type', label: 'Organization type' },
    { key: 'vat', label: 'VAT status' },
    { key: 'contactPerson', label: 'Contact person' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'status', label: 'Status' },
  ]);
  protected readonly views = new SavedViews<ViewState>('counterparties');
  protected readonly partnerService = inject(PartnerService);
  protected readonly typeLabels = PARTNER_TYPE_LABELS;
  protected readonly roleLabels = PARTNER_ROLE_LABELS;
  protected readonly vatLabel = vatLabel;
  protected readonly partnerRole = partnerRole;

  protected readonly ViewIcon = Eye;
  protected readonly EditIcon = PenLine;
  protected readonly DeleteIcon = Trash2;
  protected readonly PlusIcon = Plus;
  protected readonly SearchIcon = Search;
  protected readonly ImportIcon = Upload;
  protected readonly ExportIcon = Download;

  protected readonly partners = signal<Partner[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly search = signal('');
  protected readonly roleFilter = signal<'all' | 'supplier' | 'client'>('all');
  protected readonly statusFilter = signal<'all' | PartnerStatus>('all');
  protected readonly typeFilter = signal<'all' | PartnerType>('all');
  protected readonly vatFilter = signal<'all' | 'yes' | 'no'>('all');
  protected readonly categoryFilter = signal('all');
  protected readonly columnFilters = signal<Partial<Record<string, string[]>>>({});
  protected readonly showMore = signal(false);

  protected readonly categories = computed(() =>
    [...new Set(this.partners().flatMap((p) => (p.category ? [p.category] : [])))].sort((a, b) => a.localeCompare(b)),
  );
  protected readonly moreFilterCount = computed(
    () =>
      Number(this.typeFilter() !== 'all') + Number(this.vatFilter() !== 'all') + Number(this.categoryFilter() !== 'all'),
  );
  protected readonly hasFilters = computed(
    () =>
      this.search().trim() !== '' ||
      this.roleFilter() !== 'all' ||
      this.statusFilter() !== 'all' ||
      this.moreFilterCount() > 0 ||
      Object.keys(this.columnFilters()).length > 0,
  );
  protected readonly filterOptions = computed(() => {
    this.i18n.language();
    const options: Partial<Record<string, FilterOption[]>> = {};
    for (const { key } of this.columnOrder.available()) {
      const values = [...new Set(this.partners().map((p) => cell(p, key)))];
      const translated = TRANSLATED.includes(key as ColumnKey);
      options[key] = values
        .map((value) => ({ value, label: translated ? this.i18n.t(value) : value }))
        .sort((a, b) => a.label.localeCompare(b.label));
    }
    return options;
  });
  protected readonly filtered = computed(() => {
    const query = this.search().trim().toLowerCase();
    const role = this.roleFilter();
    const status = this.statusFilter();
    const type = this.typeFilter();
    const vat = this.vatFilter();
    const category = this.categoryFilter();
    const columnFilters = Object.entries(this.columnFilters());
    return this.partners().filter(
      (p) =>
        (role === 'all' || (role === 'supplier' ? p.isSupplier : p.isClient)) &&
        (status === 'all' || p.status === status) &&
        (type === 'all' || p.type === type) &&
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
      this.roleFilter(),
      this.statusFilter(),
      this.typeFilter(),
      this.vatFilter(),
      this.categoryFilter(),
      this.columnFilters(),
    ],
  );

  protected readonly isFormOpen = signal(false);
  protected readonly isImportOpen = signal(false);
  protected readonly isExporting = signal(false);
  protected readonly importColumns: PreviewColumn<PartnerPreviewRow>[] = [
    { label: 'Counterparty name', value: (row) => row.name, strong: true },
    { label: 'Counterparty type', value: (row) => PARTNER_ROLE_LABELS[row.role] },
    { label: 'Category', value: (row) => row.category },
    { label: 'Identification code', value: (row) => row.identificationCode ?? '—' },
    { label: 'Organization type', value: (row) => PARTNER_TYPE_LABELS[row.type] },
    { label: 'VAT status', value: (row) => vatLabel(row.vatPayer) },
    { label: 'Contact person', value: (row) => row.contactPerson ?? '—' },
    { label: 'Status', value: (row) => PARTNER_STATUS_LABELS[row.status] },
  ];
  protected readonly editing = signal<Partner | null>(null);
  protected readonly viewing = signal<Partner | null>(null);

  protected readonly captureView = (): ViewState => ({
    search: this.search(),
    role: this.roleFilter(),
    status: this.statusFilter(),
    type: this.typeFilter(),
    vat: this.vatFilter(),
    category: this.categoryFilter(),
    columnFilters: this.columnFilters(),
    showMore: this.showMore(),
    columns: this.columnOrder.layout(),
  });

  ngOnInit(): void {
    this.loadPartners();
  }

  loadPartners(): void {
    this.isLoading.set(true);
    this.partnerService.list().subscribe({
      next: (partners) => {
        this.partners.set(partners);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load counterparties. Is the backend running?');
        this.isLoading.set(false);
      },
    });
  }

  exportPartners(): void {
    this.isExporting.set(true);
    this.partnerService.export().subscribe({
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

  cell(partner: Partner, key: string): string {
    return cell(partner, key);
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
    this.roleFilter.set('all');
    this.statusFilter.set('all');
    this.typeFilter.set('all');
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
    this.roleFilter.set(view.role ?? 'all');
    this.statusFilter.set(view.status ?? 'all');
    this.typeFilter.set(view.type ?? 'all');
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

  viewPartner(partner: Partner): void {
    this.viewing.set(partner);
  }

  editFromView(partner: Partner): void {
    this.viewing.set(null);
    this.editPartner(partner);
  }

  editPartner(partner: Partner): void {
    this.editing.set(partner);
    this.isFormOpen.set(true);
  }

  onSaved(): void {
    this.isFormOpen.set(false);
    this.loadPartners();
  }

  deletePartner(partner: Partner): void {
    if (!this.i18n.confirm(this.i18n.t('Delete the counterparty {name}?', { name: partner.name }))) {
      return;
    }
    this.errorMessage.set('');
    this.partnerService.remove(partner.id).subscribe({
      next: () => this.loadPartners(),
      error: (error: HttpErrorResponse) =>
        this.errorMessage.set(error.error?.message ?? 'Could not delete the counterparty.'),
    });
  }

  protected isUsed(partner: Partner): boolean {
    return partner.productCount + partner.receiptCount > 0;
  }

  protected deleteTitle(partner: Partner): string {
    return this.isUsed(partner) ? 'In use on products or receipts: set it to Inactive instead' : 'Delete';
  }
}
