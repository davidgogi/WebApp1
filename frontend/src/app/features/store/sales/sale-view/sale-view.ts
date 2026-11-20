import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ArrowLeft, LucideAngularModule } from 'lucide-angular';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { Modal } from '../../../../shared/modal/modal';
import { PAYMENT_LABELS, errorText } from '../../cash-register/cash-register.model';
import { SALE_KIND_LABELS, SaleDetail, SaleLine } from '../sale.model';
import { SaleService } from '../sale.service';

const round2 = (value: number) => Math.round(value * 100) / 100;
const round3 = (value: number) => Math.round(value * 1000) / 1000;

@Component({
  selector: 'app-sale-view',
  imports: [TranslatePipe, DatePipe, DecimalPipe, FormsModule, RouterLink, LucideAngularModule, Modal],
  templateUrl: './sale-view.html',
})
export class SaleView implements OnInit {
  private readonly saleService = inject(SaleService);
  private readonly router = inject(Router);

  readonly id = input.required<string>();

  protected readonly BackIcon = ArrowLeft;
  protected readonly kindLabels = SALE_KIND_LABELS;
  protected readonly paymentLabels = PAYMENT_LABELS;

  protected readonly sale = signal<SaleDetail | null>(null);
  protected readonly errorMessage = signal('');

  protected readonly returnOpen = signal(false);
  protected readonly quantities = signal<Record<string, number>>({});
  protected readonly returnNote = signal('');
  protected readonly isReturning = signal(false);
  protected readonly returnError = signal('');

  protected readonly returnTotal = computed(() => {
    const sale = this.sale();
    if (!sale) {
      return 0;
    }
    return round2(
      sale.lines.reduce((sum, line) => {
        const quantity = Number(this.quantities()[line.id]) || 0;
        return sum + round2(quantity >= this.left(line) ? line.lineTotal * (this.left(line) / line.quantity) : quantity * line.unitPrice);
      }, 0),
    );
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.saleService.detail(this.id()).subscribe({
      next: (sale) => this.sale.set(sale),
      error: (error) => this.errorMessage.set(errorText(error, 'Could not load this sale.')),
    });
  }

  left(line: SaleLine): number {
    return round3(line.quantity - line.returnedQuantity);
  }

  openReturn(): void {
    this.quantities.set({});
    this.returnNote.set('');
    this.returnError.set('');
    this.returnOpen.set(true);
  }

  returnAll(): void {
    const sale = this.sale();
    if (sale) {
      this.quantities.set(Object.fromEntries(sale.lines.filter((line) => this.left(line) > 0).map((line) => [line.id, this.left(line)])));
    }
  }

  setQuantity(line: SaleLine, value: number | string): void {
    this.quantities.update((all) => ({ ...all, [line.id]: Number(value) }));
  }

  confirmReturn(): void {
    const sale = this.sale();
    if (!sale) {
      return;
    }
    const lines = sale.lines
      .map((line) => ({ lineId: line.id, quantity: round3(Number(this.quantities()[line.id]) || 0) }))
      .filter((line) => line.quantity > 0);
    if (lines.length === 0) {
      this.returnError.set('Enter how much of at least one line comes back.');
      return;
    }
    this.isReturning.set(true);
    this.returnError.set('');
    this.saleService.returnLines(sale.id, lines, this.returnNote().trim() || undefined).subscribe({
      next: (created) => {
        this.isReturning.set(false);
        this.returnOpen.set(false);
        this.router.navigate(['/store/sales', created.id]);
      },
      error: (error) => {
        this.isReturning.set(false);
        this.returnError.set(errorText(error, 'The return did not go through.'));
      },
    });
  }
}
