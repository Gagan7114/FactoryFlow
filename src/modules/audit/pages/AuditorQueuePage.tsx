import { useState } from 'react';
import { toast } from 'sonner';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  NativeSelect as Select,
  SelectOption,
  Textarea,
} from '@/shared/components/ui';

import {
  useAuditEntries,
  usePreAudit,
  useReceiveDocuments,
  useSetAuditRemarks,
} from '../api';
import { AuditEntriesTable } from '../components';
import {
  AUDIT_STATUS_LABELS,
  AUDIT_STATUS_ORDER,
  AUDIT_TYPE_LABELS,
  AUDIT_TYPE_ORDER,
} from '../constants';
import type { AuditEntryStatus, AuditInvoiceEntry, AuditTrackerType } from '../types';

export default function AuditorQueuePage() {
  const [type, setType] = useState<AuditTrackerType | ''>('');
  const [status, setStatus] = useState<AuditEntryStatus | ''>('');
  const [remarksEntry, setRemarksEntry] = useState<AuditInvoiceEntry | null>(null);
  const [remarksText, setRemarksText] = useState('');

  const { data, isLoading } = useAuditEntries({
    type: type || undefined,
    status: status || undefined,
  });

  const receiveDocuments = useReceiveDocuments();
  const preAudit = usePreAudit();
  const setRemarks = useSetAuditRemarks();

  const busyId =
    receiveDocuments.isPending
      ? receiveDocuments.variables?.entryId
      : preAudit.isPending
        ? preAudit.variables?.entryId
        : undefined;

  function handleReceive(entry: AuditInvoiceEntry) {
    receiveDocuments.mutate(
      { entryId: entry.id },
      {
        onSuccess: () => toast.success(`Documents received for #${entry.serial_no}`),
        onError: (e) => toast.error((e as { message?: string })?.message || 'Action failed'),
      },
    );
  }

  function handlePreAudit(entry: AuditInvoiceEntry) {
    preAudit.mutate(
      { entryId: entry.id },
      {
        onSuccess: () => toast.success(`Pre-audited #${entry.serial_no}`),
        onError: (e) => toast.error((e as { message?: string })?.message || 'Action failed'),
      },
    );
  }

  function openRemarks(entry: AuditInvoiceEntry) {
    setRemarksEntry(entry);
    setRemarksText(entry.auditor_remarks);
  }

  function saveRemarks() {
    if (!remarksEntry) return;
    setRemarks.mutate(
      { entryId: remarksEntry.id, remarks: remarksText },
      {
        onSuccess: () => {
          toast.success('Remarks saved');
          setRemarksEntry(null);
        },
        onError: (e) => toast.error((e as { message?: string })?.message || 'Failed to save remarks'),
      },
    );
  }

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Auditor Queue"
        description="Delhi office: receive documents and pre-audit submitted invoices"
      />

      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="queue-type" className="text-xs">
            Type
          </Label>
          <Select
            id="queue-type"
            className="w-48"
            value={type}
            onChange={(e) => setType(e.target.value as AuditTrackerType | '')}
          >
            <SelectOption value="">All</SelectOption>
            {AUDIT_TYPE_ORDER.map((t) => (
              <SelectOption key={t} value={t}>
                {AUDIT_TYPE_LABELS[t]}
              </SelectOption>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="queue-status" className="text-xs">
            Status
          </Label>
          <Select
            id="queue-status"
            className="w-48"
            value={status}
            onChange={(e) => setStatus(e.target.value as AuditEntryStatus | '')}
          >
            <SelectOption value="">All</SelectOption>
            {AUDIT_STATUS_ORDER.map((s) => (
              <SelectOption key={s} value={s}>
                {AUDIT_STATUS_LABELS[s]}
              </SelectOption>
            ))}
          </Select>
        </div>
      </div>

      <AuditEntriesTable
        entries={data ?? []}
        isLoading={isLoading}
        showSubmittedBy
        emptyMessage="No entries in the queue."
        actions={(entry) => (
          <div className="flex flex-wrap gap-2">
            {entry.status === 'PENDING' && (
              <Button
                size="sm"
                disabled={busyId === entry.id}
                onClick={() => handleReceive(entry)}
              >
                Received Documents
              </Button>
            )}
            {entry.status === 'DOCUMENTS_RECEIVED' && (
              <Button
                size="sm"
                disabled={busyId === entry.id}
                onClick={() => handlePreAudit(entry)}
              >
                Pre-Audited
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => openRemarks(entry)}>
              Remarks
            </Button>
          </div>
        )}
      />

      <Dialog open={remarksEntry !== null} onOpenChange={(open) => !open && setRemarksEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Remarks {remarksEntry ? `· #${remarksEntry.serial_no}` : ''}
            </DialogTitle>
          </DialogHeader>
          <Textarea
            rows={4}
            value={remarksText}
            onChange={(e) => setRemarksText(e.target.value)}
            placeholder="Add a remark for this entry"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemarksEntry(null)}>
              Cancel
            </Button>
            <Button onClick={saveRemarks} disabled={setRemarks.isPending}>
              {setRemarks.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
