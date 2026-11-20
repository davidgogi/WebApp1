import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isEmail } from 'class-validator';
import ExcelJS from 'exceljs';
import { Repository } from 'typeorm';
import { AuthUser } from '../../auth/auth-user.js';
import { Language } from '../../common/i18n/translate.js';
import { nameKey } from '../../common/name-key.js';
import {
  ImportReport,
  SheetColumn,
  addInstructionsSheet,
  addTableSheet,
  addTemplateSheet,
  choiceKey,
  choiceKeys,
  readImportFile,
  rowIssues,
  workbookBuffer,
} from '../../common/xlsx.js';
import { Counterparty } from './counterparty.entity.js';
import { CounterpartyStatus } from './counterparty-status.enum.js';
import { OrganizationType } from './organization-type.enum.js';
import { LEGAL_FORMS_BY_TYPE, LegalForm } from './legal-form.enum.js';
import { isValidIban, normalizeIban } from '../../common/iban.js';
import { NewCounterparty, CounterpartiesService } from './counterparties.service.js';

type Field =
  | 'name'
  | 'organizationType'
  | 'counterpartyType'
  | 'deferredPaymentDays'
  | 'category'
  | 'identificationCode'
  | 'vatPayer'
  | 'contactPerson'
  | 'phone'
  | 'email'
  | 'address'
  | 'note'
  | 'status'
  | 'legalForm'
  | 'actualAddress'
  | 'discountPercent'
  | 'creditLimit'
  | 'supplierPaymentDays'
  | 'deliveryDays'
  | 'bankAccount';

type CounterpartyType = 'supplier' | 'client' | 'both';

const SHEET_NAME = 'Counterparties';

const ORGANIZATION_TYPE_LABELS: Record<OrganizationType, string> = {
  [OrganizationType.COMPANY]: 'Company',
  [OrganizationType.INDIVIDUAL]: 'Individual',
};

const COUNTERPARTY_TYPE_LABELS: Record<CounterpartyType, string> = {
  supplier: 'Supplier',
  client: 'Client',
  both: 'Both',
};

const LEGAL_FORM_LABELS: Record<LegalForm, string> = {
  [LegalForm.LLC]: 'LLC',
  [LegalForm.JSC]: 'JSC',
  [LegalForm.COOPERATIVE]: 'Cooperative',
  [LegalForm.OTHER]: 'Other',
  [LegalForm.INDIVIDUAL_ENTREPRENEUR]: 'Individual entrepreneur',
  [LegalForm.NATURAL_PERSON]: 'Natural person',
};

const STATUS_LABELS: Record<CounterpartyStatus, string> = {
  [CounterpartyStatus.ACTIVE]: 'Active',
  [CounterpartyStatus.INACTIVE]: 'Inactive',
};

