import { cn } from '@/shared/utils/cn';

import { AUDIT_STATUS_LABELS } from '../constants';
import type { AuditEntryStatus } from '../types';

const STATUS_CLASSES: Record<AuditEntryStatus, string> = {
  PENDING:
    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  DOCUMENTS_RECEIVED:
    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  PRE_AUDITED:
    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};

export function AuditStatusBadge({
  status,
  label,
}: {
  status: AuditEntryStatus;
  label?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        STATUS_CLASSES[status],
      )}
    >
      {label ?? AUDIT_STATUS_LABELS[status]}
    </span>
  );
}
