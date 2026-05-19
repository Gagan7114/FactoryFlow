import { AlertCircle, CheckCircle2, FileText, Printer, QrCode, Send, Truck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import {
  type SalesDispatchGateOut,
  useCommitSalesDispatchPrint,
  useMarkSalesDispatchDispatched,
  usePreviewSalesDispatchGatepass,
  usePrintSalesDispatchGatepass,
  useSalesDispatchByVehicleEntry,
  useWeighment,
} from '@/modules/gate/api';
import { GateStatusBadge, StepFooter, StepHeader, StepLoadingSpinner } from '@/modules/gate/components';
import { useEntryId } from '@/modules/gate/hooks';
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
import { getErrorMessage } from '@/shared/utils';

import {
  DOCKING_TOTAL_STEPS,
  formatDateTime,
  formatTimestamp,
  formatValue,
  summarizeSalesDispatchItems,
} from './salesDispatchFlow.helpers';

interface GatepassDraft {
  uom: string;
  physicalQuantity: string;
  sealNumber: string;
  pgiReference: string;
  ewayBill: string;
}

function buildDraft(entry?: SalesDispatchGateOut | null): GatepassDraft {
  return {
    uom: entry?.uom || '',
    physicalQuantity: entry?.physical_quantity || '',
    sealNumber: entry?.seal_number || '',
    pgiReference: entry?.pgi_reference || '',
    ewayBill: entry?.eway_bill || '',
  };
}

export default function SalesDispatchGatepassPage() {
  const navigate = useNavigate();
  const { entryId, entryIdNumber } = useEntryId();
  const [draft, setDraft] = useState<GatepassDraft>(() => buildDraft());
  const [error, setError] = useState('');

  const {
    data: entry,
    isLoading: isEntryLoading,
    error: entryError,
    refetch,
  } = useSalesDispatchByVehicleEntry(entryIdNumber);
  const { data: weighment } = useWeighment(entryIdNumber);
  const previewGatepass = usePreviewSalesDispatchGatepass();
  const printGatepass = usePrintSalesDispatchGatepass();
  const commitPrint = useCommitSalesDispatchPrint();
  const markDispatched = useMarkSalesDispatchDispatched();

  useEffect(() => {
    if (!entry) return;

    setDraft(buildDraft(entry));
  }, [entry]);

  const isSaving = previewGatepass.isPending
    || printGatepass.isPending
    || commitPrint.isPending
    || markDispatched.isPending;
  const readiness = entry?.gatepass_readiness;
  const action = useMemo(() => getNextAction(entry), [entry]);

  const updateDraft = <K extends keyof GatepassDraft>(key: K, value: GatepassDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setError('');
  };

  const handlePreview = async () => {
    if (!entry) return;

    try {
      await previewGatepass.mutateAsync(entry.id);
      await refetch();
      toast.success('Gatepass readiness refreshed');
    } catch (previewError) {
      setError(getErrorMessage(previewError, 'Failed to refresh gatepass readiness'));
    }
  };

  const handlePrintGatepass = async () => {
    if (!entry) return;

    if (!entry.gatepass_readiness.ready) {
      setError(buildReadinessError(entry));
      return;
    }

    try {
      await printGatepass.mutateAsync({
        id: entry.id,
        data: {
          uom: draft.uom,
          physical_quantity: draft.physicalQuantity || null,
          seal_number: draft.sealNumber,
          pgi_reference: draft.pgiReference,
          eway_bill: draft.ewayBill,
        },
      });
      await refetch();
      toast.success('Gatepass printed');
    } catch (printError) {
      setError(getErrorMessage(printError, 'Failed to print gatepass'));
    }
  };

  const handleCommitPrint = async () => {
    if (!entry) return;

    try {
      await commitPrint.mutateAsync(entry.id);
      await refetch();
      toast.success('Gatepass print committed');
    } catch (commitError) {
      setError(getErrorMessage(commitError, 'Failed to commit gatepass print'));
    }
  };

  const handleMarkDispatched = async () => {
    if (!entry) return;

    try {
      await markDispatched.mutateAsync(entry.id);
      toast.success('Docking marked as dispatched');
      navigate('/gate/sales-dispatch');
    } catch (dispatchError) {
      setError(getErrorMessage(dispatchError, 'Failed to mark Docking as dispatched'));
    }
  };

  const handleNextAction = async () => {
    if (!entry) {
      setError('Docking details not found.');
      return;
    }

    if (action === 'print') {
      await handlePrintGatepass();
    } else if (action === 'commit') {
      await handleCommitPrint();
    } else if (action === 'dispatch') {
      await handleMarkDispatched();
    } else {
      navigate('/gate/sales-dispatch');
    }
  };

  if (isEntryLoading) {
    return <StepLoadingSpinner />;
  }

  if (!entry) {
    return (
      <div className="space-y-6 pb-6">
        <StepHeader
          currentStep={4}
          totalSteps={DOCKING_TOTAL_STEPS}
          title="Docking"
          error={error || (entryError ? getErrorMessage(entryError, 'Docking details not found') : null)}
        />
        <div className="flex items-center justify-between gap-4 rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Docking details not found</span>
          </div>
          <Button variant="outline" onClick={() => navigate('/gate/sales-dispatch/new')}>
            Fill Details
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="sales-dispatch-gatepass-page space-y-6 pb-6">
      <div className="print-hide">
        <StepHeader
          currentStep={4}
          totalSteps={DOCKING_TOTAL_STEPS}
          title="Docking"
          error={error || null}
        />
      </div>

      <Card className="sales-dispatch-gatepass-summary print-no-break">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Docking Entry
          </CardTitle>
          <GateStatusBadge status={entry.status} />
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
          <InfoItem label="Entry No." value={entry.entry_no} />
          <InfoItem label="Vehicle" value={entry.vehicle_no} />
          <InfoItem label="Driver" value={entry.driver_name} />
          <InfoItem label="SAP Document" value={entry.sap_doc_num} />
          <InfoItem label="Customer / Destination" value={entry.customer_name || entry.to_warehouse} />
          <InfoItem label="Items" value={summarizeSalesDispatchItems(entry.items)} />
          <InfoItem label="Gate Out" value={formatDateTime(entry.gate_out_date, entry.out_time)} />
          <InfoItem label="Printed At" value={formatTimestamp(entry.printed_at)} />
        </CardContent>
      </Card>

      <div className="sales-dispatch-gatepass-grid grid gap-4 xl:grid-cols-[1fr_0.85fr]">
        <Card className="sales-dispatch-gatepass-print-card print-no-break">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" />
              Gatepass Print Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="sales-dispatch-gatepass-fields grid gap-4 md:grid-cols-2">
              <TextField
                id="sales-dispatch-uom"
                label="UOM"
                value={draft.uom}
                disabled={entry.status !== 'READY_FOR_GATEPASS' && entry.status !== 'PHOTO_ATTACHED' && entry.status !== 'DOCKED'}
                onChange={(value) => updateDraft('uom', value)}
                placeholder="Example: BOX"
              />
              <TextField
                id="sales-dispatch-physical-quantity"
                label="Physical Quantity"
                type="number"
                value={draft.physicalQuantity}
                disabled={entry.status !== 'READY_FOR_GATEPASS' && entry.status !== 'PHOTO_ATTACHED' && entry.status !== 'DOCKED'}
                onChange={(value) => updateDraft('physicalQuantity', value)}
              />
              <TextField
                id="sales-dispatch-seal"
                label="Seal No."
                value={draft.sealNumber}
                disabled={entry.status !== 'READY_FOR_GATEPASS' && entry.status !== 'PHOTO_ATTACHED' && entry.status !== 'DOCKED'}
                onChange={(value) => updateDraft('sealNumber', value)}
              />
              <TextField
                id="sales-dispatch-pgi-reference"
                label="PGI / Goods Issue Doc No."
                value={draft.pgiReference}
                disabled={entry.status !== 'READY_FOR_GATEPASS' && entry.status !== 'PHOTO_ATTACHED' && entry.status !== 'DOCKED'}
                onChange={(value) => updateDraft('pgiReference', value)}
              />
              <TextField
                id="sales-dispatch-eway-bill"
                label="E-way Bill"
                value={draft.ewayBill}
                disabled={entry.status !== 'READY_FOR_GATEPASS' && entry.status !== 'PHOTO_ATTACHED' && entry.status !== 'DOCKED'}
                onChange={(value) => updateDraft('ewayBill', value)}
              />
            </div>

            {entry.gatepass_no ? (
              <div className="rounded-md border p-4">
                <div className="grid gap-3 text-sm md:grid-cols-2">
                  <InfoItem label="Gatepass No." value={entry.gatepass_no} />
                  <InfoItem label="Random Code" value={entry.random_code} />
                  <InfoItem label="Printed At" value={formatTimestamp(entry.printed_at)} />
                  <InfoItem label="Committed At" value={formatTimestamp(entry.print_committed_at)} />
                </div>
                <div className="mt-4 space-y-2">
                  <Label htmlFor="sales-dispatch-qr">QR Payload</Label>
                  <Textarea
                    id="sales-dispatch-qr"
                    value={entry.qr_payload || ''}
                    readOnly
                    className="min-h-24"
                  />
                </div>
                <Button type="button" variant="outline" className="mt-4" onClick={() => window.print()}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print Browser Copy
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="print-hide">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Readiness
            </CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={handlePreview} disabled={isSaving}>
              Refresh
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <ReadinessItem
              label="Truck Photo Location"
              ready={Boolean(readiness?.has_truck_photo_geolocation)}
            />
            <ReadinessItem
              label="Weighment"
              ready={Boolean(readiness?.has_weighment)}
              detail={weighment ? `${weighment.net_weight} net` : 'Pending'}
            />
            <ReadinessItem label="SAP Items" ready={Boolean(readiness?.has_items)} />

            {readiness && !readiness.ready ? (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                Missing: {readiness.missing.join(', ')}
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">
                <CheckCircle2 className="h-4 w-4" />
                Ready for gatepass
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="print-hide flex flex-wrap justify-end gap-3">
        <Button type="button" variant="outline" onClick={handlePrintGatepass} disabled={isSaving || action !== 'print'}>
          <Printer className="mr-2 h-4 w-4" />
          Print Gatepass
        </Button>
        <Button type="button" variant="outline" onClick={handleCommitPrint} disabled={isSaving || action !== 'commit'}>
          <FileText className="mr-2 h-4 w-4" />
          Commit Print
        </Button>
        <Button type="button" onClick={handleMarkDispatched} disabled={isSaving || action !== 'dispatch'}>
          <Send className="mr-2 h-4 w-4" />
          Mark Dispatched
        </Button>
      </div>

      <div className="print-hide">
        <StepFooter
          onPrevious={() => navigate(`/gate/sales-dispatch/new/attachments?entryId=${entryId || entry.vehicle_entry}`)}
          onCancel={() => navigate('/gate/sales-dispatch')}
          onNext={handleNextAction}
          isSaving={isSaving}
          nextLabel={getNextActionLabel(entry, isSaving)}
        />
      </div>
    </div>
  );
}

function getNextAction(entry?: SalesDispatchGateOut | null) {
  if (!entry) return 'done';
  if (entry.status === 'GATEPASS_PRINTED') return 'commit';
  if (entry.status === 'PRINT_COMMITTED') return 'dispatch';
  if (entry.status === 'DISPATCHED') return 'done';
  if (entry.status === 'CANCELLED' || entry.status === 'REJECTED') return 'done';
  return 'print';
}

function getNextActionLabel(entry: SalesDispatchGateOut, isSaving: boolean) {
  if (isSaving) return 'Saving...';
  const action = getNextAction(entry);
  if (action === 'commit') return 'Commit Print';
  if (action === 'dispatch') return 'Mark Dispatched';
  if (action === 'done') return 'Back to Dashboard';
  return 'Print Gatepass';
}

function buildReadinessError(entry: SalesDispatchGateOut) {
  const missing = entry.gatepass_readiness.missing.join(', ');
  return missing ? `Gatepass is not ready. Missing: ${missing}.` : 'Gatepass is not ready.';
}

function TextField({
  id,
  label,
  value,
  onChange,
  disabled,
  placeholder,
  type = 'text',
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function ReadinessItem({
  label,
  ready,
  detail,
}: {
  label: string;
  ready: boolean;
  detail?: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-md border p-3">
      <CheckCircle2 className={`mt-0.5 h-4 w-4 ${ready ? 'text-emerald-600' : 'text-muted-foreground'}`} />
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{ready ? detail || 'Complete' : detail || 'Pending'}</p>
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
