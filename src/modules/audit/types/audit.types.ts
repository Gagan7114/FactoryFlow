export type AuditTrackerType = 'FACTORY' | 'MAYAPURI' | 'MART' | 'IMPORT_EXPORT';

export type AuditEntryStatus = 'PENDING' | 'DOCUMENTS_RECEIVED' | 'PRE_AUDITED';

export interface AuditInvoiceEntry {
  id: number;
  tracker_type: AuditTrackerType;
  tracker_type_display: string;
  serial_no: number;
  invoice_date: string;
  party_name: string;
  invoice_no: string;
  amount: string;
  grpo_no: string;
  dispatch_date: string | null;
  record_date: string | null;
  receiving_date: string | null;
  rec_from_imp_exp_date: string | null;
  status: AuditEntryStatus;
  status_display: string;
  auditor_remarks: string;
  documents_received_at: string | null;
  documents_received_by_name: string;
  pre_audited_at: string | null;
  pre_audited_by_name: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface AuditSummary {
  total: number;
  by_status: Record<AuditEntryStatus, number>;
  by_type: Record<AuditTrackerType, number>;
}

export interface AuditSubmitPayload {
  tracker_type: AuditTrackerType;
  invoice_date: string;
  party_name: string;
  invoice_no: string;
  amount: number;
  grpo_no?: string;
  dispatch_date?: string | null;
  record_date?: string | null;
  receiving_date?: string | null;
  rec_from_imp_exp_date?: string | null;
}

export interface AuditEntryFilters {
  type?: AuditTrackerType;
  status?: AuditEntryStatus;
  scope?: 'mine' | 'all';
}
