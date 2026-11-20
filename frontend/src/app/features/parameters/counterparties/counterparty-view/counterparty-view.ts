import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { DatePipe, DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ChevronLeft, Download, History, LucideAngularModule, PenLine, Upload, X } from 'lucide-angular';
import {
  COUNTERPARTY_HISTORY_ACTIONS,
  COUNTERPARTY_SOURCE_LABELS,
  Counterparty,
  CounterpartyDocument,
  CounterpartyDocumentType,
  CounterpartyHistoryEntry,
  CounterpartyReceipt,
  COUNTERPARTY_RECEIPT_STATUS_LABELS,
  DOCUMENT_TYPE_LABELS,
  CounterpartyPayload,
  LEGAL_FORMS_BY_TYPE,
  LEGAL_FORM_LABELS,
  LegalForm,
  ORGANIZATION_TYPE_LABELS,
  OrganizationType,
  vatLabel,
} from '../../../../shared/counterparties/counterparty.model';
import { CounterpartyService } from '../../../../shared/counterparties/counterparty.service';
import { CounterpartyForm } from '../../../../shared/counterparties/counterparty-form/counterparty-form';
import { Modal } from '../../../../shared/modal/modal';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { canAccessModule } from '../../../../core/auth/access';
import { saveFile } from '../../../../shared/xlsx-import/xlsx-import.model';

const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;
const DOCUMENT_ACCEPT = '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx';

const todayIso = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

type Tab = 'main' | 'contacts' | 'documents' | 'sales' | 'receipts' | 'transactions';
type Section = 'main' | 'contact' | 'client' | 'supplier';

interface Draft {
  organizationType: OrganizationType;
  legalForm: LegalForm | '';
  identificationCode: string;
  vatPayer: boolean;
  category: string;
  note: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  sameAsAddress: boolean;
  actualAddress: string;
  deferredPayment: boolean;
  deferredPaymentDays: number | null;
  discountPercent: number | null;
  creditLimit: number | null;
  supplierPaymentDays: number | null;
  deliveryDays: number | null;
  bankAccount: string;
}

const isDays = (value: number | null) => value === null || (Number.isInteger(value) && value >= 1 && value <= 365);
const isMoney = (value: number | null, max: number) =>
  value === null || (value >= 0 && value <= max && Math.round(value * 100) === value * 100);

@Component({
  selector: 'app-counterparty-view',
  imports: [TranslatePipe, DatePipe, DecimalPipe, NgTemplateOutlet, FormsModule, RouterLink, LucideAngularModule, Modal, CounterpartyForm],
  templateUrl: './counterparty-view.html',
  styleUrl: './counterparty-view.css',
})
export class CounterpartyView implements OnInit {
  private readonly counterpartyService = inject(CounterpartyService);

  readonly id = input.required<string>();

  protected readonly BackIcon = ChevronLeft;
  protected readonly HistoryIcon = History;
  protected readonly EditIcon = PenLine;

  protected readonly organizationTypeLabels = ORGANIZATION_TYPE_LABELS;
  protected readonly legalFormLabels = LEGAL_FORM_LABELS;
  protected readonly historyActions = COUNTERPARTY_HISTORY_ACTIONS;
  protected readonly sourceLabels = COUNTERPARTY_SOURCE_LABELS;
  protected readonly vatLabel = vatLabel;

  protected readonly tabs: { key: Tab; label: string }[] = [
    { key: 'main', label: 'Main information' },
    { key: 'contacts', label: 'Contacts' },
    { key: 'documents', label: 'Documents' },
    { key: 'sales', label: 'Sales receipts' },
    { key: 'receipts', label: 'Receipts and sales' },
    { key: 'transactions', label: 'Transactions' },
  ];

  protected readonly counterparty = signal<Counterparty | null>(null);
  protected readonly history = signal<CounterpartyHistoryEntry[]>([]);
  protected readonly errorMessage = signal('');
  protected readonly tab = signal<Tab>('main');
  protected readonly isHistoryOpen = signal(false);
  protected readonly formTab = signal<'main' | 'contacts' | null>(null);

  protected readonly editing = signal<Section | null>(null);
  protected readonly draft = signal<Draft | null>(null);
  protected readonly sectionError = signal('');
  protected readonly isSaving = signal(false);
  protected readonly draftLegalForms = computed(() => {
    const draft = this.draft();
    return draft ? LEGAL_FORMS_BY_TYPE[draft.organizationType] : [];
  });

