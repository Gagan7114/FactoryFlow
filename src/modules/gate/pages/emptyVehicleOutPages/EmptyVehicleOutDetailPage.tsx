import {
  ArrowLeft,
  CalendarClock,
  LogOut,
  RotateCcw,
  ShieldCheck,
  Truck,
  User,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import {
  useCancelEmptyVehicleGateOut,
  useEmptyVehicleGateOut,
} from '@/modules/gate/api';
import { GateStatusBadge } from '@/modules/gate/components';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

const ENTRY_TYPE_LABELS: Record<string, string> = {
  RAW_MATERIAL: 'Raw Material',
  DAILY_NEED: 'Daily Need',
  MAINTENANCE: 'Maintenance',
  CONSTRUCTION: 'Construction',
  EMPTY_VEHICLE: 'Empty Vehicle',
  BST_IN: 'BST In',
  BST_RETURN: 'BST Return',
  JOB_WORK: 'Job Work',
};

function formatDateTime(date?: string | null, time?: string | null) {
  if (!date && !time) return '-';
  return [date, time ? time.slice(0, 5) : ''].filter(Boolean).join(' ');
}

function formatTimestamp(value?: string | null) {
  if (!value) return '-';

  try {
    return new Date(value).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

function formatEntryType(value?: string | null) {
  if (!value) return '-';
  return ENTRY_TYPE_LABELS[value] || value.replaceAll('_', ' ');
}

export default function EmptyVehicleOutDetailPage() {
  const navigate = useNavigate();
  const { entryId } = useParams();
  const outId = Number(entryId || 0) || null;
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  const {
    data: entry,
    isLoading,
    error,
  } = useEmptyVehicleGateOut(outId);
  const cancelEmptyOut = useCancelEmptyVehicleGateOut();

  const handleCancelEntry = async () => {
    if (!entry) return;

    const trimmedReason = cancelReason.trim();
    if (!trimmedReason) {
      setCancelError('Please enter a cancellation reason');
      return;
    }

    setCancelError('');

    try {
      await cancelEmptyOut.mutateAsync({
        id: entry.id,
        data: { cancel_reason: trimmedReason },
      });
      toast.success('Empty vehicle out entry cancelled');
      setCancelReason('');
      setIsCancelDialogOpen(false);
    } catch (err) {
      setCancelError(getErrorMessage(err, 'Failed to cancel empty vehicle out'));
    }
  };

  if (isLoading) {
    return <EmptyState text="Loading empty vehicle out entry..." />;
  }

  if (error || !entry) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/gate/empty-vehicle-out')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <EmptyState text={getErrorMessage(error, 'Empty vehicle out entry not found')} />
      </div>
    );
  }

  const canCancel = entry.status === 'COMPLETED';

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/gate/empty-vehicle-out')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{entry.entry_no}</h2>
            <p className="text-muted-foreground">Empty vehicle gate-out entry</p>
          </div>
        </div>
        {canCancel && (
          <Button
            variant="outline"
            className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => {
              setCancelError('');
              setIsCancelDialogOpen(true);
            }}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Cancel Entry
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5" />
            Gate Out
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
          <InfoItem label="Out Entry" value={entry.entry_no} />
          <InfoItem label="Gate Out" value={formatDateTime(entry.gate_out_date, entry.out_time)} />
          <InfoItem label="Security" value={entry.security_name || ''} />
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <GateStatusBadge status={entry.status} className="mt-1" />
          </div>
          <InfoItem label="Remarks" value={entry.remarks || ''} />
          {entry.status === 'CANCELLED' && (
            <>
              <InfoItem label="Cancel Reason" value={entry.cancel_reason || ''} />
              <InfoItem label="Cancelled At" value={formatTimestamp(entry.cancelled_at)} />
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Vehicle
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <InfoItem label="Vehicle" value={entry.vehicle_number} />
            <InfoItem label="In Entry" value={entry.vehicle_entry_no} />
            <InfoItem label="In Type" value={formatEntryType(entry.vehicle_entry_type)} />
            <InfoItem label="In Time" value={formatTimestamp(entry.vehicle_entry_time)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Driver
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <InfoItem label="Driver" value={entry.driver_name} />
            <InfoItem label="Mobile" value={entry.driver_mobile} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Record Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
          <InfoItem label="Created" value={formatTimestamp(entry.created_at)} />
          <InfoItem label="Updated" value={formatTimestamp(entry.updated_at)} />
          <InfoItem label="Physical Gate Out" value={formatDateTime(entry.gate_out_date, entry.out_time)} />
          <InfoItem label="Source Inward Entry" value={entry.vehicle_entry_no} />
        </CardContent>
      </Card>

      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Empty Vehicle Out</DialogTitle>
            <DialogDescription>
              This keeps the record in history and makes the inward entry available for correction.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="empty-out-cancel-reason">
              Cancellation Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="empty-out-cancel-reason"
              value={cancelReason}
              onChange={(event) => {
                setCancelReason(event.target.value);
                setCancelError('');
              }}
              placeholder="Why is this entry being cancelled?"
            />
            {cancelError && <p className="text-sm text-destructive">{cancelError}</p>}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCancelDialogOpen(false)}
              disabled={cancelEmptyOut.isPending}
            >
              Keep Entry
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleCancelEntry}
              disabled={cancelEmptyOut.isPending}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {cancelEmptyOut.isPending ? 'Cancelling...' : 'Cancel Entry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value || '-'}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-24 items-center justify-center rounded-lg border text-sm text-muted-foreground">
      <span className="inline-flex items-center gap-2">
        <ShieldCheck className="h-4 w-4" />
        {text}
      </span>
    </div>
  );
}
