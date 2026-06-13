import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Button,
  Label,
  NativeSelect as Select,
  SelectOption,
} from '@/shared/components/ui';

import { useSubmitAuditEntry } from '../api';
import { AuditEntryForm } from '../components';
import { AUDIT_TYPE_LABELS, AUDIT_TYPE_ORDER } from '../constants';
import type { AuditSubmitPayload, AuditTrackerType } from '../types';

export default function AuditSubmitPage() {
  const navigate = useNavigate();
  const [trackerType, setTrackerType] = useState<AuditTrackerType>('FACTORY');
  const submitMutation = useSubmitAuditEntry();

  function handleSubmit(payload: AuditSubmitPayload) {
    submitMutation.mutate(payload, {
      onSuccess: (entry) => {
        toast.success(
          `Submitted ${AUDIT_TYPE_LABELS[entry.tracker_type]} entry #${entry.serial_no}`,
        );
        navigate('/audit/my-submissions');
      },
      onError: (error) => {
        toast.error((error as { message?: string })?.message || 'Failed to submit entry');
      },
    });
  }

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Submit Invoice"
        description="Choose a type, then fill the invoice details for that tracker"
      />

      <div className="max-w-3xl space-y-6 rounded-lg border bg-card p-6">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="audit-tracker-type" className="text-xs">
            Type
          </Label>
          <Select
            id="audit-tracker-type"
            className="w-64"
            value={trackerType}
            onChange={(event) => setTrackerType(event.target.value as AuditTrackerType)}
          >
            {AUDIT_TYPE_ORDER.map((type) => (
              <SelectOption key={type} value={type}>
                {AUDIT_TYPE_LABELS[type]}
              </SelectOption>
            ))}
          </Select>
        </div>

        {/* key forces a clean remount (and form reset) when the type changes */}
        <AuditEntryForm
          key={trackerType}
          trackerType={trackerType}
          isSubmitting={submitMutation.isPending}
          onSubmit={handleSubmit}
        />
      </div>

      <Button variant="ghost" onClick={() => navigate('/audit')}>
        Back to Audit
      </Button>
    </div>
  );
}