const COLUMNS: SheetColumn<Field>[] = [
  {
    field: 'name',
    header: 'Name',
    aliases: [
      'counterparty',
      'counterparty name',
      'partner',
      'partner name',
      'სახელი',
      'კონტრაგენტი',
      'პარტნიორი',
      'контрагент',
    ],
    width: 30,
    required: true,
  },
  {
    field: 'organizationType',
    header: 'Organization type',
    aliases: ['type', 'ტიპი', 'тип'],
    width: 13,
    required: true,
    choices: Object.values(ORGANIZATION_TYPE_LABELS),
    translated: true,
  },
  {
    field: 'counterpartyType',
    header: 'Counterparty type',
    aliases: ['role', 'როლი', 'роль'],
    width: 18,
    required: true,
    choices: Object.values(COUNTERPARTY_TYPE_LABELS),
    translated: true,
  },
  {
    field: 'deferredPaymentDays',
    header: 'Deferred payment, days',
    aliases: [
      'deferred payment',
      'consignment',
      'კონსიგნაცია',
      'კონსიგნაცია, დღე',
      'отсрочка платежа',
    ],
    width: 14,
  },
  {
    field: 'category',
    header: 'Category',
    aliases: ['კატეგორია', 'категория'],
    width: 18,
    required: true,
  },
  {
    field: 'identificationCode',
    header: 'Identification code',
    aliases: ['id code', 'code', 'საიდენტიფიკაციო კოდი', 'პირადი ნომერი'],
    width: 20,
    text: true,
    required: true,
  },
  {
    field: 'vatPayer',
    header: 'VAT payer',
    aliases: ['vat', 'დღგ'],
    width: 11,
    choices: ['Yes', 'No'],
    required: true,
    translated: true,
  },
  {
    field: 'contactPerson',
    header: 'Contact person',
    aliases: ['contact', 'საკონტაქტო პირი'],
    width: 22,
    required: true,
  },
  {
    field: 'phone',
    header: 'Phone',
    aliases: ['ტელეფონი'],
    width: 18,
    text: true,
    required: true,
  },
  {
    field: 'email',
    header: 'Email',
    aliases: ['ელფოსტა'],
    width: 26,
    required: true,
  },
  {
    field: 'address',
    header: 'Address',
    aliases: ['მისამართი'],
    width: 34,
    required: true,
  },
  {
    field: 'note',
    header: 'Note',
    aliases: ['შენიშვნა', 'примечание'],
    width: 34,
  },
  {
    field: 'status',
    header: 'Status',
    aliases: ['სტატუსი'],
    width: 12,
    choices: Object.values(STATUS_LABELS),
    required: true,
    translated: true,
  },
  {
    field: 'legalForm',
    header: 'Legal form',
    aliases: ['სამართლებრივი ფორმა', 'организационно-правовая форма'],
    width: 18,
    choices: Object.values(LEGAL_FORM_LABELS),
    translated: true,
  },
  {
    field: 'actualAddress',
    header: 'Actual address',
    width: 34,
  },
  {
    field: 'discountPercent',
    header: 'Discount, %',
    aliases: ['discount'],
    width: 12,
  },
  {
    field: 'creditLimit',
    header: 'Credit limit',
    width: 14,
  },
  {
    field: 'supplierPaymentDays',
    header: 'Supplier payment term, days',
    aliases: ['supplier payment term'],
    width: 16,
  },
  {
    field: 'deliveryDays',
    header: 'Delivery term, working days',
    aliases: ['delivery term'],
    width: 16,
  },
  {
    field: 'bankAccount',
    header: 'Bank account (IBAN)',
    aliases: ['bank account', 'iban'],
    width: 28,
    text: true,
  },
];

const EXPORT_ONLY = ['Products', 'Receipts', 'Internal code'];

const EXAMPLE_ROWS = [
  [
    'Mars Georgia',
    'Company',
    'Supplier',
    '',
    'Groceries',
    '405123456',
    'Yes',
    'Nino Beridze',
    '+995 555 12 34 56',
    'orders@mars.ge',
    '12 Tsereteli Ave, Tbilisi',
    'Delivers on Mondays',
    'Active',
    'LLC',
    '',
    '',
    '',
    '30',
    '3',
    'GE29NB0000000101904917',
  ],
  [
    'Tbilisi Dishware',
    'Company',
    'Both',
    '30',
    'Dishware',
    '205987654',
    'No',
    'Giorgi Maisuradze',
    '599 44 22 11',
    'sales@dishware.ge',
    '5 Agmashenebeli Ave, Tbilisi',
    '',
    'Active',
    'JSC',
    '14 Kazbegi Ave, Tbilisi',
    '5',
    '5000',
    '',
    '2',
    '',
  ],
  [
    'Levan Kapanadze',
    'Individual',
    'Client',
    '14',
    'Catering',
    '01024012345',
    'No',
    'Levan Kapanadze',
    '+995 577 10 20 30',
    'levan@example.com',
    '3 Rustaveli St, Batumi',
    '',
    'Inactive',
    'Individual entrepreneur',
    '',
    '',
    '1000',
    '',
    '',
    '',
  ],
];
const CODE = /^(\d{9}|\d{11})$/;
const PHONE = /^\+?[0-9 ()-]{7,20}$/;

const labelKeys = <T extends string>(labels: Record<T, string>) =>
  Object.fromEntries(
    (Object.entries(labels) as [T, string][]).flatMap(([value, label]) =>
      choiceKeys(label).map((key) => [key, value]),
    ),
  ) as Record<string, T>;

