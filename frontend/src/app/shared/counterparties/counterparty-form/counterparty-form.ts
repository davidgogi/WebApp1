import { Component, OnInit, computed, effect, inject, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Plus, Trash2 } from 'lucide-angular';
import {
  COUNTERPARTY_HISTORY_ACTIONS,
  COUNTERPARTY_SOURCE_LABELS,
  Counterparty,
  CounterpartyContact,
  CounterpartyHistoryEntry,
  CounterpartyPayload,
  CounterpartyType,
  CounterpartyStatus,
  LEGAL_FORMS_BY_TYPE,
  LEGAL_FORM_LABELS,
  LegalForm,
  OrganizationType,
  counterpartyTypeOf,
} from '../counterparty.model';
import { CounterpartyService } from '../counterparty.service';
import { TranslatePipe } from '../../../core/i18n/t.pipe';

@Component({
  selector: 'app-counterparty-form',
  imports: [TranslatePipe, FormsModule, LucideAngularModule, DatePipe],
  templateUrl: './counterparty-form.html',
  styleUrl: './counterparty-form.css',
})
export class CounterpartyForm implements OnInit {
  private readonly counterpartyService = inject(CounterpartyService);

  readonly counterparty = input<Counterparty | null>(null);
  readonly initial = input<Partial<CounterpartyPayload> | null>(null);
  readonly hint = input('');
  readonly supplierOnly = input(false);
  readonly source = input<'form' | 'rs'>('form');
  readonly startTab = input<'main' | 'contacts'>('main');
  readonly saved = output<Counterparty>();
  readonly cancelled = output<void>();

  protected readonly AddIcon = Plus;
  protected readonly RemoveIcon = Trash2;

  protected readonly historyActions = COUNTERPARTY_HISTORY_ACTIONS;
  protected readonly sourceLabels = COUNTERPARTY_SOURCE_LABELS;

  protected readonly legalFormLabels = LEGAL_FORM_LABELS;
  protected readonly tab = signal<'main' | 'contacts' | 'history'>('main');
  protected readonly categories = signal<string[]>([]);
  protected readonly history = signal<CounterpartyHistoryEntry[]>([]);
  protected readonly historyState = signal<'' | 'loading' | 'loaded' | 'error'>('');
  protected readonly isSaving = signal(false);
  protected readonly formError = signal('');
  protected readonly name = signal('');
  protected readonly organizationType = signal<OrganizationType>('company');
  protected readonly identificationCode = signal('');
  protected readonly counterpartyType = signal<CounterpartyType | ''>('');
  protected readonly isClient = computed(() => this.counterpartyType() === 'client' || this.counterpartyType() === 'both');
  protected readonly legalForm = signal<LegalForm | ''>('');
  protected readonly legalForms = computed(() => LEGAL_FORMS_BY_TYPE[this.organizationType()]);
  protected readonly sameAsAddress = signal(true);
  protected readonly actualAddress = signal('');
  protected readonly deferredPayment = signal(false);
  protected readonly deferredPaymentDays = signal<number | null>(null);
  protected readonly deferredPaymentTouched = signal(false);
  protected readonly deferredPaymentInvalid = computed(() => {
    const days = this.deferredPaymentDays();
    return days === null || !Number.isInteger(days) || days < 1 || days > 365;
  });
  protected readonly vatPayer = signal(false);
  protected readonly contactPerson = signal('');
  protected readonly phone = signal('');
  protected readonly email = signal('');
  protected readonly address = signal('');
  protected readonly category = signal('');
  protected readonly note = signal('');
  protected readonly status = signal<CounterpartyStatus>('active');
  protected readonly contacts = signal<CounterpartyContact[]>([]);
  protected readonly contactError = signal('');
  protected readonly contactFirstName = signal('');
  protected readonly contactLastName = signal('');
  protected readonly contactPhone = signal('');
  protected readonly contactPosition = signal('');
  protected readonly contactEmail = signal('');

  constructor() {
    effect(() => {
      const form = this.legalForm();
      if (form && !this.legalForms().includes(form)) {
        this.legalForm.set('');
      }
    });
  }

