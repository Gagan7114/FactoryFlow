import type { AuditEntryStatus, AuditTrackerType } from '../types';

export const AUDIT_STALE_TIME = 30 * 1000;

export const AUDIT_TYPE_LABELS: Record<AuditTrackerType, string> = {
  FACTORY: 'Factory',
  MAYAPURI: 'Mayapuri',
  MART: 'Mart',
  IMPORT_EXPORT: 'Import/Export',
};

export const AUDIT_TYPE_ORDER: AuditTrackerType[] = [
  'FACTORY',
  'MAYAPURI',
  'MART',
  'IMPORT_EXPORT',
];

export const AUDIT_STATUS_LABELS: Record<AuditEntryStatus, string> = {
  PENDING: 'Pending',
  DOCUMENTS_RECEIVED: 'Documents Received',
  PRE_AUDITED: 'Pre-Audited',
};

export const AUDIT_STATUS_ORDER: AuditEntryStatus[] = [
  'PENDING',
  'DOCUMENTS_RECEIVED',
  'PRE_AUDITED',
];

type FieldType = 'text' | 'date' | 'number';

export interface AuditFieldDef {
  /** Matches the backend model field / payload key. */
  key:
    | 'invoice_date'
    | 'party_name'
    | 'invoice_no'
    | 'amount'
    | 'grpo_no'
    | 'dispatch_date'
    | 'record_date'
    | 'receiving_date'
    | 'rec_from_imp_exp_date';
  label: string;
  type: FieldType;
  required: boolean;
}

const F = {
  invoiceDate: { key: 'invoice_date', label: 'Invoice Date', type: 'date', required: true } as const,
  partyName: { key: 'party_name', label: 'Party Name', type: 'text', required: true } as const,
  invoiceNo: { key: 'invoice_no', label: 'Invoice No.', type: 'text', required: true } as const,
  amount: { key: 'amount', label: 'Amount', type: 'number', required: true } as const,
  grpoNo: { key: 'grpo_no', label: 'GRPO No.', type: 'text', required: false } as const,
  dispatchDate: { key: 'dispatch_date', label: 'Dispatch Date', type: 'date', required: false } as const,
  recordDate: { key: 'record_date', label: 'Date', type: 'date', required: false } as const,
  receivingDate: { key: 'receiving_date', label: 'Receiving Date', type: 'date', required: false } as const,
  recFromImpExp: {
    key: 'rec_from_imp_exp_date',
    label: 'Rec. from Imp/Exp Dept.',
    type: 'date',
    required: false,
  } as const,
} satisfies Record<string, AuditFieldDef>;

/**
 * Invoice-data fields shown on the submit form per tracker type.
 * Ordered to mirror the columns in the source Invoice Tracker workbook.
 * Audit/accounts columns are intentionally excluded - the status workflow
 * (Received Documents -> Pre-Audited) and auditor remarks replace them.
 */
export const AUDIT_TYPE_FIELDS: Record<AuditTrackerType, AuditFieldDef[]> = {
  FACTORY: [F.invoiceDate, F.partyName, F.invoiceNo, F.grpoNo, F.amount, F.dispatchDate],
  MAYAPURI: [F.recordDate, F.invoiceDate, F.partyName, F.invoiceNo, F.amount],
  MART: [F.invoiceDate, F.partyName, F.invoiceNo, F.amount, F.receivingDate, F.dispatchDate],
  IMPORT_EXPORT: [F.invoiceDate, F.partyName, F.invoiceNo, F.amount, F.recFromImpExp],
};
