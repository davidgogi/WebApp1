import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Partner, PartnerPayload, PartnerStatus, PartnerType } from '../partner.model';
import { PartnerService } from '../partner.service';
import { TranslatePipe } from '../../../core/i18n/t.pipe';

@Component({
  selector: 'app-partner-form',
  imports: [TranslatePipe, FormsModule],
  templateUrl: './partner-form.html',
})
export class PartnerForm implements OnInit {
  private readonly partnerService = inject(PartnerService);

  readonly partner = input<Partner | null>(null);
  readonly initial = input<Partial<PartnerPayload> | null>(null);
  readonly hint = input('');
  readonly supplierOnly = input(false);
  readonly saved = output<Partner>();
  readonly cancelled = output<void>();

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
  }

  save(): void {
    const code = this.identificationCode().trim();
    if (!this.name().trim()) {
      this.formError.set('The partner name is required.');
      return;
    }
    if (!this.isSupplier() && !this.isClient()) {
      this.formError.set('Choose at least one: Supplier or Client');
      return;
    }
    const length = this.type() === 'company' ? 9 : 11;
    if (code && !new RegExp(`^\\d{${length}}$`).test(code)) {
      this.formError.set(
        this.type() === 'company'
          ? "A company's identification code has 9 digits."
          : "An individual's identification code is the 11-digit personal ID.",
      );
      return;
    }
    const payload = {
      name: this.name().trim(),
      type: this.type(),
      identificationCode: code || null,
      isSupplier: this.isSupplier(),
      isClient: this.isClient(),
      vatPayer: this.vatPayer(),
      contactPerson: this.contactPerson().trim() || null,
      phone: this.phone().trim() || null,
      email: this.email().trim() || null,
      address: this.address().trim() || null,
      status: this.status(),
    };
    const id = this.partner()?.id;
    const request = id
      ? this.partnerService.update(id, payload)
      : this.partnerService.create(payload);
    this.isSaving.set(true);
    this.formError.set('');
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
              : 'Could not save the partner.',
        );
      },
    });
  }
}
