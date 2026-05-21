import {
  AlertCircle,
  Boxes,
  CheckCircle2,
  FileText,
  Lock,
  Printer,
  QrCode,
  Send,
  Truck,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'sonner';

import { usePermission } from '@/core/auth';
import {
  type SalesDispatchGateOut,
  type SalesDispatchItem,
  useCommitSalesDispatchPrint,
  useMarkSalesDispatchDispatched,
  usePreviewSalesDispatchGatepass,
  usePrintSalesDispatchGatepass,
  useSalesDispatchByVehicleEntry,
  useSalesDispatchLock,
  useWeighment,
  type Weighment,
} from '@/modules/gate/api';
import {
  GateStatusBadge,
  StepFooter,
  StepHeader,
  StepLoadingSpinner,
} from '@/modules/gate/components';
import { useEntryId } from '@/modules/gate/hooks';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

import {
  DOCKING_TOTAL_STEPS,
  formatDateTime,
  formatTimestamp,
  formatValue,
} from './salesDispatchFlow.helpers';
import { getSalesDispatchRoutes, isSalesDispatchOutPath } from './salesDispatchRoutes';

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

interface GatepassReferenceField {
  label: string;
  value?: string | number | null;
}

export default function SalesDispatchGatepassPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentCompany } = usePermission();
  const routes = getSalesDispatchRoutes(location.pathname);
  const isGateOutMode = isSalesDispatchOutPath(location.pathname);
  const { entryId, entryIdNumber } = useEntryId();
  const [draft, setDraft] = useState<GatepassDraft>(() => buildDraft());
  const [error, setError] = useState('');
  const [isPrintAuthorized, setIsPrintAuthorized] = useState(false);
  const [pendingOriginalPrint, setPendingOriginalPrint] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const {
    data: entry,
    isLoading: isEntryLoading,
    error: entryError,
    refetch,
  } = useSalesDispatchByVehicleEntry(entryIdNumber);
  const { data: weighment } = useWeighment(entryIdNumber);
  const { data: dispatchLock } = useSalesDispatchLock();
  const previewGatepass = usePreviewSalesDispatchGatepass();
  const printGatepass = usePrintSalesDispatchGatepass();
  const commitPrint = useCommitSalesDispatchPrint();
  const markDispatched = useMarkSalesDispatchDispatched();

  const printBrowserCopy = useReactToPrint({
    contentRef: printRef,
    documentTitle: buildGatepassDocumentTitle(entry),
    onAfterPrint: () => setIsPrintAuthorized(false),
    onPrintError: () => setIsPrintAuthorized(false),
  });

  useEffect(() => {
    if (!entry) return;

    const timerId = window.setTimeout(() => {
      setDraft(buildDraft(entry));
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [entry]);

  useEffect(() => {
    if (!pendingOriginalPrint || !entry?.gatepass_no) return;

    const timerId = window.setTimeout(() => {
      setPendingOriginalPrint(false);
      setIsPrintAuthorized(true);
      window.setTimeout(() => {
        printBrowserCopy();
      }, 100);
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [entry?.gatepass_no, pendingOriginalPrint, printBrowserCopy]);

  const isSaving =
    previewGatepass.isPending ||
    printGatepass.isPending ||
    commitPrint.isPending ||
    markDispatched.isPending;
  const readiness = entry?.gatepass_readiness;
  const action = useMemo(() => getNextAction(entry, isGateOutMode), [entry, isGateOutMode]);
  const isGatepassPrintLocked = Boolean(dispatchLock?.is_locked);
  const canEditGatepassDetails = Boolean(
    !isGateOutMode &&
    entry &&
    ['READY_FOR_GATEPASS', 'PHOTO_ATTACHED', 'DOCKED'].includes(entry.status),
  );

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

    if (isGatepassPrintLocked) {
      setError(buildLockError(dispatchLock?.reason));
      return;
    }

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
      setPendingOriginalPrint(true);
      await refetch();
      toast.success('Gatepass created. Opening one-time print dialog...');
    } catch (printError) {
      setPendingOriginalPrint(false);
      setIsPrintAuthorized(false);
      setError(getErrorMessage(printError, 'Failed to print gatepass'));
    }
  };

  const handleCommitPrint = async () => {
    if (!entry) return;

    if (isGatepassPrintLocked) {
      setError(buildLockError(dispatchLock?.reason));
      return;
    }

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
    if (!isGateOutMode) {
      setError('Dispatch can only be marked from the Gate module.');
      return;
    }

    try {
      await markDispatched.mutateAsync(entry.id);
      toast.success('Entry marked as dispatched');
      navigate(routes.dashboard);
    } catch (dispatchError) {
      setError(getErrorMessage(dispatchError, 'Failed to mark entry as dispatched'));
    }
  };

  const handleNextAction = async () => {
    if (!entry) {
      setError('Docking details not found.');
      return;
    }

    if (isGateOutMode && action !== 'dispatch' && action !== 'done') {
      setError('This entry can be marked out after Docking commits the gatepass print.');
      return;
    }

    if (action === 'print') {
      await handlePrintGatepass();
    } else if (action === 'commit') {
      await handleCommitPrint();
    } else if (action === 'dispatch') {
      await handleMarkDispatched();
    } else {
      navigate(routes.dashboard);
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
          error={
            error || (entryError ? getErrorMessage(entryError, 'Docking details not found') : null)
          }
        />
        <div className="flex items-center justify-between gap-4 rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Docking details not found</span>
          </div>
          <Button variant="outline" onClick={() => navigate(routes.newEntry)}>
            Fill Details
          </Button>
        </div>
      </div>
    );
  }

  const companyName =
    currentCompany?.company_name || entry.sap_branch_name || String(entry.company);
  const qrValue = entry.qr_payload || entry.gatepass_no || entry.random_code || entry.entry_no;
  const gatepassReferenceFields = buildGatepassReferenceFields(
    entry,
    draft,
    weighment,
    companyName,
  );
  const pageTitle = getGatepassPageTitle(entry, isGateOutMode);

  return (
    <>
      <div
        ref={printRef}
        className={cn(
          'sales-dispatch-gatepass-page space-y-6 pb-6',
          isPrintAuthorized && 'sales-dispatch-gatepass-print-authorized',
        )}
      >
        <div className="print-hide">
          <StepHeader
            currentStep={4}
            totalSteps={DOCKING_TOTAL_STEPS}
            title={pageTitle}
            error={error || null}
          />
        </div>

        {!isGateOutMode && isGatepassPrintLocked ? (
          <div className="print-hide flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
            <Lock className="mt-0.5 h-5 w-5" />
            <div>
              <p className="font-medium">Docking printing is locked</p>
              <p className="mt-1">
                {dispatchLock?.reason || 'Gatepass print and commit are temporarily held.'}
              </p>
            </div>
          </div>
        ) : null}

        <Card className="sales-dispatch-gatepass-summary print-no-break">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              {pageTitle} Entry
            </CardTitle>
            <GateStatusBadge status={entry.status} />
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
            <InfoItem label="Entry No." value={entry.entry_no} />
            <InfoItem label="Vehicle" value={entry.vehicle_no} />
            <InfoItem label="Driver" value={entry.driver_name} />
            <InfoItem label="SAP Document" value={entry.sap_doc_num} />
            <InfoItem
              label="Customer / Destination"
              value={entry.customer_name || entry.to_warehouse}
            />
            <InfoItem label="Item Lines" value={formatItemLineCount(entry.items)} />
            <InfoItem
              label="Gate Out"
              value={formatDateTime(entry.gate_out_date, entry.out_time)}
            />
            <InfoItem label="Printed At" value={formatTimestamp(entry.printed_at)} />
          </CardContent>
        </Card>

        <GatepassItemsPanel items={entry.items} itemSummary={entry.item_summary} />

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
                  disabled={!canEditGatepassDetails}
                  onChange={(value) => updateDraft('uom', value)}
                  placeholder="Example: BOX"
                />
                <TextField
                  id="sales-dispatch-physical-quantity"
                  label="Physical Quantity"
                  type="number"
                  value={draft.physicalQuantity}
                  disabled={!canEditGatepassDetails}
                  onChange={(value) => updateDraft('physicalQuantity', value)}
                />
                <TextField
                  id="sales-dispatch-seal"
                  label="Seal No."
                  value={draft.sealNumber}
                  disabled={!canEditGatepassDetails}
                  onChange={(value) => updateDraft('sealNumber', value)}
                />
                <TextField
                  id="sales-dispatch-pgi-reference"
                  label="PGI / Goods Issue Doc No."
                  value={draft.pgiReference}
                  disabled={!canEditGatepassDetails}
                  onChange={(value) => updateDraft('pgiReference', value)}
                />
                <TextField
                  id="sales-dispatch-eway-bill"
                  label="E-way Bill"
                  value={draft.ewayBill}
                  disabled={!canEditGatepassDetails}
                  onChange={(value) => updateDraft('ewayBill', value)}
                />
              </div>

              {entry.gatepass_no ? (
                <div className="rounded-md border p-4">
                  <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                    <div className="sales-dispatch-gatepass-reference grid gap-3 text-sm md:grid-cols-2">
                      {gatepassReferenceFields.map((field) => (
                        <InfoItem key={field.label} label={field.label} value={field.value} />
                      ))}
                    </div>
                    <div className="sales-dispatch-gatepass-qr flex flex-col items-center justify-center rounded-md border bg-white p-3">
                      <QRCodeSVG
                        value={qrValue}
                        size={128}
                        level="M"
                        includeMargin={false}
                        className="sales-dispatch-gatepass-qr-code"
                      />
                      <p className="mt-2 text-center text-xs text-muted-foreground">Gatepass QR</p>
                    </div>
                  </div>
                  <div className="print-hide mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    Original gatepass print is already recorded. Reprints must use the audited
                    reprint workflow.
                  </div>
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
              {!isGateOutMode && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePreview}
                  disabled={isSaving}
                >
                  Refresh
                </Button>
              )}
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
          {!isGateOutMode && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handlePrintGatepass}
                disabled={isSaving || isGatepassPrintLocked || action !== 'print'}
              >
                <Printer className="mr-2 h-4 w-4" />
                Print Gatepass
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCommitPrint}
                disabled={isSaving || isGatepassPrintLocked || action !== 'commit'}
              >
                <FileText className="mr-2 h-4 w-4" />
                Commit Print
              </Button>
            </>
          )}
          {isGateOutMode && (
            <Button
              type="button"
              onClick={handleMarkDispatched}
              disabled={isSaving || action !== 'dispatch'}
            >
              <Send className="mr-2 h-4 w-4" />
              Mark Dispatched
            </Button>
          )}
        </div>

        <div className="print-hide">
          <StepFooter
            onPrevious={() => navigate(routes.attachments(entryId || entry.vehicle_entry))}
            onCancel={() => navigate(routes.dashboard)}
            onNext={handleNextAction}
            showPrevious={!isGateOutMode}
            isSaving={isSaving}
            isNextDisabled={isGateOutMode && action !== 'dispatch' && action !== 'done'}
            nextLabel={
              isGateOutMode
                ? getGateOutActionLabel(entry, isSaving)
                : getNextActionLabel(entry, isSaving)
            }
          />
        </div>
      </div>
      <div className="sales-dispatch-gatepass-print-blocked">
        Gatepass browser printing is blocked from this screen. Use the audited reprint workflow.
      </div>
    </>
  );
}

