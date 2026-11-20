import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, Search } from 'lucide-angular';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { Pager } from '../../../../shared/pager/pager';
import { Pagination } from '../../../../shared/pager/pagination';
import { PAYMENT_LABELS, PaymentMethod, daysAgo, errorText, localDate } from '../../cash-register/cash-register.model';
import { Store } from '../../stores/store.model';
import { StoreService } from '../../stores/store.service';
import { SALE_KIND_LABELS, SaleKind, SaleListItem } from '../sale.model';
import { SaleService } from '../sale.service';

@Component({
  selector: 'app-sales-list',
  imports: [TranslatePipe, DatePipe, DecimalPipe, FormsModule, RouterLink, LucideAngularModule, Pager],
  templateUrl: './sales-list.html',
})
export class SalesList implements OnInit {
  private readonly saleService = inject(SaleService);
  private readonly storeService = inject(StoreService);

  protected readonly SearchIcon = Search;
  protected readonly kindLabels = SALE_KIND_LABELS;
  protected readonly paymentLabels = PAYMENT_LABELS;

  protected readonly sales = signal<SaleListItem[]>([]);
  protected readonly stores = signal<Store[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly from = signal(daysAgo(6));
  protected readonly to = signal(localDate(new Date()));
  protected readonly storeFilter = signal('');
  protected readonly search = signal('');
  protected readonly kindFilter = signal<'all' | SaleKind>('all');
  protected readonly methodFilter = signal<'all' | PaymentMethod>('all');

  protected readonly filtered = computed(() => {
    const query = this.search().trim().toLowerCase();
    return this.sales().filter(
      (sale) =>
        (this.kindFilter() === 'all' || sale.kind === this.kindFilter()) &&
        (this.methodFilter() === 'all' || sale.paymentMethod === this.methodFilter()) &&
        (!query ||
          [sale.code, sale.original?.code ?? '', sale.createdByName, sale.storeName].some((value) => value.toLowerCase().includes(query))),
    );
  });
  protected readonly totals = computed(() => {
    const rows = this.filtered();
    const sum = (kind: SaleKind) => rows.filter((sale) => sale.kind === kind).reduce((total, sale) => total + sale.total, 0);
    return { sales: sum('sale'), returns: sum('return') };
  });
  protected readonly pages = new Pagination(
    () => this.filtered(),
    () => [this.search(), this.kindFilter(), this.methodFilter(), this.sales()],
  );

  ngOnInit(): void {
    this.storeService.list().subscribe((stores) => this.stores.set(stores));
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.saleService.list({ from: this.from(), to: this.to(), storeId: this.storeFilter() }).subscribe({
      next: (sales) => {
        this.sales.set(sales);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(errorText(error, 'Could not load sales. Is the backend running?'));
        this.isLoading.set(false);
      },
    });
  }

  clearFilters(): void {
    this.search.set('');
    this.kindFilter.set('all');
    this.methodFilter.set('all');
    this.storeFilter.set('');
    this.from.set(daysAgo(6));
    this.to.set(localDate(new Date()));
    this.load();
  }
}
