import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ArrowLeft, Download, LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../../../core/auth/auth.service';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { saveFile } from '../../../../shared/xlsx-import/xlsx-import.model';
import { ReportService } from '../../reports/report.service';
import { ACTIVITY_LABELS, COVERAGE_LABELS, PAYMENT_LABELS, RegisterSessionDetail, errorText } from '../cash-register.model';
import { CashRegisterService } from '../cash-register.service';
import { RegisterDialog, RegisterDialogMode } from '../register-dialog/register-dialog';

@Component({
  selector: 'app-shift-view',
  imports: [TranslatePipe, DatePipe, DecimalPipe, RouterLink, LucideAngularModule, RegisterDialog],
  templateUrl: './shift-view.html',
})
export class ShiftView implements OnInit {
  private readonly cashRegisterService = inject(CashRegisterService);
  private readonly reportService = inject(ReportService);
  private readonly auth = inject(AuthService);

  readonly id = input.required<string>();

  protected readonly BackIcon = ArrowLeft;
  protected readonly DownloadIcon = Download;
  protected readonly activityLabels = ACTIVITY_LABELS;
  protected readonly paymentLabels = PAYMENT_LABELS;
  protected readonly coverageLabels = COVERAGE_LABELS;

  protected readonly session = signal<RegisterSessionDetail | null>(null);
  protected readonly errorMessage = signal('');
  protected readonly notice = signal('');
  protected readonly dialog = signal<RegisterDialogMode | null>(null);
  protected readonly canExport = computed(() => this.auth.user()?.role !== 'cashier');

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.cashRegisterService.detail(this.id()).subscribe({
      next: (session) => this.session.set(session),
      error: (error) => this.errorMessage.set(errorText(error, 'Could not load this register.')),
    });
  }

  onDialogDone(session: RegisterSessionDetail): void {
    const mode = this.dialog();
    this.dialog.set(null);
    this.session.set(session);
    this.notice.set(mode === 'close' ? 'The register is closed.' : mode === 'cover' ? 'The coverage is recorded.' : 'Saved.');
  }

  exportMovement(): void {
    const session = this.session();
    if (!session) {
      return;
    }
    this.reportService.cashMovementExport(session.id).subscribe({
      next: (blob) => saveFile(blob, `cash-movement-${session.storeName}-${session.registerNo}-${session.openedAt.slice(0, 10)}.xlsx`),
      error: () => this.errorMessage.set('Could not export the file.'),
    });
  }
}