function getGatepassPageTitle(entry: SalesDispatchGateOut, isGateOutMode: boolean) {
  if (!isGateOutMode) return 'Docking';
  return entry.document_type === 'STOCK_TRANSFER' ? 'BST Out' : 'Sales Dispatch Out';
}

function getNextAction(entry?: SalesDispatchGateOut | null, isGateOutMode = false) {
  if (!entry) return 'done';
  if (entry.status === 'GATEPASS_PRINTED') return isGateOutMode ? 'waiting' : 'commit';
  if (entry.status === 'PRINT_COMMITTED') return isGateOutMode ? 'dispatch' : 'done';
  if (entry.status === 'DISPATCHED') return 'done';
  if (entry.status === 'CANCELLED' || entry.status === 'REJECTED') return 'done';
  return isGateOutMode ? 'waiting' : 'print';
}

function getNextActionLabel(entry: SalesDispatchGateOut, isSaving: boolean) {
  if (isSaving) return 'Saving...';
  const action = getNextAction(entry);
  if (action === 'commit') return 'Commit Print';
  if (action === 'dispatch') return 'Mark Dispatched';
  if (action === 'done') return 'Back to Dashboard';
  return 'Print Gatepass';
}

function getGateOutActionLabel(entry: SalesDispatchGateOut, isSaving: boolean) {
  if (isSaving) return 'Saving...';
  const action = getNextAction(entry, true);
  if (action === 'dispatch') return 'Mark Dispatched';
  if (action === 'done') return 'Back to Dashboard';
  return 'Waiting for Docking';
}

