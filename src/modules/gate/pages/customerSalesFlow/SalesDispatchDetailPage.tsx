import {
  ArrowLeft,
  CalendarClock,
  FileText,
  PackageCheck,
  Printer,
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
  useCancelSalesDispatchGateOut,
  useCommitSalesDispatchGatePassPrint,
  useRejectSalesDispatchGateOut,
  useSalesDispatchGateOut,
} from '@/modules/gate/api';
import {
  Badge,
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

function getApiErrorMessage(error: unknown, fallback: string) {
  const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
  return detail || fallback;
}

function statusVariant(status: string) {
  if (status === 'COMPLETED') return 'success';
  if (status === 'CANCELLED' || status === 'REJECTED') return 'destructive';
  return 'warning';
}

export default function SalesDispatchDetailPage() {
  const navigate = useNavigate();
  const { entryId } = useParams();
  const id = Number(entryId || 0) || null;
  const { data: entry, isLoading } = useSalesDispatchGateOut(id);
  const cancelMutation = useCancelSalesDispatchGateOut();
  const rejectMutation = useRejectSalesDispatchGateOut();
  const commitMutation = useCommitSalesDispatchGatePassPrint();
  const [dialogAction, setDialogAction] = useState<'cancel' | 'reject' | null>(null);
  const [reason, setReason] = useState('');
  const [actionError, setActionError] = useState('');

  const handleAction = async () => {
    if (!entry || !dialogAction) return;
    if (!reason.trim()) {
      setActionError('Please enter a reason');
      return;
    }

    try {
      if (dialogAction === 'cancel') {
        await cancelMutation.mutateAsync({ id: entry.id, data: { reason } });
        toast.success('Sales dispatch cancelled');
      } else {
        await rejectMutation.mutateAsync({ id: entry.id, data: { reason } });
        toast.success('Sales dispatch rejected');
      }
      setDialogAction(null);
      setReason('');
      setActionError('');
    } catch (apiError) {
      setActionError(getApiErrorMessage(apiError, 'Failed to update sales dispatch.'));
    }
  };

  const handleCommitPrint = async () => {
    if (!entry) return;
    try {
      await commitMutation.mutateAsync(entry.id);
      toast.success('Printed gate pass committed');
      window.print();
    } catch (apiError) {
      toast.error(getApiErrorMessage(apiError, 'Failed to commit printed gate pass.'));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/gate/sales-dispatch')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <EmptyState text="Loading sales dispatch entry..." />
      </div>
    );
  }

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

  const canCancel = entry.status === 'IN_PROGRESS' && !entry.print_commit;
  const canReject = !entry.print_commit && !['CANCELLED', 'REJECTED'].includes(entry.status);
  const canCommitPrint = entry.status === 'COMPLETED' && !entry.print_commit;

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/gate/sales-dispatch')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{entry.entry_no}</h2>
            <p className="text-muted-foreground">Sales dispatch gate-out entry</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {entry.status === 'IN_PROGRESS' ? (
            <Button variant="outline" onClick={() => navigate(`/gate/sales-dispatch/new?entryId=${entry.id}`)}>
              Continue Entry
            </Button>
          ) : null}
          {canCommitPrint ? (
            <Button onClick={handleCommitPrint} disabled={commitMutation.isPending}>
              <Printer className="mr-2 h-4 w-4" />
              Commit Printed Gate Pass
            </Button>
          ) : null}
          {canReject ? (
            <Button
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                setDialogAction('reject');
                setReason('');
                setActionError('');
              }}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject Invoice
            </Button>
          ) : null}
          {canCancel ? (
            <Button
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                setDialogAction('cancel');
                setReason('');
                setActionError('');
              }}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Cancel Entry
            </Button>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Dispatch Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
          <InfoItem label="Entry No." value={entry.entry_no} />
          <InfoItem label="SAP Invoice" value={entry.sap_invoice_doc_num || entry.sap_invoice_doc_entry} />
          <InfoItem label="Customer" value={entry.customer_name} />
          <InfoBadge label="Status" value={entry.status} variant={statusVariant(entry.status)} />
          <InfoItem label="Gate Out" value={`${entry.gate_out_date} ${entry.out_time?.slice(0, 5)}`} />
          <InfoItem label="PGI Document" value={entry.pgi_document_no} />
          <InfoBadge label="Goods Issue" value={entry.goods_issue_posted ? 'POSTED' : 'PENDING'} variant={entry.goods_issue_posted ? 'success' : 'warning'} />
          <InfoItem label="Print Commit" value={entry.print_commit ? 'Committed' : 'Pending'} />
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
            <InfoItem label="Vehicle Type" value={entry.vehicle_type} />
            <InfoItem label="Driver" value={entry.driver_name} />
            <InfoItem label="Driver Mobile" value={entry.driver_mobile} />
            <InfoItem label="Transporter" value={entry.transporter_name} />
            <InfoItem label="Seal No." value={entry.seal_no} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Documents
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <InfoItem label="Ship To" value={entry.ship_to_address} />
            <InfoItem label="Invoice Amount" value={entry.invoice_amount} />
            <InfoItem label="Invoice Checked" value={entry.invoice_checked ? 'Yes' : 'No'} />
            <InfoItem label="Delivery Note Checked" value={entry.delivery_note_checked ? 'Yes' : 'No'} />
            <InfoItem label="E-way Bill Checked" value={entry.eway_bill_checked ? 'Yes' : 'No'} />
            <InfoItem label="LR Checked" value={entry.lr_checked ? 'Yes' : 'No'} />
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
          <InfoItem label="Gross Weight" value={entry.gross_weight} />
          <InfoItem label="Tare Weight" value={entry.tare_weight} />
          <InfoItem label="Net Weight" value={entry.net_weight} />
          <InfoItem label="SAP Weight" value={entry.sap_weight} />
          <InfoItem label="Variance" value={entry.weight_variance} />
          <InfoItem label="Slip No." value={entry.weighbridge_slip_no} />
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
          <ItemsTable entry={entry} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Gate Pass
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
          <InfoItem label="Gate Pass No." value={entry.gatepass_no} />
          <InfoItem label="Gate Pass Code" value={entry.gatepass_code} />
          <InfoItem label="QR Payload" value={entry.qr_payload} />
          <InfoItem label="Printed At" value={entry.printed_at} />
          <InfoItem label="Committed At" value={entry.committed_at} />
          <InfoItem label="Dock Photo" value={entry.dock_photo ? 'Uploaded' : 'Missing'} />
          <InfoItem label="Gatepass Document" value={entry.gatepass_document ? 'Uploaded' : 'Missing'} />
          <InfoItem label="Remarks" value={entry.remarks} />
          {entry.status === 'CANCELLED' ? <InfoItem label="Cancel Reason" value={entry.cancel_reason} /> : null}
          {entry.status === 'REJECTED' ? <InfoItem label="Reject Reason" value={entry.rejected_reason} /> : null}
        </CardContent>
      </Card>

      <Dialog open={Boolean(dialogAction)} onOpenChange={(open) => !open && setDialogAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogAction === 'reject' ? 'Reject Sales Invoice' : 'Cancel Sales Dispatch'}</DialogTitle>
            <DialogDescription>
              {dialogAction === 'reject'
                ? 'Rejecting keeps the invoice out of gate-pass commit so dispatch can correct it.'
                : 'Cancelling closes this in-progress gate entry and keeps the history.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="sales-dispatch-action-reason">Reason</Label>
            <Textarea
              id="sales-dispatch-action-reason"
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                setActionError('');
              }}
              placeholder="Enter reason"
            />
            {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogAction(null)}>
              Keep Entry
            </Button>
            <Button type="button" variant="destructive" onClick={handleAction} disabled={cancelMutation.isPending || rejectMutation.isPending}>
              {dialogAction === 'reject' ? <XCircle className="mr-2 h-4 w-4" /> : <RotateCcw className="mr-2 h-4 w-4" />}
              {dialogAction === 'reject' ? 'Reject Invoice' : 'Cancel Entry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ItemsTable({ entry }: { entry: SalesDispatchGateOut }) {
  return (
    <div className="overflow-hidden rounded-md border">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 text-left text-sm font-medium">Reference</th>
              <th className="p-3 text-left text-sm font-medium">Item</th>
              <th className="p-3 text-left text-sm font-medium">Order Qty</th>
              <th className="p-3 text-left text-sm font-medium">Dispatch Qty</th>
              <th className="p-3 text-left text-sm font-medium">UOM</th>
            </tr>
          </thead>
          <tbody>
            {entry.items.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="whitespace-nowrap p-3 text-sm">{item.item_code}</td>
                <td className="p-3 text-sm font-medium">{item.item_name}</td>
                <td className="whitespace-nowrap p-3 text-sm">{item.order_qty}</td>
                <td className="whitespace-nowrap p-3 text-sm">{item.dispatched_qty}</td>
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
      <p className="mt-1 break-words font-medium">{value && value !== '-' ? value : '-'}</p>
    </div>
  );
}

function InfoBadge({
  label,
  value,
  variant,
}: {
  label: string;
  value: string;
  variant: 'success' | 'warning' | 'destructive';
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <Badge variant={variant} className="mt-1">
        {value}
      </Badge>
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