const ORGANIZATION_TYPES: Record<string, OrganizationType> = {
  ...labelKeys(ORGANIZATION_TYPE_LABELS),
  company: OrganizationType.COMPANY,
  individual: OrganizationType.INDIVIDUAL,
};
const COUNTERPARTY_TYPES: Record<string, CounterpartyType> = labelKeys(
  COUNTERPARTY_TYPE_LABELS,
);
const STATUSES: Record<string, CounterpartyStatus> = {
  ...labelKeys(STATUS_LABELS),
  active: CounterpartyStatus.ACTIVE,
  inactive: CounterpartyStatus.INACTIVE,
  'not active': CounterpartyStatus.INACTIVE,
};
const LEGAL_FORMS: Record<string, LegalForm> = {
  ...labelKeys(LEGAL_FORM_LABELS),
  ...Object.fromEntries(Object.values(LegalForm).map((form) => [form, form])),
};
const VAT: Record<string, boolean> = {
  ...Object.fromEntries(choiceKeys('Yes').map((key) => [key, true])),
  ...Object.fromEntries(choiceKeys('No').map((key) => [key, false])),
};

export interface CounterpartyPreviewRow {
  row: number;
  name: string;
  organizationType: OrganizationType;
  counterpartyType: CounterpartyType;
  deferredPaymentDays: number | null;
  category: string;
  identificationCode: string | null;
  vatPayer: boolean;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  status: CounterpartyStatus;
}

export type CounterpartyImportReport = ImportReport<CounterpartyPreviewRow>;

const counterpartyTypeOf = (
  counterparty: Pick<Counterparty, 'isSupplier' | 'isClient'>,
): CounterpartyType =>
  counterparty.isSupplier && counterparty.isClient
    ? 'both'
    : counterparty.isSupplier
      ? 'supplier'
      : 'client';

@Injectable()
export class CounterpartyExcelService {
  constructor(
    @InjectRepository(Counterparty)
    private readonly counterpartiesRepository: Repository<Counterparty>,
    private readonly counterpartiesService: CounterpartiesService,
  ) {}

  async export(actor: AuthUser, language: Language): Promise<Buffer> {
    const counterparties = await this.counterpartiesService.findAll(actor);
    const workbook = new ExcelJS.Workbook();
    addTableSheet(
      workbook,
      SHEET_NAME,
      [
        { header: 'Internal code', width: 12 },
        { header: 'Name', width: 30 },
        { header: 'Organization type', width: 13, translated: true },
        { header: 'Counterparty type', width: 18, translated: true },
        { header: 'Deferred payment, days', width: 14 },
        { header: 'Category', width: 18 },
        { header: 'Identification code', width: 20, text: true },
        { header: 'VAT payer', width: 11, translated: true },
        { header: 'Contact person', width: 22 },
        { header: 'Phone', width: 18, text: true },
        { header: 'Email', width: 26 },
        { header: 'Address', width: 34 },
        { header: 'Note', width: 34 },
        { header: 'Status', width: 12, translated: true },
        { header: 'Legal form', width: 18, translated: true },
        { header: 'Actual address', width: 34 },
        { header: 'Discount, %', width: 12 },
        { header: 'Credit limit', width: 14 },
        { header: 'Supplier payment term, days', width: 16 },
        { header: 'Delivery term, working days', width: 16 },
        { header: 'Bank account (IBAN)', width: 28, text: true },
      ],
      counterparties.map((p) => [
        p.code ?? '',
        p.name,
        ORGANIZATION_TYPE_LABELS[p.organizationType],
        COUNTERPARTY_TYPE_LABELS[counterpartyTypeOf(p)],
        p.deferredPaymentDays ?? '',
        p.category ?? '',
        p.identificationCode ?? '',
        p.vatPayer ? 'Yes' : 'No',
        p.contactPerson ?? '',
        p.phone ?? '',
        p.email ?? '',
        p.address ?? '',
        p.note ?? '',
        STATUS_LABELS[p.status],
        p.legalForm ? LEGAL_FORM_LABELS[p.legalForm] : '',
        p.actualAddress ?? '',
        p.discountPercent ?? '',
        p.creditLimit ?? '',
        p.supplierPaymentDays ?? '',
        p.deliveryDays ?? '',
        p.bankAccount ?? '',
      ]),
    );
    return workbookBuffer(workbook, language);
  }

  template(language: Language): Promise<Buffer> {
    return workbookBuffer(this.templateWorkbook(), language);
  }

  example(language: Language): Promise<Buffer> {
    return workbookBuffer(this.templateWorkbook(EXAMPLE_ROWS), language);
  }