  protected readonly initial = computed(() => (this.counterparty()?.name.trim().charAt(0) ?? '').toUpperCase());
  protected readonly contactCount = computed(() => {
    const counterparty = this.counterparty();
    return counterparty ? (counterparty.contactPerson ? 1 : 0) + (counterparty.contacts?.length ?? 0) : 0;
  });
  protected readonly UploadIcon = Upload;
  protected readonly DownloadIcon = Download;
  protected readonly RemoveIcon = X;
  protected readonly documentTypeLabels = DOCUMENT_TYPE_LABELS;
  protected readonly documentTypes = Object.keys(DOCUMENT_TYPE_LABELS) as CounterpartyDocumentType[];
  protected readonly documentAccept = DOCUMENT_ACCEPT;
  protected readonly documents = signal<CounterpartyDocument[]>([]);
  protected readonly documentsError = signal('');
  protected readonly expiredCount = computed(() => this.documents().filter((document) => this.isExpired(document)).length);
  protected readonly isUploadOpen = signal(false);
  protected readonly uploadFile = signal<File | null>(null);
  protected readonly uploadType = signal<CounterpartyDocumentType>('contract');
  protected readonly uploadValidUntil = signal('');
  protected readonly uploadError = signal('');
  protected readonly isUploading = signal(false);
  private readonly i18n = inject(I18nService);
  private readonly auth = inject(AuthService);

  protected readonly receiptStatusLabels = COUNTERPARTY_RECEIPT_STATUS_LABELS;
  protected readonly receipts = signal<CounterpartyReceipt[]>([]);
  protected readonly receiptsError = signal('');
  protected readonly documentKind = signal<'all' | 'receipt' | 'sale'>('all');
  protected readonly canSeeReceipts = computed(() => canAccessModule(this.auth.user(), 'wms'));
  protected readonly canAddReceipt = computed(() => {
    const counterparty = this.counterparty();
    return (
      this.canSeeReceipts() &&
      this.auth.user()?.role === 'module_admin' &&
      !!counterparty?.isSupplier &&
      counterparty.status === 'active'
    );
  });
  protected readonly shownReceipts = computed(() => (this.documentKind() === 'sale' ? [] : this.receipts()));
  protected readonly receivedTotal = computed(() =>
    this.receipts()
      .filter((receipt) => receipt.status === 'posted')
      .reduce((sum, receipt) => sum + receipt.total, 0),
  );

  protected readonly created = computed(() =>
    [...this.history()].reverse().find((entry) => entry.action === 'counterparty.create' || entry.action === 'counterparty.import'),
  );

  ngOnInit(): void {
    this.load();
  }

  openForm(tab: 'main' | 'contacts' = 'main'): void {
    this.cancelEdit();
    this.formTab.set(tab);
  }

  onSaved(): void {
    this.formTab.set(null);
    this.load();
  }

  startEdit(section: Section): void {
    const c = this.counterparty();
    if (!c) {
      return;
    }
    this.draft.set({
      organizationType: c.organizationType,
      legalForm: c.legalForm ?? '',
      identificationCode: c.identificationCode ?? '',
      vatPayer: c.vatPayer,
      category: c.category ?? '',
      note: c.note ?? '',
      contactPerson: c.contactPerson ?? '',
      phone: c.phone ?? '',
      email: c.email ?? '',
      address: c.address ?? '',
      sameAsAddress: !c.actualAddress,
      actualAddress: c.actualAddress ?? '',
      deferredPayment: !!c.deferredPaymentDays,
      deferredPaymentDays: c.deferredPaymentDays,
      discountPercent: c.discountPercent,
      creditLimit: c.creditLimit,
      supplierPaymentDays: c.supplierPaymentDays,
      deliveryDays: c.deliveryDays,
      bankAccount: c.bankAccount ?? '',
    });
    this.sectionError.set('');
    this.editing.set(section);
  }

  cancelEdit(): void {
    this.editing.set(null);
    this.draft.set(null);
    this.sectionError.set('');
  }

  setDraft<K extends keyof Draft>(key: K, value: Draft[K]): void {
    this.draft.update((draft) => {
      if (!draft) {
        return draft;
      }
      const next = { ...draft, [key]: value };
      if (next.legalForm && !LEGAL_FORMS_BY_TYPE[next.organizationType].includes(next.legalForm)) {
        next.legalForm = '';
      }
      return next;
    });
  }

  saveSection(): void {
    const id = this.counterparty()?.id;
    const section = this.editing();
    const draft = this.draft();
    if (!id || !section || !draft) {
      return;
    }
    const problem = this.problem(section, draft);
    if (problem) {
      this.sectionError.set(problem);
      return;
    }
    this.isSaving.set(true);
    this.sectionError.set('');
    this.counterpartyService.update(id, this.payload(section, draft)).subscribe({
      next: (counterparty) => {
        this.isSaving.set(false);
        this.counterparty.set(counterparty);
        this.cancelEdit();
        this.loadHistory();
      },
      error: (error: HttpErrorResponse) => {
        this.isSaving.set(false);
        const message = error.error?.message;
        this.sectionError.set(
          Array.isArray(message)
            ? message.join(', ')
            : typeof message === 'string'
              ? message
              : 'Could not save the counterparty.',
        );
      },
    });
  }

