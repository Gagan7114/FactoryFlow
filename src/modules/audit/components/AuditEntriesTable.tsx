import type { ReactNode } from 'react';

import { AUDIT_TYPE_LABELS } from '../constants';
import type { AuditInvoiceEntry } from '../types';
import { AuditStatusBadge } from './AuditStatusBadge';

interface AuditEntriesTableProps {
  entries: AuditInvoiceEntry[];
  isLoading?: boolean;
  showSubmittedBy?: boolean;
  /** Render an actions cell (e.g. auditor buttons) for each row. */
  actions?: (entry: AuditInvoiceEntry) => ReactNode;
  emptyMessage?: string;
}

const amountFormatter = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 2,
});

export function AuditEntriesTable({
  entries,
  isLoading,
  showSubmittedBy = false,
  actions,
  emptyMessage = 'No entries found.',
}: AuditEntriesTableProps) {
  const columnCount = 8 + (showSubmittedBy ? 1 : 0) + (actions ? 1 : 0);

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">S.No.</th>
            <th className="px-4 py-3 font-medium">Invoice Date</th>
            <th className="px-4 py-3 font-medium">Party</th>
            <th className="px-4 py-3 font-medium">Invoice No.</th>
            <th className="px-4 py-3 text-right font-medium">Amount</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Remarks</th>
            {showSubmittedBy && <th className="px-4 py-3 font-medium">Submitted By</th>}
            {actions && <th className="px-4 py-3 font-medium">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={columnCount} className="px-4 py-10 text-center text-muted-foreground">
                Loading...
              </td>
            </tr>
          ) : entries.length === 0 ? (
            <tr>
              <td colSpan={columnCount} className="px-4 py-10 text-center text-muted-foreground">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            entries.map((entry) => (
              <tr key={entry.id} className="border-t align-top">
                <td className="px-4 py-3">{AUDIT_TYPE_LABELS[entry.tracker_type]}</td>
                <td className="px-4 py-3 tabular-nums">{entry.serial_no}</td>
                <td className="px-4 py-3 tabular-nums">{entry.invoice_date}</td>
                <td className="px-4 py-3">{entry.party_name}</td>
                <td className="px-4 py-3">{entry.invoice_no}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {amountFormatter.format(Number(entry.amount))}
                </td>
                <td className="px-4 py-3">
                  <AuditStatusBadge status={entry.status} label={entry.status_display} />
                </td>
                <td className="px-4 py-3 max-w-[14rem] text-muted-foreground">
                  {entry.auditor_remarks || '-'}
                </td>
                {showSubmittedBy && (
                  <td className="px-4 py-3 text-muted-foreground">{entry.created_by_name}</td>
                )}
                {actions && <td className="px-4 py-3">{actions(entry)}</td>}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
