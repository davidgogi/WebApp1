import { OrganizationType } from './organization-type.enum.js';

export enum LegalForm {
  LLC = 'llc',
  JSC = 'jsc',
  COOPERATIVE = 'cooperative',
  OTHER = 'other',
  INDIVIDUAL_ENTREPRENEUR = 'individual_entrepreneur',
  NATURAL_PERSON = 'natural_person',
}

export const LEGAL_FORMS_BY_TYPE: Record<OrganizationType, LegalForm[]> = {
  [OrganizationType.COMPANY]: [
    LegalForm.LLC,
    LegalForm.JSC,
    LegalForm.COOPERATIVE,
    LegalForm.OTHER,
  ],
  [OrganizationType.INDIVIDUAL]: [
    LegalForm.INDIVIDUAL_ENTREPRENEUR,
    LegalForm.NATURAL_PERSON,
  ],
};
