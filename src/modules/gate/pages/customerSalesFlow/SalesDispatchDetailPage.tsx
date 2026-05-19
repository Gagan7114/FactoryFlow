import {
  ArrowLeft,
  CalendarClock,
  FileText,
  PackageCheck,
  Paperclip,
  RotateCcw,
  Scale,
  ShieldCheck,
  Truck,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import {
  type SalesDispatchGateOut,
  type SalesDispatchItem,
  useCancelSalesDispatch,
  useSalesDispatch,
  useWeighment,
} from '@/modules/gate/api';
import { GateStatusBadge, StepLoadingSpinner } from '@/modules/gate/components';
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
import { getErrorMessage, resolveFileUrl } from '@/shared/utils';

import {
  buildEntryDocumentLabel,
  formatDateTime,
  formatTimestamp,
  formatValue,
} from './salesDispatchFlow.helpers';

export default function SalesDispatchDetailPage() {
  const navigate = useNavigate();
  const { entryId } = useParams();
  const id = Number(entryId || 0) || null;
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  const {
    data: entry,
    isLoading,
    error,
    refetch,
  } = useSalesDispatch(id);
  const { data: weighment } = useWeighment(entry?.vehicle_entry || null);
  const cancelSalesDispatch = useCancelSalesDispatch();

  const canCancel = entry
    ? !['PRINT_COMMITTED', 'DISPATCHED', 'CANCELLED', 'REJECTED'].includes(entry.status)
    : false;

  const handleCancel = async () => {
    if (!entry) return;

    const trimmedReason = cancelReason.trim();
    if (!trimmedReason) {
      setCancelError('Please enter a cancellation reason');
      return;
    }

    try {
      await cancelSalesDispatch.mutateAsync({
        id: entry.id,
        data: { reason: trimmedReason },
      });
      await refetch();
      setCancelReason('');
      setCancelError('');
      setIsCancelDialogOpen(false);
      toast.success('Docking entry cancelled');
    } catch (cancelErrorValue) {
      setCancelError(getErrorMessage(cancelErrorValue, 'Failed to cancel Docking entry'));
    }
  };

  if (isLoading) {
    return <StepLoadingSpinner />;
  }

  if (!entry) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/gate/sales-dispatch')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <EmptyState text={error ? getErrorMessage(error, 'Docking entry not found') : 'Docking entry not found'} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/gate/sales-dispatch')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{entry.entry_no}</h2>
            <p className="text-muted-foreground">Docking gate-out entry</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/gate/sales-dispatch/new?entryId=${entry.vehicle_entry}`)}
          >
            Resume Flow
          </Button>
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
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Docking Summary
          </CardTitle>
          <GateStatusBadge status={entry.status} />
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
          <InfoItem label="Entry No." value={entry.entry_no} />
          <InfoItem label="Vehicle Entry" value={entry.vehicle_entry_no} />
          <InfoItem label="SAP Document" value={buildEntryDocumentLabel(entry)} />
          <InfoItem label="Document Type" value={entry.document_type} />
          <InfoItem label="Gate Out" value={formatDateTime(entry.gate_out_date, entry.out_time)} />
          <InfoItem label="Gatepass No." value={entry.gatepass_no} />
          <InfoItem label="Created" value={formatTimestamp(entry.created_at)} />
          <InfoItem label="Updated" value={formatTimestamp(entry.updated_at)} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Vehicle & Driver
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <InfoItem label="Vehicle" value={entry.vehicle_no} />
            <InfoItem label="Transporter" value={entry.transporter_name} />
            <InfoItem label="Driver" value={entry.driver_name} />
            <InfoItem label="Driver Mobile" value={entry.driver_mobile_no} />
            <InfoItem label="Bilty / LR" value={entry.bilty_no} />
            <InfoItem label="Security" value={entry.security_name} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Customer & SAP
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <InfoItem label="Customer" value={entry.customer_name} />
            <InfoItem label="Ship To" value={entry.ship_to_address || entry.warehouses} />
            <InfoItem label="E-way Bill" value={entry.eway_bill} />
            <InfoItem label="GSTIN" value={entry.bp_gstin} />
            <InfoItem label="From Warehouse" value={entry.from_warehouse} />
            <InfoItem label="To Warehouse" value={entry.to_warehouse} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Weighment
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
          <InfoItem label="Gross Weight" value={weighment?.gross_weight || entry.gross_weight} />
          <InfoItem label="Tare Weight" value={weighment?.tare_weight || entry.tare_weight} />
          <InfoItem label="Net Weight" value={weighment?.net_weight || entry.net_weight} />
          <InfoItem label="Slip No." value={weighment?.weighbridge_slip_no} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5" />
            Dispatch Lines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ItemsTable items={entry.items} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Paperclip className="h-5 w-5" />
            Attachments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {entry.attachments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attachments uploaded</p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {entry.attachments.map((attachment) => (
                <a
                  key={attachment.id}
                  href={resolveFileUrl(attachment.file)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md border p-3 text-sm hover:bg-muted/50"
                >
                  <div className="font-medium">{attachment.original_filename || 'Attachment'}</div>
                  <div className="text-xs text-muted-foreground">{attachment.attachment_type}</div>
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Finalization
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
          <InfoItem label="Printed At" value={formatTimestamp(entry.printed_at)} />
          <InfoItem label="Print Committed At" value={formatTimestamp(entry.print_committed_at)} />
          <InfoItem label="Dispatched At" value={formatTimestamp(entry.dispatched_at)} />
          <InfoItem label="Remarks" value={entry.remarks} />
          {entry.status === 'CANCELLED' && (
            <>
              <InfoItem label="Cancel Reason" value={entry.cancel_reason} />
              <InfoItem label="Cancelled At" value={formatTimestamp(entry.cancelled_at)} />
            </>
          )}
          {entry.status === 'REJECTED' && (
            <>
              <InfoItem label="Reject Reason" value={entry.reject_reason} />
              <InfoItem label="Rejected At" value={formatTimestamp(entry.rejected_at)} />
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Docking Entry</DialogTitle>
            <DialogDescription>
              This cancels the Docking entry and releases the SAP document for a fresh entry.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="sales-dispatch-cancel-reason">
              Cancellation Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="sales-dispatch-cancel-reason"
              value={cancelReason}
              onChange={(event) => {
                setCancelReason(event.target.value);
                setCancelError('');
              }}
              placeholder="Why is this Docking entry being cancelled?"
            />
            {cancelError && <p className="text-sm text-destructive">{cancelError}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsCancelDialogOpen(false)}>
              Keep Entry
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleCancel}
              disabled={cancelSalesDispatch.isPending}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {cancelSalesDispatch.isPending ? 'Cancelling...' : 'Cancel Entry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ItemsTable({ items }: { items: SalesDispatchItem[] }) {
  return (
    <div className="overflow-hidden rounded-md border">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px]">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 text-left text-sm font-medium">Item Code</th>
              <th className="p-3 text-left text-sm font-medium">Item</th>
              <th className="p-3 text-left text-sm font-medium">Quantity</th>
              <th className="p-3 text-left text-sm font-medium">UOM</th>
              <th className="p-3 text-left text-sm font-medium">Warehouse</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="h-20 p-3 text-center text-sm text-muted-foreground">
                  No document lines found
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="whitespace-nowrap p-3 text-sm">{item.item_code}</td>
                  <td className="p-3 text-sm font-medium">{item.item_name}</td>
                  <td className="whitespace-nowrap p-3 text-sm">{item.quantity}</td>
                  <td className="whitespace-nowrap p-3 text-sm">{item.uom}</td>
                  <td className="whitespace-nowrap p-3 text-sm">
                    {item.warehouse_code || item.from_warehouse || item.to_warehouse || '-'}
                  </td>
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
      <p className="mt-1 font-medium">{formatValue(value)}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-24 items-center justify-center rounded-lg border text-sm text-muted-foreground">
      {text}
    </div>
  );
}
