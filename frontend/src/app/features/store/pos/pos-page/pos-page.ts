import { Component, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, Search, Trash2 } from 'lucide-angular';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { Modal } from '../../../../shared/modal/modal';
import { PaymentMethod, errorText } from '../../cash-register/cash-register.model';
import { CashRegisterService } from '../../cash-register/cash-register.service';
import { SaleDetail } from '../../sales/sale.model';
import { CartLine, PosCatalog, PosProduct } from '../pos.model';
import { PosService } from '../pos.service';

const round2 = (value: number) => Math.round(value * 100) / 100;
const round3 = (value: number) => Math.round(value * 1000) / 1000;

@Component({
  selector: 'app-pos-page',
  imports: [TranslatePipe, DecimalPipe, FormsModule, RouterLink, LucideAngularModule, Modal],
  templateUrl: './pos-page.html',
  styleUrl: './pos-page.css',
})
export class PosPage implements OnInit {
  private readonly posService = inject(PosService);
  private readonly cashRegisterService = inject(CashRegisterService);
  private readonly i18n = inject(I18nService);
  private readonly searchBox = viewChild<ElementRef<HTMLInputElement>>('searchBox');

  protected readonly SearchIcon = Search;
  protected readonly DeleteIcon = Trash2;

  protected readonly catalog = signal<PosCatalog | null>(null);
  protected readonly noRegister = signal(false);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly lastSale = signal<SaleDetail | null>(null);

  protected readonly search = signal('');
  protected readonly categoryId = signal('');
  protected readonly cart = signal<CartLine[]>([]);

  protected readonly payOpen = signal(false);
  protected readonly method = signal<PaymentMethod>('cash');
  protected readonly received = signal<number | null>(null);
  protected readonly isPaying = signal(false);
  protected readonly payError = signal('');

  protected readonly products = computed(() => {
    const query = this.search().trim().toLowerCase();
    return (this.catalog()?.products ?? []).filter(
      (product) =>
        (!this.categoryId() || product.categoryId === this.categoryId()) &&
        (!query || product.name.toLowerCase().includes(query) || product.barcode.toLowerCase().includes(query)),
    );
  });
  protected readonly total = computed(() => round2(this.cart().reduce((sum, line) => sum + this.lineTotal(line), 0)));
  protected readonly hasProblem = computed(() =>
    this.cart().some((line) => !(line.quantity > 0) || line.quantity > line.product.stock || !this.wholeOk(line)),
  );
  protected readonly change = computed(() => {
    const received = Number(this.received());
    return this.received() === null || `${this.received()}` === '' ? null : round2(received - this.total());
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.cashRegisterService.current().subscribe({
      next: (session) => {
        if (session) {
          this.loadCatalog();
        } else {
          this.catalog.set(null);
          this.noRegister.set(true);
          this.isLoading.set(false);
        }
      },
      error: (error) => {
        this.isLoading.set(false);
        this.errorMessage.set(errorText(error, 'Could not load the catalogue.'));
      },
    });
  }

  private loadCatalog(): void {
    this.posService.catalog().subscribe({
      next: (catalog) => {
        this.catalog.set(catalog);
        this.noRegister.set(false);
        this.isLoading.set(false);
        this.cart.update((lines) =>
          lines.flatMap((line) => {
            const product = catalog.products.find((p) => p.id === line.product.id);
            return product ? [{ product, quantity: line.quantity }] : [];
          }),
        );
        setTimeout(() => this.searchBox()?.nativeElement.focus());
      },
      error: (error) => {
        this.isLoading.set(false);
        this.errorMessage.set(errorText(error, 'Could not load the catalogue.'));
      },
    });
  }

  onSearchEnter(): void {
    const query = this.search().trim();
    if (!query) {
      return;
    }
    const exact = this.catalog()?.products.find((product) => product.barcode === query);
    const matches = this.products();
    const product = exact ?? (matches.length === 1 ? matches[0] : null);
    if (product) {
      this.add(product);
      this.search.set('');
    } else {
      this.errorMessage.set(this.i18n.t('No product with the barcode {code}', { code: query }));
    }
  }

  add(product: PosProduct): void {
    this.errorMessage.set('');
    this.lastSale.set(null);
    this.cart.update((lines) => {
      const existing = lines.find((line) => line.product.id === product.id);
      if (existing) {
        return lines.map((line) => (line === existing ? { ...line, quantity: round3(line.quantity + 1) } : line));
      }
      return [...lines, { product, quantity: 1 }];
    });
  }

  setQuantity(line: CartLine, value: number | string): void {
    const quantity = round3(Number(value));
    this.cart.update((lines) => lines.map((l) => (l === line ? { ...l, quantity: Number.isFinite(quantity) ? quantity : 0 } : l)));
  }

  remove(line: CartLine): void {
    this.cart.update((lines) => lines.filter((l) => l !== line));
  }

  clearCart(): void {
    if (this.cart().length === 0 || this.i18n.confirm(this.i18n.t('Empty the cart?'))) {
      this.cart.set([]);
    }
  }

  lineTotal(line: CartLine): number {
    return round2(line.product.price * (line.quantity || 0));
  }

  wholeOk(line: CartLine): boolean {
    return line.product.unit !== 'pcs' || Number.isInteger(line.quantity);
  }

  openPay(): void {
    if (this.cart().length === 0 || this.hasProblem()) {
      return;
    }
    this.method.set('cash');
    this.received.set(null);
    this.payError.set('');
    this.payOpen.set(true);
  }

  pay(): void {
    const cash = this.method() === 'cash';
    const received = this.received() === null || `${this.received()}` === '' ? this.total() : Number(this.received());
    if (cash && received < this.total()) {
      this.payError.set('The cash received is less than the total.');
      return;
    }
    this.isPaying.set(true);
    this.payError.set('');
    this.posService
      .sell({
        items: this.cart().map((line) => ({ productId: line.product.id, quantity: line.quantity })),
        paymentMethod: this.method(),
        cashReceived: cash ? received : undefined,
      })
      .subscribe({
        next: (sale) => {
          this.isPaying.set(false);
          this.payOpen.set(false);
          this.cart.set([]);
          this.lastSale.set(sale);
          this.load();
        },
        error: (error) => {
          this.isPaying.set(false);
          this.payError.set(errorText(error, 'The sale did not go through.'));
        },
      });
  }
}
