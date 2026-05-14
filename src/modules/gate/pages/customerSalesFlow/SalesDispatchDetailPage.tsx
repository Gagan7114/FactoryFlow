import { ArrowLeft, CalendarClock, FileText, PackageCheck, RotateCcw, Scale, ShieldCheck, Truck, XCircle } from 'lucide-react';
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
  CUSTOMER_RETURN_KEY,
  type CustomerFlowEntry,
  findCustomerFlowEntry,
  formatCustomerFlowDateTime,
  formatCustomerFlowTimestamp,
  getCustomerFlowValue,
  readCustomerFlowEntries,
  SALES_DISPATCH_KEY,
  updateCustomerFlowEntry,
} from './customerSalesFlow.storage';

export default function SalesDispatchDetailPage() {
  const navigate = useNavigate();
  const { entryId } = useParams();
  const [entry, setEntry] = useState<CustomerFlowEntry | null>(() => (
    entryId ? findCustomerFlowEntry(SALES_DISPATCH_KEY, entryId) : null
  ));
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  const linkedReturns = useMemo(() => {
    if (!entry) return [];
    return readCustomerFlowEntries(CUSTOMER_RETURN_KEY)
      .filter((returnEntry) => returnEntry.status !== 'CANCELLED')
      .filter((returnEntry) => getCustomerFlowValue(returnEntry, 'dispatchEntry') === entry.entryNo);
  }, [entry]);

  if (!entry) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/gate/sales-dispatch')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <EmptyState text="Sales dispatch entry not found" />
      </div>
    );
  }

  const canCancel = entry.status !== 'CANCELLED' && linkedReturns.length === 0;
  const cannotCancelReason = linkedReturns.length > 0
    ? `Cannot cancel because goods return ${linkedReturns[0].entryNo} is linked`
    : '';

  const handleCancel = () => {
    const trimmedReason = cancelReason.trim();
    if (!trimmedReason) {
      setCancelError('Please enter a cancellation reason');
      return;
    }

    if (!canCancel) {
      setCancelError(cannotCancelReason || 'This dispatch cannot be cancelled');
      return;
    }

    const now = new Date().toISOString();
    const cancelledEntry = updateCustomerFlowEntry(SALES_DISPATCH_KEY, entry.id, (current) => ({
      ...current,
      status: 'CANCELLED',
      values: {
        ...current.values,
        cancelReason: trimmedReason,
        cancelledAt: now,
      },
      updatedAt: now,
    }));

    if (!cancelledEntry) {
      setCancelError('Failed to cancel dispatch');
      return;
    }

    setEntry(cancelledEntry);
    setCancelReason('');
    setCancelError('');
    setIsCancelDialogOpen(false);
    toast.success('Sales dispatch cancelled');
  };

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/gate/sales-dispatch')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{entry.entryNo}</h2>
            <p className="text-muted-foreground">Sales dispatch gate-out entry</p>
          </div>
        </div>

        {entry.status !== 'CANCELLED' && (
          <div className="flex flex-col items-start gap-2 lg:items-end">
            <Button
              variant="outline"
              disabled={!canCancel}
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
            {cannotCancelReason && <p className="text-sm text-muted-foreground">{cannotCancelReason}</p>}
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Weighment
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
          <InfoItem label="Gross Weight" value={getCustomerFlowValue(entry, 'grossWeight')} />
          <InfoItem label="Tare Weight" value={getCustomerFlowValue(entry, 'tareWeight')} />
          <InfoItem label="Net Weight" value={getCustomerFlowValue(entry, 'netWeight')} />
          <InfoItem label="Slip No." value={getCustomerFlowValue(entry, 'weighbridgeSlipNo')} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Dispatch Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
          <InfoItem label="Entry No." value={entry.entryNo} />
          <InfoItem label="Outbound Delivery" value={getCustomerFlowValue(entry, 'outboundDeliveryNo')} />
          <InfoItem label="Sales Order" value={getCustomerFlowValue(entry, 'salesOrderNo')} />
          <InfoBadge label="Status" value={entry.status} />
          <InfoItem label="Gate Out" value={formatCustomerFlowDateTime(entry.values.gateOutDate, entry.values.outTime)} />
          <InfoItem label="PGI Document" value={getCustomerFlowValue(entry, 'pgiDocumentNo')} />
          <InfoBadge
            label="Goods Issue"
            value={getCustomerFlowValue(entry, 'goodsIssuePosted') === 'Yes' ? 'POSTED' : 'PENDING'}
          />
          <InfoItem label="Created" value={formatCustomerFlowTimestamp(entry.createdAt)} />
          {entry.status === 'CANCELLED' && (
            <>
              <InfoItem label="Cancel Reason" value={getCustomerFlowValue(entry, 'cancelReason')} />
              <InfoItem label="Cancelled At" value={getCustomerFlowValue(entry, 'cancelledAt')} />
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
            <InfoItem label="Vehicle" value={getCustomerFlowValue(entry, 'vehicleNo')} />
            <InfoItem label="Driver" value={getCustomerFlowValue(entry, 'driverName')} />
            <InfoItem label="Driver Mobile" value={getCustomerFlowValue(entry, 'driverMobile')} />
            <InfoItem label="Seal No." value={getCustomerFlowValue(entry, 'sealNo')} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Customer & Documents
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <InfoItem label="Customer" value={getCustomerFlowValue(entry, 'customerName')} />
            <InfoItem label="Ship To" value={getCustomerFlowValue(entry, 'shipTo')} />
            <InfoItem label="Invoice" value={getCustomerFlowValue(entry, 'invoiceNo')} />
            <InfoItem label="Delivery Note" value={getCustomerFlowValue(entry, 'deliveryNoteNo')} />
            <InfoItem label="E-way Bill" value={getCustomerFlowValue(entry, 'ewayBillNo')} />
            <InfoItem label="LR No." value={getCustomerFlowValue(entry, 'lrNo')} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5" />
            Dispatch Lines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ItemsTable entry={entry} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Linked Returns
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
          <InfoItem label="Return Count" value={linkedReturns.length} />
          <InfoItem label="Latest Return" value={linkedReturns[0]?.entryNo || ''} />
          <InfoItem label="Remarks" value={getCustomerFlowValue(entry, 'remarks')} />
          <InfoItem label="Attachment Notes" value={getCustomerFlowValue(entry, 'attachmentNotes')} />
        </CardContent>
      </Card>

      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Sales Dispatch</DialogTitle>
            <DialogDescription>
              This keeps the dispatch in history and preserves any linked goods return history.
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
              placeholder="Why is this dispatch being cancelled?"
            />
            {cancelError && <p className="text-sm text-destructive">{cancelError}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsCancelDialogOpen(false)}>
              Keep Entry
            </Button>
            <Button type="button" variant="destructive" onClick={handleCancel}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Cancel Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ItemsTable({ entry }: { entry: CustomerFlowEntry }) {
  return (
    <div className="overflow-hidden rounded-md border">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 text-left text-sm font-medium">Item Code</th>
              <th className="p-3 text-left text-sm font-medium">Item</th>
              <th className="p-3 text-left text-sm font-medium">Order Qty</th>
              <th className="p-3 text-left text-sm font-medium">Dispatch Qty</th>
              <th className="p-3 text-left text-sm font-medium">UOM</th>
            </tr>
          </thead>
          <tbody>
            {entry.items.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="whitespace-nowrap p-3 text-sm">{item.itemCode}</td>
                <td className="p-3 text-sm font-medium">{item.itemName}</td>
                <td className="whitespace-nowrap p-3 text-sm">{item.orderQty}</td>
                <td className="whitespace-nowrap p-3 text-sm">{item.dispatchedQty}</td>
                <td className="whitespace-nowrap p-3 text-sm">{item.uom}</td>
              </tr>
            ))}
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

function InfoBadge({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <GateStatusBadge status={value} className="mt-1" />
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
