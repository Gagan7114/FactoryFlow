import { FileText, IndianRupee } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import {
  buildCustomerFlowEntryNo,
  CREDIT_NOTE_KEY,
  type CustomerFlowEntry,
  DEBIT_NOTE_KEY,
  getCreditableReturnEntries,
  getCustomerFlowValue,
  getAvailableDispatchSources,
  saveCustomerFlowEntry,
} from '@/modules/gate/pages/customerSalesFlow/customerSalesFlow.storage';
import { Button, Input, Label, NativeSelect, SelectOption, Textarea } from '@/shared/components/ui';

type MemoType = 'credit' | 'debit';

interface FinanceMemoNewPageProps {
  memoType: MemoType;
}

const memoConfig = {
  credit: {
    title: 'New Credit Note',
    backPath: '/finance/credit-notes',
    storageKey: CREDIT_NOTE_KEY,
    entryPrefix: 'CRN',
    sourceLabel: 'Verified Customer Return',
    sourcePlaceholder: 'Select QC-verified return',
    reasonPlaceholder: 'Damaged goods accepted by QC',
  },
  debit: {
    title: 'New Debit Note',
    backPath: '/finance/debit-notes',
    storageKey: DEBIT_NOTE_KEY,
    entryPrefix: 'DBN',
    sourceLabel: 'Sales Dispatch',
    sourcePlaceholder: 'Select sales dispatch',
    reasonPlaceholder: 'Missed freight',
  },
} satisfies Record<MemoType, {
  title: string;
  backPath: string;
  storageKey: string;
  entryPrefix: string;
  sourceLabel: string;
  sourcePlaceholder: string;
  reasonPlaceholder: string;
}>;

export default function FinanceMemoNewPage({ memoType }: FinanceMemoNewPageProps) {
  const navigate = useNavigate();
  const config = memoConfig[memoType];
  const [sourceId, setSourceId] = useState('');
  const [reason, setReason] = useState(memoType === 'credit' ? 'Damaged goods accepted by QC' : 'Missed freight');
  const [baseAmount, setBaseAmount] = useState('');
  const [taxAmount, setTaxAmount] = useState('');
  const [sapRequestNo, setSapRequestNo] = useState('');
  const [sapMemoNo, setSapMemoNo] = useState('');
  const [remarks, setRemarks] = useState('');
  const [formError, setFormError] = useState('');

  const sources = useMemo(
    () => memoType === 'credit'
      ? getCreditableReturnEntries()
      : getAvailableDispatchSources(),
    [memoType],
  );
  const selectedSource = sources.find((entry) => entry.id === sourceId) || null;
  const totalAmount = (Number(baseAmount || 0) + Number(taxAmount || 0)).toFixed(2);

  const handleCreate = () => {
    if (!selectedSource) {
      setFormError(`Please select the ${config.sourceLabel.toLowerCase()}`);
      return;
    }

    if (!reason.trim()) {
      setFormError('Please enter the memo reason');
      return;
    }

    if (Number(baseAmount || 0) <= 0) {
      setFormError('Please enter the base amount');
      return;
    }

    const now = new Date().toISOString();
    const entry: CustomerFlowEntry = {
      id: now,
      entryNo: buildCustomerFlowEntryNo(config.entryPrefix),
      status: 'POSTED',
      values: {
        customerCode: getCustomerFlowValue(selectedSource, 'customerCode'),
        customerName: getCustomerFlowValue(selectedSource, 'customerName'),
        invoiceNo: getCustomerFlowValue(selectedSource, 'invoiceNo'),
        dispatchEntry: memoType === 'credit'
          ? getCustomerFlowValue(selectedSource, 'dispatchEntry')
          : selectedSource.entryNo,
        customerReturnEntry: memoType === 'credit' ? selectedSource.entryNo : '',
        reason: reason.trim(),
        baseAmount,
        taxAmount,
        totalAmount,
        sapRequestNo,
        sapMemoNo,
        remarks,
      },
      items: selectedSource.items,
      createdAt: now,
      updatedAt: now,
    };

    saveCustomerFlowEntry(config.storageKey, entry);
    toast.success(`${memoType === 'credit' ? 'Credit' : 'Debit'} note created`);
    navigate(config.backPath);
  };

  return (
    <div className="space-y-6 pb-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{config.title}</h2>
        <p className="text-muted-foreground">
          {memoType === 'credit'
            ? 'Reduce customer receivable for accepted returned goods'
            : 'Increase customer receivable for missed freight or additional charges'}
        </p>
      </div>

      {formError && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {formError}
        </div>
      )}

      <section className="space-y-4 border-t pt-6 first:border-t-0 first:pt-0">
        <h3 className="flex items-center gap-2 text-xl font-semibold">
          <FileText className="h-5 w-5" />
          Source Document
        </h3>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="finance-source">
              {config.sourceLabel} <span className="text-destructive">*</span>
            </Label>
            <NativeSelect
              id="finance-source"
              value={sourceId}
              placeholder={sources.length ? config.sourcePlaceholder : 'No source documents available'}
              onChange={(event) => {
                setSourceId(event.target.value);
                setFormError('');
              }}
            >
              {sources.map((source) => (
                <SelectOption key={source.id} value={source.id}>
                  {[
                    source.entryNo,
                    getCustomerFlowValue(source, 'invoiceNo'),
                    getCustomerFlowValue(source, 'customerName'),
                  ].join(' - ')}
                </SelectOption>
              ))}
            </NativeSelect>
          </div>
          <ReadOnlyText label="Customer" value={selectedSource ? getCustomerFlowValue(selectedSource, 'customerName') : ''} />
          <ReadOnlyText label="Invoice" value={selectedSource ? getCustomerFlowValue(selectedSource, 'invoiceNo') : ''} />
        </div>
      </section>

      <section className="space-y-4 border-t pt-6">
        <h3 className="flex items-center gap-2 text-xl font-semibold">
          <IndianRupee className="h-5 w-5" />
          Memo Amount
        </h3>
        <div className="grid gap-4 lg:grid-cols-2">
          <TextField id="finance-reason" label="Reason" value={reason} onChange={setReason} placeholder={config.reasonPlaceholder} />
          <TextField id="finance-base" label="Base Amount" value={baseAmount} onChange={setBaseAmount} type="number" />
          <TextField id="finance-tax" label="Tax Amount" value={taxAmount} onChange={setTaxAmount} type="number" />
          <ReadOnlyText label="Total Amount" value={totalAmount} />
          <TextField id="finance-request" label="SAP Memo Request No." value={sapRequestNo} onChange={setSapRequestNo} />
          <TextField id="finance-memo" label="SAP Note No." value={sapMemoNo} onChange={setSapMemoNo} />
          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="finance-remarks">Remarks</Label>
            <Textarea id="finance-remarks" value={remarks} onChange={(event) => setRemarks(event.target.value)} />
          </div>
        </div>
      </section>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate(config.backPath)}>Cancel</Button>
        <Button onClick={handleCreate}>Create {memoType === 'credit' ? 'Credit' : 'Debit'} Note</Button>
      </div>
    </div>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'number';
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        min={type === 'number' ? '0' : undefined}
        step={type === 'number' ? '0.01' : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function ReadOnlyText({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value || '-'} readOnly disabled className="bg-muted/40 text-foreground disabled:opacity-100" />
    </div>
  );
}
