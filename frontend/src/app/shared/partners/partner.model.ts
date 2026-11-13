export type PartnerStatus = 'active' | 'inactive';
export type PartnerType = 'company' | 'individual';

export type PartnerRole = 'supplier' | 'client' | 'both';
export type PartnerSource = 'form' | 'import' | 'rs';

export const PARTNER_TYPE_LABELS: Record<PartnerType, string> = {
  company: 'Company',
  individual: 'Individual',
};

export const PARTNER_ROLE_LABELS: Record<PartnerRole, string> = {
  supplier: 'Supplier',
  client: 'Client',
  both: 'Supplier and client',
};

export const PARTNER_STATUS_LABELS: Record<PartnerStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
};

export const PARTNER_HISTORY_ACTIONS: Partial<Record<string, string>> = {
  'partner.create': 'Created',
  'partner.update': 'Edited',
  'partner.status': 'Status changed',
  'partner.supplier': 'Marked as supplier',
  'partner.import': 'Imported',
  'partner.delete': 'Deleted',
};

export const PARTNER_SOURCE_LABELS: Record<PartnerSource, string> = {
  form: 'Form',
  import: 'Import',
  rs: 'RS',
};

export function partnerRole(partner: { isSupplier: boolean; isClient: boolean }): PartnerRole {
  return partner.isSupplier && partner.isClient ? 'both' : partner.isSupplier ? 'supplier' : 'client';
}

export const vatLabel = (vatPayer: boolean) => (vatPayer ? 'VAT payer' : 'Not a VAT payer');

export interface PartnerHistoryEntry {
  id: string;
  createdAt: string;
  actorName: string;
  action: string;
  source: PartnerSource | null;
}

export interface PartnerContact {
  id?: string;
  firstName: string;
  lastName: string;
  phone: string;
  position: string;
  email: string;
}

export interface Partner {
  id: string;
  name: string;
  type: PartnerType;
  identificationCode: string | null;
  isSupplier: boolean;
  isClient: boolean;
  vatPayer: boolean;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  category: string | null;
  note: string | null;
  status: PartnerStatus;
  contacts?: PartnerContact[];
  productCount: number;
  receiptCount: number;
  createdAt: string;
  updatedAt: string;
}

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

export type PartnerPayload = Omit<Partner, 'id' | 'productCount' | 'receiptCount' | 'createdAt' | 'updatedAt'> & {
  source?: 'form' | 'rs';
};
