import { useState } from 'react';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Label, NativeSelect as Select, SelectOption } from '@/shared/components/ui';

import { useAuditEntries } from '../api';
import { AuditEntriesTable } from '../components';
import {
  AUDIT_STATUS_LABELS,
  AUDIT_STATUS_ORDER,
  AUDIT_TYPE_LABELS,
  AUDIT_TYPE_ORDER,
} from '../constants';
import type { AuditEntryStatus, AuditTrackerType } from '../types';

export default function MyAuditSubmissionsPage() {
  const [type, setType] = useState<AuditTrackerType | ''>('');
  const [status, setStatus] = useState<AuditEntryStatus | ''>('');

  const { data, isLoading } = useAuditEntries({
    scope: 'mine',
    type: type || undefined,
    status: status || undefined,
  });

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="My Submissions"
        description="Audit status of invoices you have submitted"
      />

      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="my-type" className="text-xs">
            Type
          </Label>
          <Select
            id="my-type"
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
          <Label htmlFor="my-status" className="text-xs">
            Status
          </Label>
          <Select
            id="my-status"
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
        emptyMessage="You haven't submitted any entries yet."
      />
    </div>
  );
}
