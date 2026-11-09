import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, PenLine, Plus, Search, Trash2 } from 'lucide-angular';
import { Modal } from '../../../../shared/modal/modal';
import { Pager } from '../../../../shared/pager/pager';
import { Pagination } from '../../../../shared/pager/pagination';
import { PARTNER_TYPE_LABELS, Partner, PartnerStatus, PartnerType } from '../../../../shared/partners/partner.model';
import { PartnerForm } from '../../../../shared/partners/partner-form/partner-form';
import { PartnerService } from '../../../../shared/partners/partner.service';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { ColumnHeader, ColumnTable } from '../../../../shared/column-order/column-header';
import { ColumnTools } from '../../../../shared/column-order/column-tools';
import { ColumnOrder } from '../../../../shared/column-order/column-order';

@Component({
  selector: 'app-partners-list',
  imports: [ColumnHeader, ColumnTable, ColumnTools, TranslatePipe, FormsModule, LucideAngularModule, Modal, Pager, PartnerForm],
  templateUrl: './partners-list.html',
})
export class PartnersList implements OnInit {
  private readonly i18n = inject(I18nService);
  protected readonly columnOrder = new ColumnOrder('partners', [
    { key: 'partner', label: 'Partner' },
    { key: 'roles', label: 'Role' },
    { key: 'type', label: 'Type' },
    { key: 'idCode', label: 'ID code' },
    { key: 'vat', label: 'VAT' },
    { key: 'contact', label: 'Contact' },
    { key: 'email', label: 'Email' },
    { key: 'products', label: 'Products' },
    { key: 'status', label: 'Status' },
  ]);
  private readonly partnerService = inject(PartnerService);
  protected readonly typeLabels = PARTNER_TYPE_LABELS;

  protected readonly EditIcon = PenLine;
  protected readonly DeleteIcon = Trash2;
  protected readonly PlusIcon = Plus;
  protected readonly SearchIcon = Search;

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
  protected readonly editing = signal<Partner | null>(null);

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
        this.errorMessage.set('Could not load partners. Is the backend running?');
        this.isLoading.set(false);
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

  editPartner(partner: Partner): void {
    this.editing.set(partner);
    this.isFormOpen.set(true);
  }

  onSaved(): void {
    this.isFormOpen.set(false);
    this.loadPartners();
  }

  deletePartner(partner: Partner): void {
    if (!this.i18n.confirm(this.i18n.t('Delete the partner {name}?', { name: partner.name }))) {
      return;
    }
    this.errorMessage.set('');
    this.partnerService.remove(partner.id).subscribe({
      next: () => this.loadPartners(),
      error: (error: HttpErrorResponse) =>
        this.errorMessage.set(error.error?.message ?? 'Could not delete the partner.'),
    });
  }

  protected isUsed(partner: Partner): boolean {
    return partner.productCount + partner.receiptCount > 0;
  }

  protected deleteTitle(partner: Partner): string {
    return this.isUsed(partner) ? 'In use on products or receipts: set it to Inactive instead' : 'Delete';
  }
}
