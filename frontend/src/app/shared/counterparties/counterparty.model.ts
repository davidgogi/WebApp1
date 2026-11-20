export type CounterpartyStatus = 'active' | 'inactive';
export type OrganizationType = 'company' | 'individual';

export type CounterpartyType = 'supplier' | 'client' | 'both';
export type LegalForm = 'llc' | 'jsc' | 'cooperative' | 'other' | 'individual_entrepreneur' | 'natural_person';

export const LEGAL_FORM_LABELS: Record<LegalForm, string> = {
  llc: 'LLC',
  jsc: 'JSC',
  cooperative: 'Cooperative',
  other: 'Other',
  individual_entrepreneur: 'Individual entrepreneur',
  natural_person: 'Natural person',
};

export const LEGAL_FORMS_BY_TYPE: Record<OrganizationType, LegalForm[]> = {
  company: ['llc', 'jsc', 'cooperative', 'other'],
  individual: ['individual_entrepreneur', 'natural_person'],
};
export type CounterpartySource = 'form' | 'import' | 'rs';

export const ORGANIZATION_TYPE_LABELS: Record<OrganizationType, string> = {
  company: 'Company',
  individual: 'Individual',
};

export const COUNTERPARTY_TYPE_LABELS: Record<CounterpartyType, string> = {
  supplier: 'Supplier',
  client: 'Client',
  both: 'Supplier and client',
};

export const COUNTERPARTY_STATUS_LABELS: Record<CounterpartyStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
};

export const COUNTERPARTY_HISTORY_ACTIONS: Partial<Record<string, string>> = {
  'counterparty.create': 'Created',
  'counterparty.update': 'Edited',
  'counterparty.status': 'Status changed',
  'counterparty.supplier': 'Marked as supplier',
  'counterparty.import': 'Imported',
  'counterparty.delete': 'Deleted',
  'counterparty.document_add': 'Document added',
  'counterparty.document_delete': 'Document deleted',
};

export const COUNTERPARTY_SOURCE_LABELS: Record<CounterpartySource, string> = {
  form: 'Form',
  import: 'Import',
  rs: 'RS',
};

export function counterpartyTypeOf(counterparty: { isSupplier: boolean; isClient: boolean }): CounterpartyType {
  return counterparty.isSupplier && counterparty.isClient ? 'both' : counterparty.isSupplier ? 'supplier' : 'client';
}

export type CounterpartyDocumentType = 'contract' | 'extract' | 'power_of_attorney' | 'other';

export const DOCUMENT_TYPE_LABELS: Record<CounterpartyDocumentType, string> = {
  contract: 'Contract',
  extract: 'Extract',
  power_of_attorney: 'Power of attorney',
  other: 'Other',
};

export interface CounterpartyDocument {
  id: string;
  name: string;
  type: CounterpartyDocumentType;
  validUntil: string | null;
  mimeType: string;
  size: number;
  uploadedByName: string;
  createdAt: string;
}

export type CounterpartyReceiptStatus = 'draft' | 'posted' | 'cancelled';

export const COUNTERPARTY_RECEIPT_STATUS_LABELS: Record<CounterpartyReceiptStatus, string> = {
  draft: 'Draft',
  posted: 'Posted',
  cancelled: 'Cancelled',
};

export interface CounterpartyReceipt {
  id: string;
  code: string;
  status: CounterpartyReceiptStatus;
  date: string;
  warehouse: { id: string; code: string; name: string };
  waybillNumber: string | null;
  lineCount: number;
  total: number;
}

export const vatLabel = (vatPayer: boolean) => (vatPayer ? 'VAT payer' : 'Not a VAT payer');

export interface CounterpartyHistoryEntry {
  id: string;
  createdAt: string;
  actorName: string;
  action: string;
  source: CounterpartySource | null;
}

export interface CounterpartyContact {
  id?: string;
  firstName: string;
  lastName: string;
  phone: string;
  position: string;
  email: string;
}

export interface Counterparty {
  id: string;
  code: string;
  name: string;
  organizationType: OrganizationType;
  legalForm: LegalForm | null;
  identificationCode: string | null;
  isSupplier: boolean;
  isClient: boolean;
  deferredPaymentDays: number | null;
  discountPercent: number | null;
  creditLimit: number | null;
  supplierPaymentDays: number | null;
  deliveryDays: number | null;
  bankAccount: string | null;
  vatPayer: boolean;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  actualAddress: string | null;
  category: string | null;
  note: string | null;
  status: CounterpartyStatus;
  contacts?: CounterpartyContact[];
  productCount: number;
  receiptCount: number;
  createdAt: string;
  updatedAt: string;
}

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

type CounterpartyTerms = 'discountPercent' | 'creditLimit' | 'supplierPaymentDays' | 'deliveryDays' | 'bankAccount';

export type CounterpartyPayload = Partial<Pick<Counterparty, CounterpartyTerms>> & Omit<Counterparty, CounterpartyTerms | 'id' | 'code' | 'productCount' | 'receiptCount' | 'createdAt' | 'updatedAt'> & {
  source?: 'form' | 'rs';
};
