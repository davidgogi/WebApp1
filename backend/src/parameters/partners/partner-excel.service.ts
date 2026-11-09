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
  | 'identificationCode'
  | 'vatPayer'
  | 'contactPerson'
  | 'phone'
  | 'email'
  | 'address'
  | 'status';

type PartnerRole = 'supplier' | 'client' | 'both';

const SHEET_NAME = 'Partners';

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
    header: 'Name',
    aliases: ['partner', 'partner name', 'სახელი', 'პარტნიორი'],
    width: 30,
    required: true,
  },
  {
    field: 'type',
    header: 'Type',
    aliases: ['ტიპი'],
    width: 13,
    required: true,
    choices: Object.values(TYPE_LABELS),
  },
  {
    field: 'role',
    header: 'Role',
    aliases: ['როლი'],
    width: 12,
    required: true,
    choices: Object.values(ROLE_LABELS),
  },
  {
    field: 'identificationCode',
    header: 'Identification code',
    aliases: ['id code', 'code', 'საიდენტიფიკაციო კოდი', 'პირადი ნომერი'],
    width: 20,
    text: true,
  },
  {
    field: 'vatPayer',
    header: 'VAT payer',
    aliases: ['vat', 'დღგ'],
    width: 11,
    choices: ['Yes', 'No'],
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
  { field: 'email', header: 'Email', aliases: ['ელფოსტა'], width: 26 },
  { field: 'address', header: 'Address', aliases: ['მისამართი'], width: 34 },
  {
    field: 'status',
    header: 'Status',
    aliases: ['სტატუსი'],
    width: 12,
    choices: Object.values(STATUS_LABELS),
  },
];

const EXPORT_ONLY = ['Products', 'Receipts'];
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
  ...Object.fromEntries(choiceKeys('Yes').map((key) => [key, true])),
  ...Object.fromEntries(choiceKeys('No').map((key) => [key, false])),
};

export interface PartnerPreviewRow {
  row: number;
  name: string;
  type: PartnerType;
  role: PartnerRole;
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
        { header: 'Name', width: 30 },
        { header: 'Type', width: 13, translated: true },
        { header: 'Role', width: 12, translated: true },
        { header: 'Identification code', width: 20, text: true },
        { header: 'VAT payer', width: 11, translated: true },
        { header: 'Contact person', width: 22 },
        { header: 'Phone', width: 18, text: true },
        { header: 'Email', width: 26 },
        { header: 'Address', width: 34 },
        { header: 'Status', width: 12, translated: true },
        { header: 'Products', width: 11 },
        { header: 'Receipts', width: 11 },
      ],
      partners.map((p) => [
        p.name,
        TYPE_LABELS[p.type],
        ROLE_LABELS[roleOf(p)],
        p.identificationCode ?? '',
        p.vatPayer ? 'Yes' : 'No',
        p.contactPerson ?? '',
        p.phone ?? '',
        p.email ?? '',
        p.address ?? '',
        STATUS_LABELS[p.status],
        p.productCount ?? 0,
        p.receiptCount ?? 0,
      ]),
    );
    return workbookBuffer(workbook, language);
  }

  async template(language: Language): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    addTemplateSheet(workbook, SHEET_NAME, COLUMNS);
    addInstructionsSheet(
      workbook,
      [
        [
          'Name',
          'Yes',
          'Must not repeat an existing partner or another row (capitals and extra spaces are ignored).',
          'Mars Georgia',
        ],
        ['Type', 'Yes', 'Company or Individual.', 'Company'],
        ['Role', 'Yes', 'Supplier, Client or Both.', 'Supplier'],
        [
          'Identification code',
          'No',
          '9 digits for a company, the 11-digit personal ID for an individual. Must not repeat an existing partner or another row.',
          '405123456',
        ],
        ['VAT payer', 'No', 'Yes or No. Empty means No.', 'Yes'],
        ['Contact person', 'No', 'Free text.', 'Nino Beridze'],
        [
          'Phone',
          'No',
          'Digits, with an optional + at the start.',
          '+995 555 12 34 56',
        ],
        ['Email', 'No', 'A valid email address.', 'orders@supplier.ge'],
        ['Address', 'No', 'Free text.', '12 Tsereteli Ave, Tbilisi'],
        ['Status', 'No', 'Active or Inactive. Empty means Active.', 'Active'],
      ],
      [
        `The sheet named "${SHEET_NAME}" is read (or the first sheet). Empty rows are skipped.`,
        'An exported partners file can be imported too: its extra columns (Products, Receipts) are ignored.',
        'At most 1000 partners per file. If any row has an error, nothing is imported.',
        'This only adds new partners: a partner that already exists is reported as an error, not updated.',
      ],
    );
    return workbookBuffer(workbook, language);
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
        error('name', 'Name is required');
      } else {
        tooLong('name', 140);
        const key = nameKey(name);
        const taken = byName.get(key);
        const firstRow = firstRowByName.get(key);
        if (taken) {
          error('name', `A partner named "${taken.name}" already exists`);
        } else if (firstRow !== undefined) {
          error(
            'name',
            `Same name as row ${firstRow}; partner names must be unique`,
          );
        } else {
          firstRowByName.set(key, row);
        }
      }

      const typeText = values.type ?? '';
      const type = TYPES[choiceKey(typeText)];
      if (!typeText) {
        error('type', 'Type is required: Company or Individual');
      } else if (!type) {
        error('type', 'Type must be Company or Individual');
      }

      const roleText = values.role ?? '';
      const role = ROLES[choiceKey(roleText)];
      if (!roleText) {
        error('role', 'Role is required: Supplier, Client or Both');
      } else if (!role) {
        error('role', 'Role must be Supplier, Client or Both');
      }

      const identificationCode = values.identificationCode || null;
      if (identificationCode) {
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
      const vatPayer = vatText ? VAT[choiceKey(vatText)] : false;
      if (vatPayer === undefined) {
        error('vatPayer', 'VAT payer must be Yes or No (or empty for No)');
      }

      const statusText = values.status ?? '';
      const status = statusText
        ? STATUSES[choiceKey(statusText)]
        : PartnerStatus.ACTIVE;
      if (!status) {
        error(
          'status',
          'Status must be Active or Inactive (or empty for Active)',
        );
      }

      const phone = values.phone || null;
      if (phone && !PHONE.test(phone)) {
        error('phone', 'Phone must be a valid phone number');
      }
      const email = values.email || null;
      if (email && !isEmail(email)) {
        error('email', 'Email must be a valid email address');
      }
      tooLong('contactPerson', 120);
      tooLong('address', 240);
      const contactPerson = values.contactPerson || null;
      const address = values.address || null;

      if (report.errors.length === errorCount) {
        partners.push({
          name,
          type,
          isSupplier: role !== 'client',
          isClient: role !== 'supplier',
          identificationCode,
          vatPayer,
          contactPerson,
          phone,
          email,
          address,
          status,
        });
        report.rows.push({
          row,
          name,
          type,
          role,
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
