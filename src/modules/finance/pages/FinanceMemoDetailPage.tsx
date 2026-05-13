import { ArrowLeft, FileText, IndianRupee } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  CREDIT_NOTE_KEY,
  type CustomerFlowEntry,
  DEBIT_NOTE_KEY,
  findCustomerFlowEntry,
  formatCustomerFlowTimestamp,
  getCustomerFlowValue,
} from '@/modules/gate/pages/customerSalesFlow/customerSalesFlow.storage';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';

type MemoType = 'credit' | 'debit';

interface FinanceMemoDetailPageProps {
  memoType: MemoType;
}

const memoConfig = {
  credit: {
    title: 'Credit Note',
    backPath: '/finance/credit-notes',
    storageKey: CREDIT_NOTE_KEY,
  },
  debit: {
    title: 'Debit Note',
    backPath: '/finance/debit-notes',
    storageKey: DEBIT_NOTE_KEY,
  },
} satisfies Record<MemoType, { title: string; backPath: string; storageKey: string }>;

export default function FinanceMemoDetailPage({ memoType }: FinanceMemoDetailPageProps) {
  const navigate = useNavigate();
  const { entryId } = useParams();
  const config = memoConfig[memoType];
  const [entry] = useState<CustomerFlowEntry | null>(() => (
    entryId ? findCustomerFlowEntry(config.storageKey, entryId) : null
  ));

  if (!entry) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(config.backPath)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <EmptyState text={`${config.title} not found`} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(config.backPath)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{entry.entryNo}</h2>
          <p className="text-muted-foreground">{config.title}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Memo Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
          <InfoItem label="Entry No." value={entry.entryNo} />
          <InfoItem label="Customer" value={getCustomerFlowValue(entry, 'customerName')} />
          <InfoItem label="Invoice" value={getCustomerFlowValue(entry, 'invoiceNo')} />
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <Badge variant="success" className="mt-1">{entry.status}</Badge>
          </div>
          <InfoItem label="Dispatch Entry" value={getCustomerFlowValue(entry, 'dispatchEntry')} />
          <InfoItem label="Customer Return" value={getCustomerFlowValue(entry, 'customerReturnEntry')} />
          <InfoItem label="SAP Request" value={getCustomerFlowValue(entry, 'sapRequestNo')} />
          <InfoItem label="SAP Note" value={getCustomerFlowValue(entry, 'sapMemoNo')} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IndianRupee className="h-5 w-5" />
            Amount
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
          <InfoItem label="Reason" value={getCustomerFlowValue(entry, 'reason')} />
          <InfoItem label="Base Amount" value={getCustomerFlowValue(entry, 'baseAmount')} />
          <InfoItem label="Tax Amount" value={getCustomerFlowValue(entry, 'taxAmount')} />
          <InfoItem label="Total Amount" value={getCustomerFlowValue(entry, 'totalAmount')} />
          <InfoItem label="Created" value={formatCustomerFlowTimestamp(entry.createdAt)} />
          <InfoItem label="Remarks" value={getCustomerFlowValue(entry, 'remarks')} />
        </CardContent>
      </Card>
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
      {text}
    </div>
  );
}
