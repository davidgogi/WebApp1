import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { Modal } from '../../../../shared/modal/modal';
import { RegisterSession, RegisterSessionDetail, errorText } from '../cash-register.model';
import { CashRegisterService } from '../cash-register.service';

export type RegisterDialogMode = 'close' | 'in' | 'out' | 'comment' | 'cover';

const TITLES: Record<RegisterDialogMode, string> = {
  close: 'Close the register',
  in: 'Add cash',
  out: 'Take out cash',
  comment: 'Comment',
  cover: 'Cover the shortage',
};

@Component({
  selector: 'app-register-dialog',
  imports: [TranslatePipe, DecimalPipe, FormsModule, Modal],
  templateUrl: './register-dialog.html',
})
export class RegisterDialog {
  private readonly cashRegisterService = inject(CashRegisterService);

  readonly session = input<RegisterSession | null>(null);
  readonly mode = input<RegisterDialogMode | null>(null);
  readonly done = output<RegisterSessionDetail>();
  readonly closed = output<void>();

  protected readonly amount = signal<number | null>(null);
  protected readonly note = signal('');
  protected readonly pin = signal('');
  protected readonly isBusy = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly title = computed(() => TITLES[this.mode() ?? 'close']);
  protected readonly difference = computed(() => {
    const session = this.session();
    const amount = this.amount();
    return session && amount !== null && `${amount}` !== '' ? Math.round((Number(amount) - session.expectedCash) * 100) / 100 : null;
  });
  protected readonly othersRegister = computed(() => !!this.session() && !this.session()!.mine);

  constructor() {
    effect(() => {
      const mode = this.mode();
      const session = this.session();
      this.pin.set('');
      this.errorMessage.set('');
      this.amount.set(mode === 'cover' && session ? session.shortageLeft : null);
      this.note.set(mode === 'comment' && session ? ((session.status === 'closed' ? session.closeNote : session.openNote) ?? '') : '');
    });
  }

  protected submit(): void {
    const session = this.session();
    const mode = this.mode();
    if (!session || !mode) {
      return;
    }
    const amount = Number(this.amount());
    const note = this.note().trim();
    if (mode !== 'comment' && (this.amount() === null || `${this.amount()}` === '' || !Number.isFinite(amount) || amount < 0)) {
      this.errorMessage.set('Enter an amount.');
      return;
    }
    if ((mode === 'in' || mode === 'out') && !note) {
      this.errorMessage.set('Write what the cash is for.');
      return;
    }
    if (mode === 'close' && !/^\d{4}$/.test(this.pin())) {
      this.errorMessage.set('Enter your 4-digit PIN.');
      return;
    }
    if (mode === 'close' && this.difference() !== 0 && !note) {
      this.errorMessage.set('The counted cash differs from the expected cash, so write a note.');
      return;
    }
    const request =
      mode === 'close'
        ? this.cashRegisterService.close(session.id, { countedCash: amount, note: note || undefined, pin: this.pin() })
        : mode === 'comment'
          ? this.cashRegisterService.comment(session.id, note)
          : mode === 'cover'
            ? this.cashRegisterService.cover(session.id, { amount, note: note || undefined })
            : this.cashRegisterService.moveCash(session.id, { kind: mode, amount, note });
    this.isBusy.set(true);
    this.errorMessage.set('');
    request.subscribe({
      next: (detail) => {
        this.isBusy.set(false);
        this.done.emit(detail);
      },
      error: (error) => {
        this.isBusy.set(false);
        this.errorMessage.set(errorText(error, 'That did not work.'));
      },
    });
  }
}