  ngOnInit(): void {
    this.tab.set(this.startTab());
    const values = this.counterparty() ?? this.initial();
    this.name.set(values?.name ?? '');
    this.organizationType.set(values?.organizationType ?? 'company');
    this.identificationCode.set(values?.identificationCode ?? '');
    this.counterpartyType.set(
      values?.isSupplier !== undefined && values?.isClient !== undefined
        ? counterpartyTypeOf({ isSupplier: values.isSupplier, isClient: values.isClient })
        : this.supplierOnly()
          ? 'supplier'
          : '',
    );
    this.deferredPayment.set(!!values?.deferredPaymentDays);
    this.deferredPaymentDays.set(values?.deferredPaymentDays ?? null);
    this.legalForm.set(values?.legalForm ?? '');
    this.sameAsAddress.set(!values?.actualAddress);
    this.actualAddress.set(values?.actualAddress ?? '');
    this.vatPayer.set(values?.vatPayer ?? false);
    this.contactPerson.set(values?.contactPerson ?? '');
    this.phone.set(values?.phone ?? '');
    this.email.set(values?.email ?? '');
    this.address.set(values?.address ?? '');
    this.category.set(values?.category ?? '');
    this.note.set(values?.note ?? '');
    this.status.set(values?.status ?? 'active');
    this.contacts.set(this.counterparty()?.contacts ?? []);
    this.counterpartyService.categories().subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => this.categories.set([]),
    });
  }

  openHistory(): void {
    const id = this.counterparty()?.id;
    if (!id) {
      return;
    }
    this.tab.set('history');
    if (this.historyState() === 'loading' || this.historyState() === 'loaded') {
      return;
    }
    this.historyState.set('loading');
    this.counterpartyService.history(id).subscribe({
      next: (entries) => {
        this.history.set(entries);
        this.historyState.set('loaded');
      },
      error: () => this.historyState.set('error'),
    });
  }

  addContact(): void {
    const contact: CounterpartyContact = {
      firstName: this.contactFirstName().trim(),
      lastName: this.contactLastName().trim(),
      phone: this.contactPhone().trim(),
      position: this.contactPosition().trim(),
      email: this.contactEmail().trim(),
    };
    if (Object.values(contact).some((value) => !value)) {
      this.contactError.set('Fill in every field of the contact.');
      return;
    }
    if (!/^\+?[0-9 ()-]{7,20}$/.test(contact.phone)) {
      this.contactError.set('Enter a valid phone number.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
      this.contactError.set('Enter a valid email address.');
      return;
    }
    this.contacts.update((list) => [...list, contact]);
    this.contactError.set('');
    for (const field of [
      this.contactFirstName,
      this.contactLastName,
      this.contactPhone,
      this.contactPosition,
      this.contactEmail,
    ]) {
      field.set('');
    }
  }

  removeContact(index: number): void {
    this.contacts.update((list) => list.filter((_, i) => i !== index));
  }

  private hasUnaddedContact(): boolean {
    return [
      this.contactFirstName(),
      this.contactLastName(),
      this.contactPhone(),
      this.contactPosition(),
      this.contactEmail(),
    ].some((value) => value.trim());
  }

  private showError(message: string): void {
    this.tab.set('main');
    this.formError.set(message);
  }

  save(): void {
    const code = this.identificationCode().trim();
    if (!this.name().trim()) {
      this.showError('The counterparty name is required.');
      return;
    }
    const counterpartyType = this.counterpartyType();
    if (!counterpartyType) {
      this.showError('Choose a counterparty type.');
      return;
    }
    const missing: [string, string][] = [
      [code, 'The identification code is required.'],
      [this.category().trim(), 'The category is required.'],
      [this.contactPerson().trim(), 'The contact person is required.'],
      [this.phone().trim(), 'The phone is required.'],
      [this.email().trim(), 'The email is required.'],
      [this.address().trim(), 'The address is required.'],
    ];
    const empty = missing.find(([value]) => !value);
    if (empty) {
      this.showError(empty[1]);
      return;
    }
    const deferred = this.isClient() && this.deferredPayment();
    if (deferred && this.deferredPaymentInvalid()) {
      this.deferredPaymentTouched.set(true);
      this.showError('Enter the deferred payment term: 1–365 days.');
      return;
    }
    const length = this.organizationType() === 'company' ? 9 : 11;
    if (!new RegExp(`^\\d{${length}}$`).test(code)) {
      this.showError(
        this.organizationType() === 'company'
          ? "A company's identification code has 9 digits."
          : "An individual's identification code is the 11-digit personal ID.",
      );
      return;
    }
    if (this.hasUnaddedContact()) {
      this.tab.set('contacts');
      this.contactError.set('Add the contact you typed, or clear its fields, before saving.');
      return;
    }
    const payload = {
      name: this.name().trim(),
      organizationType: this.organizationType(),
      identificationCode: code,
      isSupplier: counterpartyType !== 'client',
      isClient: counterpartyType !== 'supplier',
      deferredPaymentDays: deferred ? this.deferredPaymentDays() : null,
      vatPayer: this.vatPayer(),
      contactPerson: this.contactPerson().trim(),
      phone: this.phone().trim(),
      email: this.email().trim(),
      address: this.address().trim(),
      actualAddress: this.sameAsAddress() ? null : this.actualAddress().trim() || null,
      legalForm: this.legalForm() || null,
      category: this.category().trim(),
      note: this.note().trim(),
      status: this.status(),
      contacts: this.contacts().map(({ firstName, lastName, phone, position, email }) => ({
        firstName,
        lastName,
        phone,
        position,
        email,
      })),
    };
    const id = this.counterparty()?.id;
    const request = id
      ? this.counterpartyService.update(id, payload)
      : this.counterpartyService.create({ ...payload, source: this.source() });
    this.isSaving.set(true);
    this.formError.set('');
    this.contactError.set('');
    request.subscribe({
      next: (counterparty) => {
        this.isSaving.set(false);
        this.saved.emit(counterparty);
      },
      error: (error: HttpErrorResponse) => {
        this.isSaving.set(false);
        const message = error.error?.message;
        this.formError.set(
          Array.isArray(message)
            ? message.join(', ')
            : typeof message === 'string'
              ? message
              : 'Could not save the counterparty.',
        );
      },
    });
  }
}