function buildReadinessError(entry: SalesDispatchGateOut) {
  const missing = entry.gatepass_readiness.missing.join(', ');
  return missing ? `Gatepass is not ready. Missing: ${missing}.` : 'Gatepass is not ready.';
}

function buildLockError(reason?: string) {
  return reason ? `Docking printing is locked. Reason: ${reason}` : 'Docking printing is locked.';
}

function buildGatepassDocumentTitle(entry?: SalesDispatchGateOut | null) {
  const reference = entry?.gatepass_no || entry?.sap_doc_num || entry?.entry_no || 'draft';
  return `Gatepass ${reference}`;
}

function buildGatepassReferenceFields(
  entry: SalesDispatchGateOut,
  draft: GatepassDraft,
  weighment: Weighment | null | undefined,
  companyName: string,
): GatepassReferenceField[] {
  const ewayBill = draft.ewayBill || entry.eway_bill;

  return [
    { label: 'Invoice ID', value: entry.sap_doc_entry },
    { label: 'Invoice Number', value: entry.sap_doc_num },
    { label: 'Company', value: companyName },
    { label: 'Customer', value: formatCustomer(entry) },
    { label: 'Address', value: entry.ship_to_address || entry.place_of_supply },
    { label: 'Invoice Date', value: entry.sap_doc_date },
    { label: 'Gatepass Date', value: formatTimestamp(entry.printed_at) },
    { label: 'Total Amount', value: entry.sap_doc_total },
    { label: 'Gate Pass ID', value: entry.gatepass_no },
    { label: 'SAP Weight', value: formatWeightValue(entry.total_weight) },
    { label: 'WB Weight', value: formatWeightValue(weighment?.net_weight || entry.net_weight) },
    { label: 'Builty Number', value: entry.bilty_no },
    { label: 'Truck Number', value: entry.vehicle_no },
    { label: 'Transporter', value: entry.transporter_name },
    { label: 'Driver Name', value: entry.driver_name },
    { label: 'Driver Contact', value: entry.driver_mobile_no },
    { label: 'E-way Bill Attached', value: ewayBill ? 'Yes' : 'No' },
    { label: 'Unit of Measure', value: draft.uom || entry.uom },
    { label: 'Physical Quantity', value: draft.physicalQuantity || entry.physical_quantity },
    { label: 'Geotag Data', value: formatGeotag(entry) },
  ];
}

