import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Download, Eye, FileSpreadsheet, LucideAngularModule, PenLine, Plus, Search, Trash2, Upload } from 'lucide-angular';
import { Modal } from '../../../../shared/modal/modal';
import { Pager } from '../../../../shared/pager/pager';
import { Pagination } from '../../../../shared/pager/pagination';
import { PARTNER_TYPE_LABELS, Partner, PartnerPreviewRow, PartnerStatus, PartnerType } from '../../../../shared/partners/partner.model';
import { XlsxImport } from '../../../../shared/xlsx-import/xlsx-import';
import { PreviewColumn, saveFile, today } from '../../../../shared/xlsx-import/xlsx-import.model';
import { PartnerForm } from '../../../../shared/partners/partner-form/partner-form';
import { PartnerService } from '../../../../shared/partners/partner.service';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { ColumnHeader, ColumnTable } from '../../../../shared/column-order/column-header';
import { ColumnTools } from '../../../../shared/column-order/column-tools';
import { ColumnOrder } from '../../../../shared/column-order/column-order';

@Component({
  selector: 'app-partners-list',
  imports: [ColumnHeader, ColumnTable, ColumnTools, TranslatePipe, FormsModule, LucideAngularModule, Modal, Pager, PartnerForm, XlsxImport],
  templateUrl: './partners-list.html',
})
export class PartnersList implements OnInit {
  private readonly i18n = inject(I18nService);
  protected readonly columnOrder = new ColumnOrder('partners', [
    { key: 'partner', label: 'Counterparty' },
    { key: 'roles', label: 'Role' },
    { key: 'type', label: 'Type' },
    { key: 'idCode', label: 'ID code' },
    { key: 'vat', label: 'VAT' },
    { key: 'contact', label: 'Contact' },
    { key: 'email', label: 'Email' },
    { key: 'products', label: 'Products' },
    { key: 'status', label: 'Status' },
  ]);
  protected readonly partnerService = inject(PartnerService);
  protected readonly typeLabels = PARTNER_TYPE_LABELS;

  protected readonly ViewIcon = Eye;
  protected readonly EditIcon = PenLine;
  protected readonly DeleteIcon = Trash2;
  protected readonly PlusIcon = Plus;
  protected readonly SearchIcon = Search;
  protected readonly ImportIcon = Upload;
  protected readonly ExportIcon = Download;
  protected readonly TemplateIcon = FileSpreadsheet;

  protected readonly partners = signal<Partner[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly search = signal('');
  protected readonly roleFilter = signal<'all' | 'supplier' | 'client'>('all');
  protected readonly typeFilter = signal<'all' | PartnerType>('all');
  protected readonly vatFilter = signal<'all' | 'yes' | 'no'>('all');
  protected readonly statusFilter = signal<'all' | PartnerStatus>('all');
  protected readonly hasFilters = computed(
    () =>
      this.search().trim() !== '' ||
      this.roleFilter() !== 'all' ||
      this.typeFilter() !== 'all' ||
      this.vatFilter() !== 'all' ||
      this.statusFilter() !== 'all',
  );
  protected readonly filtered = computed(() => {
    const query = this.search().trim().toLowerCase();
    const role = this.roleFilter();
    const type = this.typeFilter();
    const vat = this.vatFilter();
    const status = this.statusFilter();
    return this.partners().filter(
      (s) =>
        (role === 'all' || (role === 'supplier' ? s.isSupplier : s.isClient)) &&
        (type === 'all' || s.type === type) &&
        (vat === 'all' || s.vatPayer === (vat === 'yes')) &&
        (status === 'all' || s.status === status) &&
        (!query ||
          [s.name, s.identificationCode, s.contactPerson, s.phone, s.email, s.address].some((value) =>
            (value ?? '').toLowerCase().includes(query),
          )),
    );
  });
  protected readonly pages = new Pagination(
    () => this.filtered(),
    () => [this.search(), this.roleFilter(), this.typeFilter(), this.vatFilter(), this.statusFilter()],
  );

  protected readonly isFormOpen = signal(false);
  protected readonly isImportOpen = signal(false);
  protected readonly isExporting = signal(false);
  protected readonly isDownloadingTemplate = signal(false);
  protected readonly importColumns: PreviewColumn<PartnerPreviewRow>[] = [
    { label: 'Counterparty', value: (row) => row.name, strong: true },
    { label: 'Role', value: (row) => ({ supplier: 'Supplier', client: 'Client', both: 'Both' })[row.role] },
    { label: 'Type', value: (row) => PARTNER_TYPE_LABELS[row.type] },
    { label: 'ID code', value: (row) => row.identificationCode ?? '—' },
    { label: 'VAT', value: (row) => (row.vatPayer ? 'VAT payer' : 'No') },
    { label: 'Contact', value: (row) => row.contactPerson ?? row.phone ?? '—' },
    { label: 'Status', value: (row) => (row.status === 'active' ? 'Active' : 'Inactive') },
  ];
  protected readonly editing = signal<Partner | null>(null);
  protected readonly viewing = signal<Partner | null>(null);

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

  downloadTemplate(): void {
    this.isDownloadingTemplate.set(true);
    this.partnerService.importSource.template().subscribe({
      next: (blob) => {
        this.isDownloadingTemplate.set(false);
        saveFile(blob, 'counterparties-template.xlsx');
      },
      error: () => {
        this.isDownloadingTemplate.set(false);
        this.errorMessage.set('Could not download the template. Is the backend running?');
      },
    });
  }

  clearFilters(): void {
    this.search.set('');
    this.roleFilter.set('all');
    this.typeFilter.set('all');
    this.vatFilter.set('all');
    this.statusFilter.set('all');
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