  private templateWorkbook(rows: string[][] = []): ExcelJS.Workbook {
    const workbook = new ExcelJS.Workbook();
    const sheet = addTemplateSheet(workbook, SHEET_NAME, COLUMNS, {
      markRequired: false,
    });
    sheet.addRows(rows);
    addInstructionsSheet(
      workbook,
      [
        [
          'Name',
          'Yes',
          'Must not repeat an existing counterparty or another row (capitals and extra spaces are ignored).',
          'Mars Georgia',
        ],
        ['Organization type', 'Yes', 'Company or Individual.', 'Company'],
        ['Counterparty type', 'Yes', 'Supplier, Client or Both.', 'Supplier'],
        [
          'Deferred payment, days',
          'No',
          'Clients only: how many calendar days after the sale the client may pay (1–365). Empty: pays at once.',
          '14',
        ],
        [
          'Category',
          'Yes',
          'Free text: what the counterparty deals in.',
          'Groceries',
        ],
        [
          'Identification code',
          'Yes',
          '9 digits for a company, the 11-digit personal ID for an individual. Must not repeat an existing counterparty or another row.',
          '405123456',
        ],
        ['VAT payer', 'Yes', 'Yes or No.', 'Yes'],
        ['Contact person', 'Yes', 'Free text.', 'Nino Beridze'],
        [
          'Phone',
          'Yes',
          'Digits, with an optional + at the start.',
          '+995 555 12 34 56',
        ],
        ['Email', 'Yes', 'A valid email address.', 'orders@supplier.ge'],
        ['Address', 'Yes', 'Free text.', '12 Tsereteli Ave, Tbilisi'],
        ['Note', 'No', 'Free text.', 'Delivers on Mondays'],
        ['Status', 'Yes', 'Active or Inactive.', 'Active'],
        [
          'Legal form',
          'No',
          'Company: LLC, JSC, Cooperative or Other. Individual: Individual entrepreneur or Natural person.',
          'LLC',
        ],
        ['Actual address', 'No', 'Empty: the same as the address.', '14 Kazbegi Ave, Tbilisi'],
        ['Discount, %', 'No', 'Clients only: 0–100, at most 2 decimals.', '5'],
        ['Credit limit', 'No', 'Clients only: an amount in ₾, at most 2 decimals.', '5000'],
        ['Supplier payment term, days', 'No', 'Suppliers only: how many days after delivery you pay (1–365).', '30'],
        ['Delivery term, working days', 'No', 'Suppliers only: 1–365 working days.', '3'],
        ['Bank account (IBAN)', 'No', 'Suppliers only: the IBAN, spaces allowed.', 'GE29NB0000000101904917'],
      ],
      [
        `The sheet named "${SHEET_NAME}" is read (or the first sheet). Empty rows are skipped.`,
        'An exported counterparties file can be imported too: its extra columns (Products, Receipts) are ignored.',
        'Every column up to Status, except Note, must be filled in for every counterparty; the columns after Status are optional.',
        'At most 1000 counterparties per file. If any row has an error, nothing is imported.',
        'This only adds new counterparties: a counterparty that already exists is reported as an error, not updated.',
      ],
    );
    return workbook;
  }

  async check(
    actor: AuthUser,
    file: Express.Multer.File | undefined,
  ): Promise<CounterpartyImportReport> {
    return (await this.validate(actor, file)).report;
  }

  async import(
    actor: AuthUser,
    file: Express.Multer.File | undefined,
  ): Promise<CounterpartyImportReport> {
    const { report, counterparties } = await this.validate(actor, file);
    if (report.errors.length || counterparties.length === 0) {
      return report;
    }
    const saved = await this.counterpartiesService.createMany(actor, counterparties);
    return {
      ...report,
      imported: saved.map(({ identificationCode, name }) => ({
        code: identificationCode ?? '—',
        name,
      })),
    };
  }

