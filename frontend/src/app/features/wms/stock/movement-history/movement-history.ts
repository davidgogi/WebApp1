import { Component, computed, inject, input } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Pager } from '../../../../shared/pager/pager';
import { Pagination } from '../../../../shared/pager/pagination';
import { STOCK_MOVEMENT_LABELS, StockMovement, movementDocumentLink } from '../stock.model';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { AuthService } from '../../../../core/auth/auth.service';
import { canAccessModule } from '../../../../core/auth/access';
import { ColumnHeader, ColumnTable } from '../../../../shared/column-order/column-header';
import { ColumnTools } from '../../../../shared/column-order/column-tools';
import { ColumnOrder } from '../../../../shared/column-order/column-order';

@Component({
  selector: 'app-movement-history',
  imports: [ColumnHeader, ColumnTable, ColumnTools, TranslatePipe, DatePipe, DecimalPipe, RouterLink, Pager],
  templateUrl: './movement-history.html',
})
export class MovementHistory {
  readonly movements = input.required<StockMovement[]>();
  readonly showProduct = input(false);
  readonly showWarehouse = input(false);
  readonly linkProducts = input(false);
  protected readonly columnOrder = new ColumnOrder(
    'wms-movements',
    [
      { key: 'date', label: 'Date' },
      { key: 'type', label: 'Type' },
      { key: 'product', label: 'Product' },
      { key: 'warehouse', label: 'Warehouse' },
      { key: 'change', label: 'Change' },
      { key: 'balance', label: 'Balance after' },
      { key: 'by', label: 'By' },
      { key: 'document', label: 'Document / note' },
    ],
    (key) => (key !== 'product' || this.showProduct()) && (key !== 'warehouse' || this.showWarehouse()),
  );

  protected readonly labels = STOCK_MOVEMENT_LABELS;
  private readonly auth = inject(AuthService);
  private readonly canSeeStore = computed(() => canAccessModule(this.auth.user(), 'store'));
  protected readonly documentLink = (movement: StockMovement) => movementDocumentLink(movement, this.canSeeStore());
  protected readonly pages = new Pagination(() => this.movements());
}
