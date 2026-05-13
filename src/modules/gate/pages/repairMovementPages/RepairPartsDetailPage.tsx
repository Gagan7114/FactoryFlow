import {
  ArrowLeft,
  CalendarClock,
  FileText,
  PackageCheck,
  RotateCcw,
  ShieldCheck,
  Truck,
  User,
  Wrench,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

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

import {
  buildRepairMovementDateTimeLabel,
  cancelRepairMovementEntry,
  findRepairMovementEntry,
  formatRepairMovementDate,
  formatRepairMovementDateTime,
  getRepairMovementValue,
  parseRepairMovementItems,
  readRepairMovementEntries,
  REPAIR_PARTS_IN_COMPLETED_KEY,
  REPAIR_PARTS_OUT_COMPLETED_KEY,
  type RepairMovementEntry,
  type RepairMovementItem,
  type RepairMovementValue,
} from './repairMovement.storage';

type RepairPartsDirection = 'in' | 'out';

interface RepairPartsDetailPageProps {
  direction: RepairPartsDirection;
}

const detailConfig = {
  out: {
    title: 'Repair Parts Out',
    backPath: '/gate/repair-parts-out',
    storageKey: REPAIR_PARTS_OUT_COMPLETED_KEY,
  },
  in: {
    title: 'Repair Parts In',
    backPath: '/gate/repair-parts-in',
    storageKey: REPAIR_PARTS_IN_COMPLETED_KEY,
  },
} satisfies Record<
  RepairPartsDirection,
  {
    title: string;
    backPath: string;
    storageKey: string;
  }
>;

function formatStoredTimestamp(value?: RepairMovementValue) {
  if (!value || typeof value === 'boolean') return '-';
  return formatRepairMovementDateTime(value);
}

function getEntryStatusLabel(
  direction: RepairPartsDirection,
  entry: RepairMovementEntry,
  linkedInEntry: RepairMovementEntry | null,
) {
  if (entry.status === 'CANCELLED') return 'CANCELLED';
  if (direction === 'out') return linkedInEntry ? 'RECEIVED' : 'AWAITING RETURN';
  return getRepairMovementValue(entry, 'repairStatus');
}

export default function RepairPartsDetailPage({ direction }: RepairPartsDetailPageProps) {
  const navigate = useNavigate();
  const { entryId } = useParams();
  const config = detailConfig[direction];
  const [entry, setEntry] = useState<RepairMovementEntry | null>(() => (
    entryId ? findRepairMovementEntry(config.storageKey, entryId) : null
  ));
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const activeRepairIns = useMemo(
    () => readRepairMovementEntries(REPAIR_PARTS_IN_COMPLETED_KEY)
      .filter((repairInEntry) => repairInEntry.status !== 'CANCELLED'),
    [],
  );
  const linkedInEntry = useMemo(() => {
    if (!entry || direction !== 'out') return null;
    return activeRepairIns.find(
      (repairInEntry) => getRepairMovementValue(repairInEntry, 'sourceOutEntry') === entry.entryNo,
    ) || null;
  }, [activeRepairIns, direction, entry]);
  const sourceOutEntry = useMemo(() => {
    if (!entry || direction !== 'in') return null;
    const sourceOutEntryNo = getRepairMovementValue(entry, 'sourceOutEntry');
    if (sourceOutEntryNo === '-') return null;
    return findRepairMovementEntry(REPAIR_PARTS_OUT_COMPLETED_KEY, sourceOutEntryNo);
  }, [direction, entry]);

  if (!entry) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(config.backPath)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <EmptyState text={`${config.title} entry not found`} />
      </div>
    );
  }

  const items = parseRepairMovementItems(entry);
  const canOpenCancel = entry.status !== 'CANCELLED' && (direction === 'in' || !linkedInEntry);
  const cannotCancelReason = direction === 'out' && linkedInEntry
    ? `Cannot cancel because it has been received back in ${linkedInEntry.entryNo}`
    : '';
  const statusLabel = getEntryStatusLabel(direction, entry, linkedInEntry);

  const handleCancelEntry = () => {
    const trimmedReason = cancelReason.trim();
    if (!trimmedReason) {
      setCancelError('Please enter a cancellation reason');
      return;
    }

    if (direction === 'out' && linkedInEntry) {
      setCancelError(cannotCancelReason);
      return;
    }

    setIsCancelling(true);
    const cancelledEntry = cancelRepairMovementEntry(config.storageKey, entry.id, trimmedReason);
    setIsCancelling(false);

    if (!cancelledEntry) {
      setCancelError('Failed to cancel this entry');
      return;
    }

    setEntry(cancelledEntry);
    setCancelReason('');
    setCancelError('');
    setIsCancelDialogOpen(false);
    toast.success(`${config.title} entry cancelled`);
  };

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(config.backPath)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{entry.entryNo}</h2>
            <p className="text-muted-foreground">{config.title} entry</p>
          </div>
        </div>

        {entry.status !== 'CANCELLED' && (
          <div className="flex flex-col items-start gap-2 lg:items-end">
            <Button
              variant="outline"
              disabled={!canOpenCancel}
              title={cannotCancelReason}
              className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                setCancelError('');
                setIsCancelDialogOpen(true);
              }}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Cancel Entry
            </Button>
            {cannotCancelReason && (
              <p className="text-sm text-muted-foreground">{cannotCancelReason}</p>
            )}
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Entry Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
          <InfoItem label="Entry No." value={entry.entryNo} />
          <InfoItem
            label={direction === 'out' ? 'Gate Out' : 'Gate In'}
            value={direction === 'out'
              ? buildRepairMovementDateTimeLabel(entry.values.gateOutDate, entry.values.outTime)
              : buildRepairMovementDateTimeLabel(entry.values.gateInDate, entry.values.inTime)}
          />
          <InfoItem label="Security" value={getRepairMovementValue(entry, 'securityName')} />
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <GateStatusBadge status={statusLabel} className="mt-1" />
          </div>
          <InfoItem label="Created" value={formatRepairMovementDateTime(entry.createdAt)} />
          <InfoItem label="Updated" value={formatRepairMovementDateTime(entry.updatedAt)} />
          {entry.status === 'CANCELLED' && (
            <>
              <InfoItem label="Cancel Reason" value={getRepairMovementValue(entry, 'cancelReason')} />
              <InfoItem label="Cancelled At" value={formatStoredTimestamp(entry.values.cancelledAt)} />
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
            <InfoItem label="Vehicle" value={getRepairMovementValue(entry, 'vehicleNo')} />
            <InfoItem label="Driver" value={getRepairMovementValue(entry, 'driverName')} />
            <InfoItem label="Driver Mobile" value={getRepairMovementValue(entry, 'driverMobile')} />
            <InfoItem label="Vehicle Type" value={getRepairMovementValue(entry, 'vehicleType')} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Vendor & Department
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <InfoItem label="Repair Vendor" value={getRepairMovementValue(entry, 'vendorName')} />
            <InfoItem label="Vendor Contact" value={getRepairMovementValue(entry, 'vendorContact')} />
            <InfoItem label="Department" value={getRepairMovementValue(entry, 'department')} />
            <InfoItem label="Maintenance Entry No." value={getRepairMovementValue(entry, 'maintenanceEntryNo')} />
            <InfoItem label="Manual SAP Reference" value={getRepairMovementValue(entry, 'manualSapRef')} />
            <InfoItem label="Requested / Received By" value={
              direction === 'out'
                ? getRepairMovementValue(entry, 'requestedBy')
                : getRepairMovementValue(entry, 'receivedBy')
            } />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5" />
            Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RepairItemsTable items={items} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Repair Details
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            {direction === 'out' ? (
              <>
                <InfoItem label="Repair Purpose" value={getRepairMovementValue(entry, 'repairPurpose')} />
                <InfoItem label="Expected Return" value={formatRepairMovementDate(entry.values.expectedReturnDate)} />
                <InfoItem label="Returnable" value={getRepairMovementValue(entry, 'returnable')} />
                <InfoItem label="Challan No." value={getRepairMovementValue(entry, 'challanNo')} />
                <InfoItem label="E-way Bill No." value={getRepairMovementValue(entry, 'ewayBillNo')} />
                <InfoItem label="Expected Work" value={getRepairMovementValue(entry, 'expectedWork')} />
              </>
            ) : (
              <>
                <InfoItem label="Source Out Entry" value={getRepairMovementValue(entry, 'sourceOutEntry')} />
                <InfoItem label="Source Out Status" value={sourceOutEntry?.status || '-'} />
                <InfoItem label="Vendor Challan No." value={getRepairMovementValue(entry, 'vendorChallanNo')} />
                <InfoItem label="Condition In" value={getRepairMovementValue(entry, 'conditionIn')} />
                <InfoItem label="Repair Status" value={getRepairMovementValue(entry, 'repairStatus')} />
                <InfoItem label="Repair Cost" value={getRepairMovementValue(entry, 'repairCost')} />
              </>
            )}
            <InfoItem label="Remarks" value={getRepairMovementValue(entry, 'remarks')} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5" />
              Linked Movement
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            {direction === 'out' ? (
              <>
                <InfoItem label="Received Back Entry" value={linkedInEntry?.entryNo || ''} />
                <InfoItem
                  label="Received Back At"
                  value={linkedInEntry
                    ? buildRepairMovementDateTimeLabel(
                        linkedInEntry.values.gateInDate,
                        linkedInEntry.values.inTime,
                      )
                    : ''}
                />
              </>
            ) : (
              <>
                <InfoItem label="Source Out Entry" value={sourceOutEntry?.entryNo || ''} />
                <InfoItem
                  label="Source Gate Out"
                  value={sourceOutEntry
                    ? buildRepairMovementDateTimeLabel(
                        sourceOutEntry.values.gateOutDate,
                        sourceOutEntry.values.outTime,
                      )
                    : ''}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel {config.title}</DialogTitle>
            <DialogDescription>
              This keeps the record in history and marks the entry as cancelled.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="repair-cancel-reason">
              Cancellation Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="repair-cancel-reason"
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
              disabled={isCancelling}
            >
              Keep Entry
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleCancelEntry}
              disabled={isCancelling}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {isCancelling ? 'Cancelling...' : 'Cancel Entry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RepairItemsTable({ items }: { items: RepairMovementItem[] }) {
  return (
    <div className="overflow-hidden rounded-md border">
      <div className="max-w-full overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 text-left text-sm font-medium">Item</th>
              <th className="p-3 text-left text-sm font-medium">Serial No.</th>
              <th className="p-3 text-left text-sm font-medium">Qty</th>
              <th className="p-3 text-left text-sm font-medium">UOM</th>
              <th className="p-3 text-left text-sm font-medium">Condition Out</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="h-20 p-3 text-center text-sm text-muted-foreground">
                  No item details found
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-3 text-sm font-medium">{item.itemDescription || '-'}</td>
                  <td className="whitespace-nowrap p-3 text-sm">{item.serialNo || '-'}</td>
                  <td className="whitespace-nowrap p-3 text-sm">{item.qty || '-'}</td>
                  <td className="whitespace-nowrap p-3 text-sm">{item.uom || '-'}</td>
                  <td className="whitespace-nowrap p-3 text-sm">{item.conditionOut || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value && value !== '-' ? value : '-'}</p>
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
