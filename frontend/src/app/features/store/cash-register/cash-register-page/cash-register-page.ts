import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { Modal } from '../../../../shared/modal/modal';
import { Pager } from '../../../../shared/pager/pager';
import { Pagination } from '../../../../shared/pager/pagination';
import { Store } from '../../stores/store.model';
import { StoreService } from '../../stores/store.service';
import {
  COVERAGE_LABELS,
  RegisterAvailability,
  RegisterSession,
  RegisterSessionDetail,
  daysAgo,
  errorText,
  localDate,
} from '../cash-register.model';
import { CashRegisterService } from '../cash-register.service';
import { RegisterDialog, RegisterDialogMode } from '../register-dialog/register-dialog';

@Component({
  selector: 'app-cash-register-page',
  imports: [TranslatePipe, DatePipe, DecimalPipe, FormsModule, RouterLink, Modal, Pager, RegisterDialog],
  templateUrl: './cash-register-page.html',
  styleUrl: './cash-register-page.css',
})
export class CashRegisterPage implements OnInit {
  private readonly cashRegisterService = inject(CashRegisterService);
  private readonly storeService = inject(StoreService);
  private readonly auth = inject(AuthService);

  protected readonly coverageLabels = COVERAGE_LABELS;
  protected readonly canOperate = computed(() => {
    const role = this.auth.user()?.role;
    return role === 'manager' || role === 'cashier';
  });
  protected readonly sees = computed(() => {
    switch (this.auth.user()?.role) {
      case 'cashier':
        return 'The registers you have worked on.';
      case 'manager':
        return 'Every register opened in your stores.';
      default:
        return 'Every register opened in the company.';
    }
  });

  protected readonly hasPin = signal<boolean | null>(null);
  protected readonly current = signal<RegisterSessionDetail | null>(null);
  protected readonly stores = signal<Store[]>([]);
  protected readonly sessions = signal<RegisterSession[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly isBusy = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly notice = signal('');

  protected readonly storeId = signal('');
  protected readonly registerNo = signal(0);
  protected readonly availability = signal<RegisterAvailability[]>([]);
  protected readonly openingCash = signal<number | null>(null);
  protected readonly openNote = signal('');
  protected readonly openPin = signal('');

  protected readonly pinOpen = signal(false);
  protected readonly currentPin = signal('');
  protected readonly newPin = signal('');
  protected readonly repeatPin = signal('');
  protected readonly pinError = signal('');

  protected readonly dialog = signal<RegisterDialogMode | null>(null);

  protected readonly from = signal(daysAgo(29));
  protected readonly to = signal(localDate(new Date()));
  protected readonly storeFilter = signal('');
  protected readonly pages = new Pagination(
    () => this.sessions(),
    () => [this.sessions()],
  );

  protected readonly chosenStore = computed(() => this.stores().find((store) => store.id === this.storeId()) ?? null);

  ngOnInit(): void {
    this.storeService.list().subscribe((stores) => {
      this.stores.set(stores);
      if (this.canOperate() && stores.length === 1) {
        this.chooseStore(stores[0].id);
      }
    });
    if (this.canOperate()) {
      this.cashRegisterService.pin().subscribe(({ hasPin }) => this.hasPin.set(hasPin));
      this.loadCurrent();
    }
    this.loadHistory();
  }

  loadCurrent(): void {
    this.cashRegisterService.current().subscribe((session) => this.current.set(session));
  }

  loadHistory(): void {
    this.isLoading.set(true);
    this.cashRegisterService.list({ from: this.from(), to: this.to(), storeId: this.storeFilter() }).subscribe({
      next: (sessions) => {
        this.sessions.set(sessions);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(errorText(error, 'Could not load registers. Is the backend running?'));
        this.isLoading.set(false);
      },
    });
  }

  chooseStore(storeId: string): void {
    this.storeId.set(storeId);
    this.registerNo.set(0);
    this.availability.set([]);
    if (!storeId) {
      return;
    }
    this.cashRegisterService.registers(storeId).subscribe((registers) => {
      this.availability.set(registers);
      const free = registers.filter((register) => !register.inUseBy);
      if (free.length === 1) {
        this.registerNo.set(free[0].no);
      }
    });
  }

  open(): void {
    const openingCash = Number(this.openingCash());
    if (!this.storeId() || !this.registerNo()) {
      this.errorMessage.set('Choose a store and a register.');
      return;
    }
    if (this.openingCash() === null || `${this.openingCash()}` === '' || !Number.isFinite(openingCash) || openingCash < 0) {
      this.errorMessage.set('Enter the cash in the register at opening (0 if empty).');
      return;
    }
    if (!/^\d{4}$/.test(this.openPin())) {
      this.errorMessage.set('Enter your 4-digit PIN.');
      return;
    }
    this.isBusy.set(true);
    this.errorMessage.set('');
    this.notice.set('');
    this.cashRegisterService
      .open({
        storeId: this.storeId(),
        registerNo: this.registerNo(),
        openingCash,
        note: this.openNote().trim() || undefined,
        pin: this.openPin(),
      })
      .subscribe({
        next: (session) => {
          this.isBusy.set(false);
          this.current.set(session);
          this.openPin.set('');
          this.openNote.set('');
          this.openingCash.set(null);
          this.loadHistory();
        },
        error: (error) => {
          this.isBusy.set(false);
          this.openPin.set('');
          this.errorMessage.set(errorText(error, 'Could not open the register.'));
          this.chooseStore(this.storeId());
        },
      });
  }

  savePin(): void {
    if (!/^\d{4}$/.test(this.newPin())) {
      this.pinError.set('The PIN must be exactly 4 digits');
      return;
    }
    if (this.newPin() !== this.repeatPin()) {
      this.pinError.set('The two PINs differ.');
      return;
    }
    this.cashRegisterService.setPin(this.newPin(), this.hasPin() ? this.currentPin() : undefined).subscribe({
      next: () => {
        this.hasPin.set(true);
        this.pinOpen.set(false);
        this.notice.set('Your PIN is saved.');
        this.resetPinForm();
      },
      error: (error) => this.pinError.set(errorText(error, 'Could not save the PIN.')),
    });
  }

  openPinDialog(): void {
    this.resetPinForm();
    this.pinOpen.set(true);
  }

  onDialogDone(session: RegisterSessionDetail): void {
    const mode = this.dialog();
    this.dialog.set(null);
    this.current.set(session.status === 'open' ? session : null);
    if (mode === 'close') {
      this.notice.set('The register is closed.');
      this.chooseStore(this.storeId() || session.storeId);
    }
    this.loadHistory();
  }

  clearFilters(): void {
    this.from.set(daysAgo(29));
    this.to.set(localDate(new Date()));
    this.storeFilter.set('');
    this.loadHistory();
  }

  private resetPinForm(): void {
    this.currentPin.set('');
    this.newPin.set('');
    this.repeatPin.set('');
    this.pinError.set('');
  }
}
