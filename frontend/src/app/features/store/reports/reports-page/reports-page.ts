import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Download, LucideAngularModule } from 'lucide-angular';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { saveFile } from '../../../../shared/xlsx-import/xlsx-import.model';
import { RegisterSession, daysAgo, errorText, localDate } from '../../cash-register/cash-register.model';
import { Store } from '../../stores/store.model';
import { StoreService } from '../../stores/store.service';
import { DailyReport, DayRow } from '../report.model';
import { ReportService } from '../report.service';

@Component({
  selector: 'app-reports-page',
  imports: [TranslatePipe, DatePipe, DecimalPipe, FormsModule, RouterLink, LucideAngularModule],
  templateUrl: './reports-page.html',
})
export class ReportsPage implements OnInit {
  private readonly reportService = inject(ReportService);
  private readonly storeService = inject(StoreService);

  protected readonly DownloadIcon = Download;
  protected readonly report = signal<DailyReport | null>(null);
  protected readonly stores = signal<Store[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly from = signal(daysAgo(6));
  protected readonly to = signal(localDate(new Date()));
  protected readonly storeFilter = signal('');

  protected readonly dayTotals = computed(() => sumRows(this.report()?.days ?? []));

  ngOnInit(): void {
    this.storeService.list().subscribe((stores) => this.stores.set(stores));
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.reportService.daily(this.period()).subscribe({
      next: (report) => {
        this.report.set(report);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(errorText(error, 'Could not load the report.'));
        this.isLoading.set(false);
      },
    });
  }

  exportDaily(): void {
    this.reportService.dailyExport(this.period()).subscribe({
      next: (blob) => saveFile(blob, `daily-sales-${this.from()}-${this.to()}.xlsx`),
      error: () => this.errorMessage.set('Could not export the file.'),
    });
  }

  exportMovement(shift: RegisterSession): void {
    this.reportService.cashMovementExport(shift.id).subscribe({
      next: (blob) => saveFile(blob, `cash-movement-${shift.storeName}-${shift.registerNo}-${shift.openedAt.slice(0, 10)}.xlsx`),
      error: () => this.errorMessage.set('Could not export the file.'),
    });
  }

  private period() {
    return { from: this.from(), to: this.to(), storeId: this.storeFilter() };
  }
}

function sumRows(rows: DayRow[]) {
  const total = (key: keyof DayRow) => rows.reduce((sum, row) => sum + (row[key] as number), 0);
  return {
    salesCount: total('salesCount'),
    cashSales: total('cashSales'),
    cardSales: total('cardSales'),
    returnsCount: total('returnsCount'),
    cashReturns: total('cashReturns'),
    cardReturns: total('cardReturns'),
    netSales: total('netSales'),
    cashIn: total('cashIn'),
    cashOut: total('cashOut'),
  };
}