  private problem(section: Section, d: Draft): string {
    switch (section) {
      case 'main': {
        const code = d.identificationCode.trim();
        if (!code) {
          return 'The identification code is required.';
        }
        const length = d.organizationType === 'company' ? 9 : 11;
        if (!new RegExp(`^\\d{${length}}$`).test(code)) {
          return d.organizationType === 'company'
            ? "A company's identification code has 9 digits."
            : "An individual's identification code is the 11-digit personal ID.";
        }
        return '';
      }
      case 'contact':
        return '';
      case 'client':
        if (d.deferredPayment && (d.deferredPaymentDays === null || !isDays(d.deferredPaymentDays))) {
          return 'Enter the deferred payment term: 1–365 days.';
        }
        if (!isMoney(d.discountPercent, 100)) {
          return 'The discount is 0–100% with at most 2 decimals';
        }
        return isMoney(d.creditLimit, 9999999999.99) ? '' : 'The credit limit is 0 or more with at most 2 decimals';
      case 'supplier':
        if (!isDays(d.supplierPaymentDays)) {
          return "The supplier's payment term is 1–365 days";
        }
        return isDays(d.deliveryDays) ? '' : 'The delivery term is 1–365 working days';
    }
  }

  private payload(section: Section, d: Draft): Partial<CounterpartyPayload> {
    switch (section) {
      case 'main':
        return {
          organizationType: d.organizationType,
          legalForm: d.legalForm || null,
          identificationCode: d.identificationCode.trim(),
          vatPayer: d.vatPayer,
          category: d.category.trim(),
          note: d.note.trim(),
        };
      case 'contact':
        return {
          contactPerson: d.contactPerson.trim(),
          phone: d.phone.trim(),
          email: d.email.trim(),
          address: d.address.trim(),
          actualAddress: d.sameAsAddress ? null : d.actualAddress.trim() || null,
        };
      case 'client':
        return {
          deferredPaymentDays: d.deferredPayment ? d.deferredPaymentDays : null,
          discountPercent: d.discountPercent,
          creditLimit: d.creditLimit,
        };
      case 'supplier':
        return {
          supplierPaymentDays: d.supplierPaymentDays,
          deliveryDays: d.deliveryDays,
          bankAccount: d.bankAccount.trim() || null,
        };
    }
  }

  isExpired(document: CounterpartyDocument): boolean {
    return !!document.validUntil && document.validUntil < todayIso();
  }

  fileSize(bytes: number): string {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    }
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  openUpload(): void {
    this.uploadFile.set(null);
    this.uploadType.set('contract');
    this.uploadValidUntil.set('');
    this.uploadError.set('');
    this.isUploadOpen.set(true);
  }

  onFileChosen(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.uploadError.set('');
    if (file && file.size > MAX_DOCUMENT_SIZE) {
      this.uploadError.set('The file is larger than 10 MB.');
      this.uploadFile.set(null);
      return;
    }
    this.uploadFile.set(file);
  }

  upload(): void {
    const file = this.uploadFile();
    if (!file) {
      this.uploadError.set('Choose a file to upload');
      return;
    }
    this.isUploading.set(true);
    this.uploadError.set('');
    this.counterpartyService.uploadDocument(this.id(), file, this.uploadType(), this.uploadValidUntil()).subscribe({
      next: () => {
        this.isUploading.set(false);
        this.isUploadOpen.set(false);
        this.loadDocuments();
        this.loadHistory();
      },
      error: (error: HttpErrorResponse) => {
        this.isUploading.set(false);
        const message = error.error?.message;
        this.uploadError.set(
          Array.isArray(message) ? message.join(', ') : typeof message === 'string' ? message : 'Could not upload the file.',
        );
      },
    });
  }

  download(document: CounterpartyDocument): void {
    this.counterpartyService.downloadDocument(this.id(), document.id).subscribe({
      next: (blob) => saveFile(blob, document.name),
      error: () => this.documentsError.set('Could not download the file.'),
    });
  }

  removeDocument(document: CounterpartyDocument): void {
    if (!this.i18n.confirm('Delete {name}?', { name: document.name })) {
      return;
    }
    this.counterpartyService.removeDocument(this.id(), document.id).subscribe({
      next: () => {
        this.loadDocuments();
        this.loadHistory();
      },
      error: () => this.documentsError.set('Could not delete the file.'),
    });
  }

  private loadDocuments(): void {
    this.counterpartyService.documents(this.id()).subscribe({
      next: (documents) => {
        this.documents.set(documents);
        this.documentsError.set('');
      },
      error: () => this.documentsError.set('Could not load the documents.'),
    });
  }

  private loadReceipts(): void {
    if (!this.canSeeReceipts()) {
      return;
    }
    this.counterpartyService.receipts(this.id()).subscribe({
      next: (receipts) => {
        this.receipts.set(receipts);
        this.receiptsError.set('');
      },
      error: () => this.receiptsError.set('Could not load the receipts.'),
    });
  }

  private load(): void {
    this.loadDocuments();
    this.loadReceipts();
    this.counterpartyService.get(this.id()).subscribe({
      next: (counterparty) => this.counterparty.set(counterparty),
      error: () => this.errorMessage.set('Could not load the counterparty.'),
    });
    this.loadHistory();
  }

  private loadHistory(): void {
    this.counterpartyService.history(this.id()).subscribe({
      next: (entries) => this.history.set(entries),
      error: () => this.history.set([]),
    });
  }
}
