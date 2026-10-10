import { Component, OnInit, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../../core/api';

export interface AuditEntry {
  id: string;
  createdAt: string;
  companyId: string | null;
  actorName: string;
  actorRole: string;
  action: string;
  summary: string;
}

// Who did what and when. The backend returns everything to the superuser and only the
// company's own entries to a system admin, so the same page serves both.
@Component({
  selector: 'app-audit-log-page',
  imports: [DatePipe],
  templateUrl: './audit-log-page.html',
})
export class AuditLogPage implements OnInit {
  private readonly http = inject(HttpClient);

  // Set from the route's `data`.
  readonly eyebrow = input('');

  protected readonly entries = signal<AuditEntry[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal('');

  ngOnInit(): void {
    this.isLoading.set(true);
    this.http.get<AuditEntry[]>(`${API_BASE_URL}/audit`).subscribe({
      next: (entries) => {
        this.entries.set(entries);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load the audit log.');
        this.isLoading.set(false);
      },
    });
  }
}
