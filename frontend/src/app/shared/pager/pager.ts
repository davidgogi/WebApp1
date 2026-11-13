import { Component, input } from '@angular/core';
import { PAGE_SIZES, Pagination } from './pagination';
import { TranslatePipe } from '../../core/i18n/t.pipe';

@Component({
  selector: 'app-pager',
  imports: [TranslatePipe],
  templateUrl: './pager.html',
  styleUrl: './pager.css',
})
export class Pager {
  readonly pagination = input.required<Pagination<unknown>>();

  protected readonly pageSizes = PAGE_SIZES;

  protected changeSize(event: Event): void {
    this.pagination().setPageSize(Number((event.target as HTMLSelectElement).value));
  }
}
