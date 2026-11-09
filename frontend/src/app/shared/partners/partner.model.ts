export type PartnerStatus = 'active' | 'inactive';
export type PartnerType = 'company' | 'individual';

export const PARTNER_TYPE_LABELS: Record<PartnerType, string> = {
  company: 'Company',
  individual: 'Individual',
};

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
  status: PartnerStatus;
  productCount: number;
  receiptCount: number;
  createdAt: string;
  updatedAt: string;
}

export type PartnerPayload = Omit<Partner, 'id' | 'productCount' | 'receiptCount' | 'createdAt' | 'updatedAt'>;