function formatCustomer(entry: SalesDispatchGateOut) {
  return [entry.customer_code, entry.customer_name || entry.to_warehouse || entry.warehouses]
    .filter(Boolean)
    .join(' - ');
}

function formatWeightValue(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return '';
  const text = String(value);
  return /\b(kg|mt|ton|tons)\b/i.test(text) ? text : `${text} kg`;
}

function formatGeotag(entry: SalesDispatchGateOut) {
  if (!entry.photo_latitude || !entry.photo_longitude) return '';
  return `${entry.photo_latitude}, ${entry.photo_longitude}`;
}

function GatepassItemsPanel({
  items,
  itemSummary,
}: {
  items: SalesDispatchItem[];
  itemSummary?: string;
}) {
  return (
    <Card className="sales-dispatch-gatepass-items print-no-break">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <CardTitle className="flex items-center gap-2">
          <Boxes className="h-5 w-5" />
          SAP Items
        </CardTitle>
        <div className="text-sm text-muted-foreground">{formatItemLineCount(items)}</div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex min-h-24 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
            {itemSummary || 'No document lines found'}
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px]">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="w-[150px] p-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                      Item Code
                    </th>
                    <th className="p-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                      Item Name
                    </th>
                    <th className="w-[130px] p-3 text-right text-xs font-semibold uppercase text-muted-foreground">
                      Quantity
                    </th>
                    <th className="w-[100px] p-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                      UOM
                    </th>
                    <th className="w-[160px] p-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                      Warehouse
                    </th>
                    <th className="w-[180px] p-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                      Metrics
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr
                      key={item.id || `${item.item_code}-${index}`}
                      className="border-t align-top"
                    >
                      <td className="whitespace-nowrap p-3 text-sm font-semibold">
                        {formatValue(item.item_code)}
                      </td>
                      <td className="p-3">
                        <div className="text-sm font-medium leading-5">
                          {formatValue(item.item_name)}
                        </div>
                        {item.base_ref ? (
                          <div className="mt-1 text-xs text-muted-foreground">
                            Base Ref: {item.base_ref}
                          </div>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap p-3 text-right text-sm font-semibold tabular-nums">
                        {formatValue(item.quantity)}
                      </td>
                      <td className="whitespace-nowrap p-3 text-sm">{formatValue(item.uom)}</td>
                      <td className="whitespace-nowrap p-3 text-sm">{formatItemWarehouse(item)}</td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {formatItemMetrics(item)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatItemLineCount(items: SalesDispatchItem[]) {
  if (items.length === 0) return 'No item lines';
  return items.length === 1 ? '1 item line' : `${items.length} item lines`;
}

function formatItemWarehouse(item: SalesDispatchItem) {
  const from = item.from_warehouse;
  const to = item.to_warehouse;
  if (from && to && from !== to) return `${from} -> ${to}`;
  return item.warehouse_code || from || to || '-';
}

function formatItemMetrics(item: SalesDispatchItem) {
  const metrics = [
    item.total_boxes ? `${item.total_boxes} boxes` : '',
    item.total_litres ? `${item.total_litres} litres` : '',
    item.total_weight ? formatWeightValue(item.total_weight) : '',
  ].filter(Boolean);

  return metrics.length ? metrics.join(' / ') : '-';
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
      <CheckCircle2
        className={`mt-0.5 h-4 w-4 ${ready ? 'text-emerald-600' : 'text-muted-foreground'}`}
      />
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">
          {ready ? detail || 'Complete' : detail || 'Pending'}
        </p>
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
