import { ArrowLeft, FileCheck, FileText, PackageX, Save, Truck } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { GateStatusBadge } from '@/modules/gate/components';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
} from '@/shared/components/ui';

import {
  CUSTOMER_RETURN_KEY,
  type CustomerFlowEntry,
  findCustomerFlowEntry,
  formatCustomerFlowDateTime,
  formatCustomerFlowTimestamp,
  getCustomerFlowRawValue,
  getCustomerFlowValue,
  getCustomerReturnStatusLabel,
  updateCustomerFlowEntry,
} from './customerSalesFlow.storage';

export default function CustomerReturnDetailPage() {
  const navigate = useNavigate();
  const { entryId } = useParams();
  const [entry, setEntry] = useState<CustomerFlowEntry | null>(() => (
    entryId ? findCustomerFlowEntry(CUSTOMER_RETURN_KEY, entryId) : null
  ));
  const [sapGrDocNo, setSapGrDocNo] = useState(() => (
    entry ? getCustomerFlowRawValue(entry, 'sapCustomerReturnDocNo') : ''
  ));
  const [sapGrDocDate, setSapGrDocDate] = useState(() => (
    entry ? getCustomerFlowRawValue(entry, 'sapCustomerReturnDocDate') : ''
  ));
  const [sapGrReference, setSapGrReference] = useState(() => (
    entry ? getCustomerFlowRawValue(entry, 'sapCustomerReturnReference') : ''
  ));
  const [sapGrNotes, setSapGrNotes] = useState(() => (
    entry ? getCustomerFlowRawValue(entry, 'sapCustomerReturnNotes') : ''
  ));
  const [formError, setFormError] = useState('');

  if (!entry) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/gate/customer-return')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <EmptyState text="Customer return entry not found" />
      </div>
    );
  }

  const isSapGrPending = entry.status === 'PENDING_SAP_GR';

  const handleMarkSapGrDone = () => {
    if (!sapGrDocNo.trim()) {
      setFormError('SAP customer return / GR document number is required');
      return;
    }

    const now = new Date().toISOString();
    const updatedEntry = updateCustomerFlowEntry(CUSTOMER_RETURN_KEY, entry.id, (current) => ({
      ...current,
      status: 'COMPLETED',
      values: {
        ...current.values,
        sapCustomerReturnDocNo: sapGrDocNo.trim(),
        sapCustomerReturnDocDate: sapGrDocDate,
        sapCustomerReturnReference: sapGrReference.trim(),
        sapCustomerReturnNotes: sapGrNotes.trim(),
        sapCustomerReturnPostedAt: now,
      },
      updatedAt: now,
    }));

    if (!updatedEntry) {
      setFormError('Failed to save SAP GR details');
      return;
    }

    setEntry(updatedEntry);
    setFormError('');
    toast.success('Customer return marked complete after SAP GR');
  };

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/gate/customer-return')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{entry.entryNo}</h2>
          <p className="text-muted-foreground">Customer return gate-in entry</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Return Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
          <InfoItem label="Entry No." value={entry.entryNo} />
          <InfoItem label="Source Dispatch" value={getCustomerFlowValue(entry, 'dispatchEntry')} />
          <InfoItem label="Invoice" value={getCustomerFlowValue(entry, 'invoiceNo')} />
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <StatusBadge entry={entry} />
          </div>
          <InfoItem label="Gate In" value={formatCustomerFlowDateTime(entry.values.gateInDate, entry.values.inTime)} />
          <InfoItem label="Customer" value={getCustomerFlowValue(entry, 'customerName')} />
          <InfoItem label="Claim No." value={getCustomerFlowValue(entry, 'customerClaimNo')} />
          <InfoItem label="Created" value={formatCustomerFlowTimestamp(entry.createdAt)} />
        </CardContent>
      </Card>

      {formError && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {formError}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            SAP Customer Return / GR
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isSapGrPending ? (
            <>
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="customer-return-sap-gr-doc">
                    SAP Document No. <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="customer-return-sap-gr-doc"
                    value={sapGrDocNo}
                    onChange={(event) => {
                      setSapGrDocNo(event.target.value);
                      setFormError('');
                    }}
                    placeholder="SAP customer return / GR no."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer-return-sap-gr-date">SAP Doc Date</Label>
                  <Input
                    id="customer-return-sap-gr-date"
                    type="date"
                    value={sapGrDocDate}
                    onChange={(event) => setSapGrDocDate(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer-return-sap-gr-reference">Reference</Label>
                  <Input
                    id="customer-return-sap-gr-reference"
                    value={sapGrReference}
                    onChange={(event) => setSapGrReference(event.target.value)}
                    placeholder="Optional SAP reference"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-return-sap-gr-notes">Notes</Label>
                <Textarea
                  id="customer-return-sap-gr-notes"
                  value={sapGrNotes}
                  onChange={(event) => setSapGrNotes(event.target.value)}
                  placeholder="Posting notes, GR remarks, or SAP comments"
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleMarkSapGrDone}>
                  <Save className="mr-2 h-4 w-4" />
                  Mark SAP GR Done
                </Button>
              </div>
            </>
          ) : (
            <div className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
              <InfoItem label="SAP Document No." value={getCustomerFlowValue(entry, 'sapCustomerReturnDocNo')} />
              <InfoItem label="SAP Doc Date" value={getCustomerFlowValue(entry, 'sapCustomerReturnDocDate')} />
              <InfoItem label="Reference" value={getCustomerFlowValue(entry, 'sapCustomerReturnReference')} />
              <InfoItem label="Notes" value={getCustomerFlowValue(entry, 'sapCustomerReturnNotes')} />
              <InfoItem label="Posted At" value={formatCustomerFlowTimestamp(getCustomerFlowRawValue(entry, 'sapCustomerReturnPostedAt'))} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Vehicle & Driver
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
          <InfoItem label="Vehicle" value={getCustomerFlowValue(entry, 'vehicleNo')} />
          <InfoItem label="Driver" value={getCustomerFlowValue(entry, 'driverName')} />
          <InfoItem label="Driver Mobile" value={getCustomerFlowValue(entry, 'driverMobile')} />
          <InfoItem label="Security" value={getCustomerFlowValue(entry, 'securityName')} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageX className="h-5 w-5" />
            Returned Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ItemsTable entry={entry} />
        </CardContent>
      </Card>
    </div>
  );
}

function ItemsTable({ entry }: { entry: CustomerFlowEntry }) {
  return (
    <div className="overflow-hidden rounded-md border">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px]">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 text-left text-sm font-medium">Item</th>
              <th className="p-3 text-left text-sm font-medium">Dispatch Qty</th>
              <th className="p-3 text-left text-sm font-medium">Return Qty</th>
              <th className="p-3 text-left text-sm font-medium">QC Result</th>
              <th className="p-3 text-left text-sm font-medium">Reason</th>
              <th className="p-3 text-left text-sm font-medium">Condition</th>
            </tr>
          </thead>
          <tbody>
            {entry.items.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="p-3 text-sm">
                  <div className="font-medium">{item.itemName}</div>
                  <div className="text-xs text-muted-foreground">{item.itemCode}</div>
                </td>
                <td className="whitespace-nowrap p-3 text-sm">{item.dispatchedQty} {item.uom}</td>
                <td className="whitespace-nowrap p-3 text-sm">{item.returnQty} {item.uom}</td>
                <td className="whitespace-nowrap p-3 text-sm">
                  {Number(item.acceptedQty || 0) > 0 ? (
                    <GateStatusBadge status="ACCEPTED" label="Accepted" />
                  ) : Number(item.rejectedQty || 0) > 0 ? (
                    <GateStatusBadge status="REJECTED" label="Rejected" />
                  ) : (
                    <GateStatusBadge status="PENDING" label="Pending" />
                  )}
                </td>
                <td className="p-3 text-sm">{item.reason || '-'}</td>
                <td className="p-3 text-sm">{item.condition || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ entry }: { entry: CustomerFlowEntry }) {
  return (
    <GateStatusBadge
      status={entry.status}
      label={getCustomerReturnStatusLabel(entry)}
      className="mt-1"
    />
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
      {text}
    </div>
  );
}
