export const AUDIT_MODULE_PREFIX = 'audit';

export const AUDIT_PERMISSIONS = {
  /** Submit (create) an invoice-tracker entry. */
  SUBMIT: 'audit.add_auditinvoiceentry',
  /** View invoice-tracker entries. */
  VIEW: 'audit.view_auditinvoiceentry',
  /** Advance audit status and edit remarks (Delhi auditor). */
  AUDIT: 'audit.can_audit_invoice_entries',
  /** See every entry, not just one's own submissions (auditor). */
  VIEW_ALL: 'audit.can_view_all_audit_entries',
} as const;

export type AuditPermission = (typeof AUDIT_PERMISSIONS)[keyof typeof AUDIT_PERMISSIONS];
