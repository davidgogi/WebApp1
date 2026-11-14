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
import { Partner } from './partner.entity.js';
import { PartnerStatus } from './partner-status.enum.js';
import { PartnerType } from './partner-type.enum.js';
import { NewPartner, PartnersService } from './partners.service.js';

type Field =
  | 'name'
  | 'type'
  | 'role'
  | 'category'
  | 'identificationCode'
  | 'vatPayer'
  | 'contactPerson'
  | 'phone'
  | 'email'
  | 'address'
  | 'note'
  | 'status';

type PartnerRole = 'supplier' | 'client' | 'both';

const SHEET_NAME = 'Counterparties';

const TYPE_LABELS: Record<PartnerType, string> = {
  [PartnerType.COMPANY]: 'Company',
  [PartnerType.INDIVIDUAL]: 'Individual',
};

const ROLE_LABELS: Record<PartnerRole, string> = {
  supplier: 'Supplier',
  client: 'Client',
  both: 'Both',
};

const STATUS_LABELS: Record<PartnerStatus, string> = {
  [PartnerStatus.ACTIVE]: 'Active',
  [PartnerStatus.INACTIVE]: 'Inactive',
};

const COLUMNS: SheetColumn<Field>[] = [
  {
    field: 'name',
    header: 'Counterparty name',
    width: 30,
    required: true,
  },
  {
    field: 'type',
    header: 'Organization type',
    width: 13,
    required: true,
    choices: Object.values(TYPE_LABELS),
    translated: true,
  },
  {
    field: 'role',
    header: 'Counterparty type',
    width: 12,
    required: true,
    choices: Object.values(ROLE_LABELS),
    translated: true,
  },
  {
    field: 'category',
    header: 'Category',
    aliases: ['კატეგორია', 'категория'],
    width: 18,
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
    header: 'VAT status',
    width: 18,
    choices: ['VAT payer', 'Not a VAT payer'],
    required: true,
    translated: true,
  },
  {
    field: 'contactPerson',
    header: 'Contact person',
    aliases: ['contact', 'საკონტაქტო პირი'],
    width: 22,
  },
  {
    field: 'phone',
    header: 'Phone',
    aliases: ['ტელეფონი'],
    width: 18,
    text: true,
  },
  {
    field: 'email',
    header: 'Email',
    aliases: ['ელფოსტა'],
    width: 26,
  },
  {
    field: 'address',
    header: 'Address',
    aliases: ['მისამართი'],
    width: 34,
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
];

const EXPORT_ONLY = ['Products', 'Receipts'];

const EXAMPLE_ROWS = [
  [
    'Mars Georgia',
    'Company',
    'Supplier',
    'Groceries',
    '405123456',
    'VAT payer',
    'Nino Beridze',
    '+995 555 12 34 56',
    'orders@mars.ge',
    '12 Tsereteli Ave, Tbilisi',
    'Delivers on Mondays',
    'Active',
  ],
  [
    'Tbilisi Dishware',
    'Company',
    'Both',
    'Dishware',
    '205987654',
    'Not a VAT payer',
    'Giorgi Maisuradze',
    '599 44 22 11',
    'sales@dishware.ge',
    '5 Agmashenebeli Ave, Tbilisi',
    '',
    'Active',
  ],
  [
    'Levan Kapanadze',
    'Individual',
    'Client',
    'Catering',
    '01024012345',
    'Not a VAT payer',
    'Levan Kapanadze',
    '+995 577 10 20 30',
    'levan@example.com',
    '3 Rustaveli St, Batumi',
    '',
    'Inactive',
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

const TYPES: Record<string, PartnerType> = {
  ...labelKeys(TYPE_LABELS),
  company: PartnerType.COMPANY,
  individual: PartnerType.INDIVIDUAL,
};
const ROLES: Record<string, PartnerRole> = labelKeys(ROLE_LABELS);
const STATUSES: Record<string, PartnerStatus> = {
  ...labelKeys(STATUS_LABELS),
  active: PartnerStatus.ACTIVE,
  inactive: PartnerStatus.INACTIVE,
  'not active': PartnerStatus.INACTIVE,
};
const VAT: Record<string, boolean> = {
  ...Object.fromEntries(choiceKeys('VAT payer').map((key) => [key, true])),
  ...Object.fromEntries(choiceKeys('Not a VAT payer').map((key) => [key, false])),
};

export interface PartnerPreviewRow {
  row: number;
  name: string;
  type: PartnerType;
  role: PartnerRole;
  category: string;
  identificationCode: string | null;
  vatPayer: boolean;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  status: PartnerStatus;
}

export type PartnerImportReport = ImportReport<PartnerPreviewRow>;

const roleOf = (
  partner: Pick<Partner, 'isSupplier' | 'isClient'>,
): PartnerRole =>
  partner.isSupplier && partner.isClient
    ? 'both'
    : partner.isSupplier
      ? 'supplier'
      : 'client';

@Injectable()
export class PartnerExcelService {
  constructor(
    @InjectRepository(Partner)
    private readonly partnersRepository: Repository<Partner>,
    private readonly partnersService: PartnersService,
  ) {}

  async export(actor: AuthUser, language: Language): Promise<Buffer> {
    const partners = await this.partnersService.findAll(actor);
    const workbook = new ExcelJS.Workbook();
    addTableSheet(
      workbook,
      SHEET_NAME,
      [
        { header: 'Counterparty name', width: 30 },
        { header: 'Organization type', width: 18, translated: true },
        { header: 'Counterparty type', width: 18, translated: true },
        { header: 'Category', width: 18 },
        { header: 'Identification code', width: 20, text: true },
        { header: 'VAT status', width: 18, translated: true },
        { header: 'Contact person', width: 22 },
        { header: 'Phone', width: 18, text: true },
        { header: 'Email', width: 26 },
        { header: 'Address', width: 34 },
        { header: 'Note', width: 34 },
        { header: 'Status', width: 12, translated: true },
      ],
      partners.map((p) => [
        p.name,
        TYPE_LABELS[p.type],
        ROLE_LABELS[roleOf(p)],
        p.category ?? '',
        p.identificationCode ?? '',
        p.vatPayer ? 'VAT payer' : 'Not a VAT payer',
        p.contactPerson ?? '',
        p.phone ?? '',
        p.email ?? '',
        p.address ?? '',
        p.note ?? '',
        STATUS_LABELS[p.status],
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
    // Not addRows: the dropdown setup already created rows 2..1001, so appending would put the examples at row 1002.
    rows.forEach((values, index) =>
      values.forEach((value, column) => {
        sheet.getCell(index + 2, column + 1).value = value;
      }),
    );
    addInstructionsSheet(
      workbook,
      [
        [
          'Counterparty name',
          'Yes',
          'Must not repeat an existing counterparty or another row (capitals and extra spaces are ignored).',
          'Mars Georgia',
        ],
        ['Organization type', 'Yes', 'Company or Individual.', 'Company'],
        ['Counterparty type', 'Yes', 'Supplier, Client or Both.', 'Supplier'],
        [
          'Category',
          'No',
          'Free text: what the counterparty deals in.',
          'Groceries',
        ],
        [
          'Identification code',
          'Yes',
          '9 digits for a company, the 11-digit personal ID for an individual. Must not repeat an existing counterparty or another row.',
          '405123456',
        ],
        ['VAT status', 'Yes', 'VAT payer or Not a VAT payer.', 'VAT payer'],
        ['Contact person', 'No', 'Free text.', 'Nino Beridze'],
        [
          'Phone',
          'No',
          'Digits, with an optional + at the start.',
          '+995 555 12 34 56',
        ],
        ['Email', 'No', 'A valid email address.', 'orders@supplier.ge'],
        ['Address', 'No', 'Free text.', '12 Tsereteli Ave, Tbilisi'],
        ['Note', 'No', 'Free text.', 'Delivers on Mondays'],
        ['Status', 'Yes', 'Active or Inactive.', 'Active'],
      ],
      [
        `The sheet named "${SHEET_NAME}" is read (or the first sheet). Empty rows are skipped.`,
        'An exported counterparties file can be imported too: its extra columns (Products, Receipts) are ignored.',
        'Counterparty name, Organization type, Counterparty type, Identification code, VAT status and Status must be filled in for every counterparty.',
        'At most 1000 counterparties per file. If any row has an error, nothing is imported.',
        'This only adds new counterparties: a counterparty that already exists is reported as an error, not updated.',
      ],
    );
    return workbook;
  }

  async check(
    actor: AuthUser,
    file: Express.Multer.File | undefined,
  ): Promise<PartnerImportReport> {
    return (await this.validate(actor, file)).report;
  }

  async import(
    actor: AuthUser,
    file: Express.Multer.File | undefined,
  ): Promise<PartnerImportReport> {
    const { report, partners } = await this.validate(actor, file);
    if (report.errors.length || partners.length === 0) {
      return report;
    }
    const saved = await this.partnersService.createMany(actor, partners);
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
  ): Promise<{ report: PartnerImportReport; partners: NewPartner[] }> {
    const { report, rows } = await readImportFile<Field, PartnerPreviewRow>(
      file,
      SHEET_NAME,
      COLUMNS,
      EXPORT_ONLY,
    );
    if (report.errors.length) {
      return { report, partners: [] };
    }

    const existing = await this.partnersRepository.find({
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

    const partners: NewPartner[] = [];
    for (const sheetRow of rows) {
      const { row, values } = sheetRow;
      const errorCount = report.errors.length;
      const { error } = rowIssues(report, COLUMNS, sheetRow);
      const tooLong = (field: Field, max: number) => {
        if ((values[field] ?? '').length > max) {
          error(field, `Too long: at most ${max} characters`);
        }
      };

      const name = values.name ?? '';
      if (!name) {
        error('name', 'Counterparty name is required');
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

      const typeText = values.type ?? '';
      const type = TYPES[choiceKey(typeText)];
      if (!typeText) {
        error('type', 'Organization type is required: Company or Individual');
      } else if (!type) {
        error('type', 'Organization type must be Company or Individual');
      }

      const roleText = values.role ?? '';
      const role = ROLES[choiceKey(roleText)];
      if (!roleText) {
        error('role', 'Counterparty type is required: Supplier, Client or Both');
      } else if (!role) {
        error('role', 'Counterparty type must be Supplier, Client or Both');
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
          type === PartnerType.COMPANY &&
          identificationCode.length !== 9
        ) {
          error(
            'identificationCode',
            "A company's identification code has 9 digits",
          );
        } else if (
          type === PartnerType.INDIVIDUAL &&
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
        error('vatPayer', 'VAT status is required: VAT payer or Not a VAT payer');
      } else if (vatPayer === undefined) {
        error('vatPayer', 'VAT status must be VAT payer or Not a VAT payer');
      }

      const statusText = values.status ?? '';
      const status = STATUSES[choiceKey(statusText)];
      if (!statusText) {
        error('status', 'Status is required: Active or Inactive');
      } else if (!status) {
        error('status', 'Status must be Active or Inactive');
      }

      // Contact person, phone, email, address and category are optional: checked only when filled in.
      const phone = values.phone ?? '';
      if (phone && !PHONE.test(phone)) {
        error('phone', 'Phone must be a valid phone number');
      }
      const email = values.email ?? '';
      if (email && !isEmail(email)) {
        error('email', 'Email must be a valid email address');
      }
      const contactPerson = values.contactPerson ?? '';
      const address = values.address ?? '';
      const category = values.category ?? '';
      const note = values.note ?? '';
      tooLong('contactPerson', 120);
      tooLong('address', 240);
      tooLong('category', 80);
      tooLong('note', 1000);

      if (report.errors.length === errorCount) {
        partners.push({
          name,
          type,
          isSupplier: role !== 'client',
          isClient: role !== 'supplier',
          identificationCode,
          vatPayer,
          contactPerson: contactPerson || null,
          phone: phone || null,
          email: email || null,
          address: address || null,
          category: category || null,
          note: note || null,
          status,
        });
        report.rows.push({
          row,
          name,
          type,
          role,
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

    report.validRows = partners.length;
    return { report, partners };
  }
}