  private async validate(
    actor: AuthUser,
    file: Express.Multer.File | undefined,
  ): Promise<{ report: CounterpartyImportReport; counterparties: NewCounterparty[] }> {
    const { report, rows } = await readImportFile<Field, CounterpartyPreviewRow>(
      file,
      SHEET_NAME,
      COLUMNS,
      EXPORT_ONLY,
    );
    if (report.errors.length) {
      return { report, counterparties: [] };
    }

    const existing = await this.counterpartiesRepository.find({
      select: { name: true, identificationCode: true },
      where: { companyId: actor.companyId! },
    });
    const byName = new Map(existing.map((p) => [nameKey(p.name), p]));
    const byCode = new Map(
      existing.flatMap((p) =>
        p.identificationCode ? [[p.identificationCode, p] as const] : [],
      ),
    );
    const firstRowByName = new Map<string, number>();
    const firstRowByCode = new Map<string, number>();

    const counterparties: NewCounterparty[] = [];
    for (const sheetRow of rows) {
      const { row, values } = sheetRow;
      const errorCount = report.errors.length;
      const { error, warning } = rowIssues(report, COLUMNS, sheetRow);
      const tooLong = (field: Field, max: number) => {
        if ((values[field] ?? '').length > max) {
          error(field, `Too long: at most ${max} characters`);
        }
      };

      const name = values.name ?? '';
      if (!name) {
        error('name', 'Name is required');
      } else {
        tooLong('name', 140);
        const key = nameKey(name);
        const taken = byName.get(key);
        const firstRow = firstRowByName.get(key);
        if (taken) {
          error('name', `A counterparty named "${taken.name}" already exists`);
        } else if (firstRow !== undefined) {
          error(
            'name',
            `Same name as row ${firstRow}; counterparty names must be unique`,
          );
        } else {
          firstRowByName.set(key, row);
        }
      }

      const organizationTypeText = values.organizationType ?? '';
      const organizationType = ORGANIZATION_TYPES[choiceKey(organizationTypeText)];
      if (!organizationTypeText) {
        error(
          'organizationType',
          'Organization type is required: Company or Individual',
        );
      } else if (!organizationType) {
        error('organizationType', 'Organization type must be Company or Individual');
      }

      const counterpartyTypeText = values.counterpartyType ?? '';
      const counterpartyType =
        COUNTERPARTY_TYPES[choiceKey(counterpartyTypeText)];
      if (!counterpartyTypeText) {
        error(
          'counterpartyType',
          'Counterparty type is required: Supplier, Client or Both',
        );
      } else if (!counterpartyType) {
        error(
          'counterpartyType',
          'Counterparty type must be Supplier, Client or Both',
        );
      }

      const deferredText = values.deferredPaymentDays ?? '';
      let deferredPaymentDays: number | null = null;
      if (deferredText) {
        const days = /^\d+$/.test(deferredText) ? Number(deferredText) : NaN;
        if (!(days >= 1 && days <= 365)) {
          error(
            'deferredPaymentDays',
            'The deferred payment term is 1–365 days',
          );
        } else if (counterpartyType === 'supplier') {
          warning(
            'deferredPaymentDays',
            'Deferred payment is only for clients; ignored',
          );
        } else {
          deferredPaymentDays = days;
        }
      }

      const legalFormText = values.legalForm ?? '';
      let legalForm: LegalForm | null = null;
      if (legalFormText) {
        const form = LEGAL_FORMS[choiceKey(legalFormText)];
        if (!form) {
          error(
            'legalForm',
            'Legal form must be LLC, JSC, Cooperative, Other, Individual entrepreneur or Natural person',
          );
        } else if (
          organizationType &&
          !LEGAL_FORMS_BY_TYPE[organizationType].includes(form)
        ) {
          error('legalForm', "This legal form doesn't fit the organization type");
        } else {
          legalForm = form;
        }
      }
      const actualAddress = values.actualAddress || null;
      tooLong('actualAddress', 240);

      const onlyFor = (field: Field, who: 'client' | 'supplier') => {
        const fits =
          counterpartyType === 'both' || counterpartyType === who || !counterpartyType;
        if (!fits) {
          warning(
            field,
            who === 'client'
              ? 'Only for clients; ignored'
              : 'Only for suppliers; ignored',
          );
        }
        return fits;
      };
      const wholeDays = (field: Field, message: string, who: 'client' | 'supplier') => {
        const text = values[field] ?? '';
        if (!text) {
          return null;
        }
        const days = /^\d+$/.test(text) ? Number(text) : NaN;
        if (!(days >= 1 && days <= 365)) {
          error(field, message);
          return null;
        }
        return onlyFor(field, who) ? days : null;
      };
      const amount = (field: Field, max: number, message: string) => {
        const text = (values[field] ?? '').replace(/\s/g, '').replace(',', '.');
        if (!text) {
          return null;
        }
        const value = /^\d+(\.\d{1,2})?$/.test(text) ? Number(text) : NaN;
        if (!(value >= 0 && value <= max)) {
          error(field, message);
          return null;
        }
        return onlyFor(field, 'client') ? value : null;
      };
      const discountPercent = amount(
        'discountPercent',
        100,
        'The discount is 0–100% with at most 2 decimals',
      );
      const creditLimit = amount(
        'creditLimit',
        9999999999.99,
        'The credit limit is 0 or more with at most 2 decimals',
      );
      const supplierPaymentDays = wholeDays(
        'supplierPaymentDays',
        "The supplier's payment term is 1–365 days",
        'supplier',
      );
      const deliveryDays = wholeDays(
        'deliveryDays',
        'The delivery term is 1–365 working days',
        'supplier',
      );
      let bankAccount: string | null = null;
      if (values.bankAccount) {
        const iban = normalizeIban(values.bankAccount);
        if (!isValidIban(iban)) {
          error(
            'bankAccount',
            'The bank account must be a valid IBAN, e.g. GE29NB0000000101904917',
          );
        } else if (onlyFor('bankAccount', 'supplier')) {
          bankAccount = iban;
        }
      }

      const identificationCode = values.identificationCode ?? '';
      if (!identificationCode) {
        error('identificationCode', 'Identification code is required');
      } else {
        const firstRow = firstRowByCode.get(identificationCode);
        const taken = byCode.get(identificationCode);
        if (!CODE.test(identificationCode)) {
          error(
            'identificationCode',
            'The identification code has 9 digits (company) or 11 digits (personal ID)',
          );
        } else if (
          organizationType === OrganizationType.COMPANY &&
          identificationCode.length !== 9
        ) {
          error(
            'identificationCode',
            "A company's identification code has 9 digits",
          );
        } else if (
          organizationType === OrganizationType.INDIVIDUAL &&
          identificationCode.length !== 11
        ) {
          error(
            'identificationCode',
            "An individual's identification code is the 11-digit personal ID",
          );
        } else if (taken) {
          error(
            'identificationCode',
            `This identification code already belongs to ${taken.name}`,
          );
        } else if (firstRow !== undefined) {
          error(
            'identificationCode',
            `Same identification code as row ${firstRow}`,
          );
        } else {
          firstRowByCode.set(identificationCode, row);
        }
      }

      const vatText = values.vatPayer ?? '';
      const vatPayer = VAT[choiceKey(vatText)];
      if (!vatText) {
        error('vatPayer', 'VAT payer is required: Yes or No');
      } else if (vatPayer === undefined) {
        error('vatPayer', 'VAT payer must be Yes or No');
      }

      const statusText = values.status ?? '';
      const status = STATUSES[choiceKey(statusText)];
      if (!statusText) {
        error('status', 'Status is required: Active or Inactive');
      } else if (!status) {
        error('status', 'Status must be Active or Inactive');
      }

      const phone = values.phone ?? '';
      if (!phone) {
        error('phone', 'Phone is required');
      } else if (!PHONE.test(phone)) {
        error('phone', 'Phone must be a valid phone number');
      }
      const email = values.email ?? '';
      if (!email) {
        error('email', 'Email is required');
      } else if (!isEmail(email)) {
        error('email', 'Email must be a valid email address');
      }
      const contactPerson = values.contactPerson ?? '';
      if (!contactPerson) {
        error('contactPerson', 'Contact person is required');
      }
      const address = values.address ?? '';
      if (!address) {
        error('address', 'Address is required');
      }
      const category = values.category ?? '';
      if (!category) {
        error('category', 'Category is required');
      }
      const note = values.note ?? '';
      tooLong('contactPerson', 120);
      tooLong('address', 240);
      tooLong('category', 80);
      tooLong('note', 1000);

      if (report.errors.length === errorCount) {
        counterparties.push({
          name,
          organizationType,
          isSupplier: counterpartyType !== 'client',
          isClient: counterpartyType !== 'supplier',
          deferredPaymentDays,
          identificationCode,
          vatPayer,
          contactPerson,
          phone,
          email,
          address,
          category,
          note: note || null,
          status,
          legalForm,
          actualAddress,
          discountPercent,
          creditLimit,
          supplierPaymentDays,
          deliveryDays,
          bankAccount,
        });
        report.rows.push({
          row,
          name,
          organizationType,
          counterpartyType,
          deferredPaymentDays,
          category,
          identificationCode,
          vatPayer,
          contactPerson,
          phone,
          email,
          address,
          status,
        });
      }
    }

    report.validRows = counterparties.length;
    return { report, counterparties };
  }
}
