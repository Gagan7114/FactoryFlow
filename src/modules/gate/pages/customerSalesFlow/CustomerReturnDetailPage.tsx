import { ArrowLeft, FileText, PackageX, Truck } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';

import {
  CUSTOMER_RETURN_KEY,
  type CustomerFlowEntry,
  findCustomerFlowEntry,
  formatCustomerFlowDateTime,
  formatCustomerFlowTimestamp,
  getCustomerFlowValue,
  getCustomerReturnStatusLabel,
} from './customerSalesFlow.storage';

export default function CustomerReturnDetailPage() {
  const navigate = useNavigate();
  const { entryId } = useParams();
  const [entry] = useState<CustomerFlowEntry | null>(() => (
    entryId ? findCustomerFlowEntry(CUSTOMER_RETURN_KEY, entryId) : null
  ));

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
                    <Badge variant="success">Accepted</Badge>
                  ) : Number(item.rejectedQty || 0) > 0 ? (
                    <Badge variant="destructive">Rejected</Badge>
                  ) : (
                    <Badge variant="outline">Pending</Badge>
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
  if (entry.status === 'PENDING_QC' || entry.status === 'IN_PROGRESS') {
    return <Badge variant="warning" className="mt-1">{getCustomerReturnStatusLabel(entry)}</Badge>;
  }
  if (entry.status === 'QC_REJECTED' || entry.status === 'CANCELLED') {
    return <Badge variant="destructive" className="mt-1">{getCustomerReturnStatusLabel(entry)}</Badge>;
  }
  return <Badge variant="success" className="mt-1">{getCustomerReturnStatusLabel(entry)}</Badge>;
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
