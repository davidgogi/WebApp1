import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Plus, Trash2 } from 'lucide-angular';
import { Partner, PartnerContact, PartnerPayload, PartnerStatus, PartnerType } from '../partner.model';
import { PartnerService } from '../partner.service';
import { TranslatePipe } from '../../../core/i18n/t.pipe';

@Component({
  selector: 'app-partner-form',
  imports: [TranslatePipe, FormsModule, LucideAngularModule],
  templateUrl: './partner-form.html',
  styleUrl: './partner-form.css',
})
export class PartnerForm implements OnInit {
  private readonly partnerService = inject(PartnerService);

  readonly partner = input<Partner | null>(null);
  readonly initial = input<Partial<PartnerPayload> | null>(null);
  readonly hint = input('');
  readonly supplierOnly = input(false);
  readonly saved = output<Partner>();
  readonly cancelled = output<void>();

  protected readonly AddIcon = Plus;
  protected readonly RemoveIcon = Trash2;

  protected readonly tab = signal<'main' | 'contacts'>('main');
  protected readonly isSaving = signal(false);
  protected readonly formError = signal('');
  protected readonly name = signal('');
  protected readonly type = signal<PartnerType>('company');
  protected readonly identificationCode = signal('');
  protected readonly isSupplier = signal(false);
  protected readonly isClient = signal(false);
  protected readonly vatPayer = signal(false);
  protected readonly contactPerson = signal('');
  protected readonly phone = signal('');
  protected readonly email = signal('');
  protected readonly address = signal('');
  protected readonly status = signal<PartnerStatus>('active');
  protected readonly contacts = signal<PartnerContact[]>([]);
  protected readonly contactError = signal('');
  protected readonly contactFirstName = signal('');
  protected readonly contactLastName = signal('');
  protected readonly contactPhone = signal('');
  protected readonly contactPosition = signal('');
  protected readonly contactEmail = signal('');

  ngOnInit(): void {
    const values = this.partner() ?? this.initial();
    this.name.set(values?.name ?? '');
    this.type.set(values?.type ?? 'company');
    this.identificationCode.set(values?.identificationCode ?? '');
    this.isSupplier.set(values?.isSupplier ?? this.supplierOnly());
    this.isClient.set(values?.isClient ?? false);
    this.vatPayer.set(values?.vatPayer ?? false);
    this.contactPerson.set(values?.contactPerson ?? '');
    this.phone.set(values?.phone ?? '');
    this.email.set(values?.email ?? '');
    this.address.set(values?.address ?? '');
    this.status.set(values?.status ?? 'active');
    this.contacts.set(this.partner()?.contacts ?? []);
  }

  addContact(): void {
    const contact: PartnerContact = {
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
    if (!this.isSupplier() && !this.isClient()) {
      this.showError('Choose at least one: Supplier or Client');
      return;
    }
    const missing: [string, string][] = [
      [code, 'The identification code is required.'],
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
    const length = this.type() === 'company' ? 9 : 11;
    if (!new RegExp(`^\\d{${length}}$`).test(code)) {
      this.showError(
        this.type() === 'company'
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
      type: this.type(),
      identificationCode: code,
      isSupplier: this.isSupplier(),
      isClient: this.isClient(),
      vatPayer: this.vatPayer(),
      contactPerson: this.contactPerson().trim(),
      phone: this.phone().trim(),
      email: this.email().trim(),
      address: this.address().trim(),
      status: this.status(),
      contacts: this.contacts().map(({ firstName, lastName, phone, position, email }) => ({
        firstName,
        lastName,
        phone,
        position,
        email,
      })),
    };
    const id = this.partner()?.id;
    const request = id
      ? this.partnerService.update(id, payload)
      : this.partnerService.create(payload);
    this.isSaving.set(true);
    this.formError.set('');
    this.contactError.set('');
    request.subscribe({
      next: (partner) => {
        this.isSaving.set(false);
        this.saved.emit(partner);
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
