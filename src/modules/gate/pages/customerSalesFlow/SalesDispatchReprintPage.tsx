import { AlertCircle, ArrowLeft, FileText, History, Printer, QrCode, Truck } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { Ref } from 'react';
import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'sonner';

import { GATE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import {
  type SalesDispatchGateOut,
  type SalesDispatchGateOutDocument,
  type SalesDispatchGatepassPrintLog,
  type SalesDispatchItem,
  useReprintSalesDispatchGatepass,
  useSalesDispatch,
  useSalesDispatchGatepassPrintHistory,
  useSalesDispatchLock,
} from '@/modules/gate/api';
import { GateStatusBadge, StepLoadingSpinner } from '@/modules/gate/components';
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
  formatDateTime,
  formatDocumentType,
  formatTimestamp,
  formatValue,
  summarizeSalesDispatchItems,
} from './salesDispatchFlow.helpers';
import { DOCKING_ROUTES } from './salesDispatchRoutes';

interface PrintableDocument {
  key: string;
  document_type: string;
  sap_doc_num?: string;
  customer_name?: string;
  eway_bill?: string;
  item_summary?: string;
  items?: SalesDispatchItem[];
}

export default function SalesDispatchReprintPage() {
  const navigate = useNavigate();
  const { currentCompany, hasPermission } = usePermission();
  const { entryId } = useParams();
  const id = Number(entryId || 0) || null;
  const [reason, setReason] = useState('');
  const [printerName, setPrinterName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [latestReprintLog, setLatestReprintLog] = useState<SalesDispatchGatepassPrintLog | null>(
    null,
  );
  const printRef = useRef<HTMLDivElement>(null);

  const { data: entry, isLoading, error, refetch } = useSalesDispatch(id);
  const {
    data: printHistory = [],
    isFetching: isHistoryFetching,
    refetch: refetchPrintHistory,
  } = useSalesDispatchGatepassPrintHistory(id);
  const { data: dispatchLock } = useSalesDispatchLock();
  const reprintGatepass = useReprintSalesDispatchGatepass();

  const companyName = entry
    ? currentCompany?.company_name || entry.sap_branch_name || String(entry.company)
    : currentCompany?.company_name || 'Jivo Oil';
  const currentPrintLog = useMemo(
    () =>
      latestReprintLog ||
      printHistory.find((log) => log.print_type === 'REPRINT') ||
      printHistory[0] ||
      null,
    [latestReprintLog, printHistory],
  );
  const printBrowserCopy = useReactToPrint({
    contentRef: printRef,
    documentTitle: entry?.gatepass_no ? `Reprint ${entry.gatepass_no}` : 'Docking Gatepass Reprint',
  });

  const isBlockedStatus = entry ? ['CANCELLED', 'REJECTED'].includes(entry.status) : false;
  const canReprint = Boolean(
    entry?.gatepass_no &&
    entry.printed_at &&
    !isBlockedStatus &&
    !dispatchLock?.is_locked &&
    hasPermission(GATE_PERMISSIONS.SALES_DISPATCH.REPRINT_GATEPASS),
  );
  const trimmedReason = reason.trim();
  const isSaving = reprintGatepass.isPending;

  const handleReprint = async () => {
    if (!entry) return;
    if (!trimmedReason) {
      setErrorMessage('Please enter a reprint reason');
      return;
    }

    try {
      setErrorMessage('');
      const updatedEntry = await reprintGatepass.mutateAsync({
        id: entry.id,
        data: {
          reprint_reason: trimmedReason,
          printer_name: printerName.trim() || undefined,
        },
      });
      const newestLog = findNewestReprintLog(updatedEntry, trimmedReason);
      setLatestReprintLog(newestLog);
      setReason('');
      await refetch();
      await refetchPrintHistory();
      toast.success('Reprint logged');
      window.setTimeout(() => {
        printBrowserCopy();
      }, 150);
    } catch (reprintError) {
      setErrorMessage(getErrorMessage(reprintError, 'Failed to log gatepass reprint'));
    }
  };

  if (isLoading) {
    return <StepLoadingSpinner label="Loading Docking entry..." />;
  }

  if (error || !entry) {
    return (
      <div className="space-y-6">
        <Button type="button" variant="ghost" onClick={() => navigate(DOCKING_ROUTES.dashboard)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Docking
        </Button>
        <div className="flex items-center gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">Docking entry not found</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate(DOCKING_ROUTES.detail(entry.id))}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Entry
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Reprint Gatepass</h2>
            <p className="text-muted-foreground">
              {entry.entry_no} · {formatValue(entry.gatepass_no)}
            </p>
          </div>
        </div>
        <GateStatusBadge status={entry.status} />
      </div>

      {dispatchLock?.is_locked && (
        <StatusNotice
          tone="danger"
          title="Docking printing is locked"
          description={dispatchLock.reason || 'Reprints are blocked until printing is unlocked.'}
        />
      )}
      {!entry.gatepass_no || !entry.printed_at ? (
        <StatusNotice
          tone="warning"
          title="Original print is not recorded"
          description="A gatepass can be reprinted only after the original print is recorded."
        />
      ) : null}
      {isBlockedStatus && (
        <StatusNotice
          tone="danger"
          title="Reprint is not available"
          description="Cancelled and rejected Docking entries cannot be reprinted."
        />
      )}

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Gatepass Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <InfoItem label="Entry No." value={entry.entry_no} />
              <InfoItem label="Gatepass No." value={entry.gatepass_no} />
              <InfoItem label="Vehicle" value={entry.vehicle_no} />
              <InfoItem label="Driver" value={entry.driver_name} />
              <InfoItem label="SAP Documents" value={formatDocumentNumbers(entry)} />
              <InfoItem label="Original Printed" value={formatTimestamp(entry.printed_at)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5" />
                Reprint Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sales-dispatch-reprint-reason">
                  Reprint Reason <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="sales-dispatch-reprint-reason"
                  value={reason}
                  onChange={(event) => {
                    setReason(event.target.value);
                    setErrorMessage('');
                  }}
                  placeholder="Example: Original copy damaged"
                  className="min-h-24"
                  disabled={!canReprint || isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sales-dispatch-reprint-printer">Printer Name</Label>
                <Input
                  id="sales-dispatch-reprint-printer"
                  value={printerName}
                  onChange={(event) => setPrinterName(event.target.value)}
                  placeholder="Security Printer"
                  disabled={!canReprint || isSaving}
                />
              </div>
              {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={handleReprint}
                  disabled={!canReprint || !trimmedReason || isSaving}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  {isSaving ? 'Logging...' : 'Log & Print Reprint'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Print History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PrintHistoryTable history={printHistory} isLoading={isHistoryFetching} />
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <FileText className="h-4 w-4" />
          Reprint Preview
        </h3>
        <PrintableGatepass
          printRef={printRef}
          entry={entry}
          companyName={companyName}
          printLog={currentPrintLog}
        />
      </section>
    </div>
  );
}

function StatusNotice({
  tone,
  title,
  description,
}: {
  tone: 'danger' | 'warning';
  title: string;
  description: string;
}) {
  const className =
    tone === 'danger'
      ? 'border-destructive/30 bg-destructive/10 text-destructive'
      : 'border-amber-300 bg-amber-50 text-amber-900';

  return (
    <div className={`flex items-start gap-3 rounded-md border p-4 ${className}`}>
      <AlertCircle className="mt-0.5 h-5 w-5" />
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-sm opacity-90">{description}</div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-medium">{formatValue(value)}</div>
    </div>
  );
}

function PrintHistoryTable({
  history,
  isLoading,
}: {
  history: SalesDispatchGatepassPrintLog[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading print history...</p>;
  }
  if (history.length === 0) {
    return <p className="text-sm text-muted-foreground">No print history recorded</p>;
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[760px]">
        <thead className="bg-muted/50">
          <tr>
            <th className="whitespace-nowrap p-3 text-left text-sm font-medium">Copy</th>
            <th className="whitespace-nowrap p-3 text-left text-sm font-medium">Type</th>
            <th className="whitespace-nowrap p-3 text-left text-sm font-medium">Printed At</th>
            <th className="whitespace-nowrap p-3 text-left text-sm font-medium">Printed By</th>
            <th className="whitespace-nowrap p-3 text-left text-sm font-medium">Printer</th>
            <th className="p-3 text-left text-sm font-medium">Reason</th>
          </tr>
        </thead>
        <tbody>
          {history.map((log) => (
            <tr key={log.id} className="border-t align-top">
              <td className="whitespace-nowrap p-3 text-sm">#{log.copy_number}</td>
              <td className="whitespace-nowrap p-3 text-sm">{formatPrintType(log.print_type)}</td>
              <td className="whitespace-nowrap p-3 text-sm">{formatTimestamp(log.printed_at)}</td>
              <td className="whitespace-nowrap p-3 text-sm">
                {formatValue(log.printed_by_name || log.printed_by)}
              </td>
              <td className="whitespace-nowrap p-3 text-sm">{formatValue(log.printer_name)}</td>
              <td className="p-3 text-sm">{formatValue(log.reprint_reason)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const PrintableGatepass = ({
  printRef,
  entry,
  companyName,
  printLog,
}: {
  printRef: Ref<HTMLDivElement>;
  entry: SalesDispatchGateOut;
  companyName: string;
  printLog?: SalesDispatchGatepassPrintLog | null;
}) => {
  const qrValue = entry.qr_payload || entry.gatepass_no || entry.random_code || entry.entry_no;
  const documents = getPrintableDocuments(entry);

  return (
    <div
      ref={printRef}
      className="rounded-md border bg-white p-6 text-black shadow-sm print:shadow-none"
    >
      <div className="space-y-5">
        <header className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase text-slate-500">Gatepass Reprint</p>
            <h1 className="text-2xl font-bold">{companyName}</h1>
            <p className="mt-1 text-sm text-slate-600">{formatValue(entry.sap_branch_name)}</p>
          </div>
          <div className="text-sm sm:text-right">
            <div className="font-semibold">{formatValue(entry.gatepass_no)}</div>
            <div>Entry: {entry.entry_no}</div>
            <div>Copy: {printLog ? `#${printLog.copy_number}` : '-'}</div>
            <div>Printed: {formatTimestamp(printLog?.printed_at)}</div>
          </div>
        </header>

        <div className="grid gap-3 text-sm md:grid-cols-3">
          <PrintField label="Vehicle" value={entry.vehicle_no} />
          <PrintField label="Driver" value={entry.driver_name} />
          <PrintField label="Transporter" value={entry.transporter_name} />
          <PrintField label="Bilty / LR" value={entry.bilty_no} />
          <PrintField
            label="Actual Gate Out"
            value={formatActualGateOut(entry)}
          />
          <PrintField label="Original Printed" value={formatTimestamp(entry.printed_at)} />
          <PrintField
            label="Customer / Destination"
            value={entry.customer_name || entry.to_warehouse}
          />
          <PrintField label="E-way Bill" value={entry.eway_bill} />
          <PrintField
            label="Seal / PGI"
            value={[entry.seal_number, entry.pgi_reference].filter(Boolean).join(' / ')}
          />
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase text-slate-600">Documents</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border p-2 text-left">Document</th>
                  <th className="border p-2 text-left">Type</th>
                  <th className="border p-2 text-left">Customer / Destination</th>
                  <th className="border p-2 text-left">E-way Bill</th>
                  <th className="border p-2 text-left">Items</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((document) => (
                  <tr key={document.key}>
                    <td className="border p-2">{formatValue(document.sap_doc_num)}</td>
                    <td className="border p-2">{formatDocumentType(document.document_type)}</td>
                    <td className="border p-2">{formatValue(document.customer_name)}</td>
                    <td className="border p-2">{formatValue(document.eway_bill)}</td>
                    <td className="border p-2">
                      {document.item_summary || summarizeSalesDispatchItems(document.items || [])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase text-slate-600">Item Lines</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border p-2 text-left">SAP Doc</th>
                  <th className="border p-2 text-left">Item</th>
                  <th className="border p-2 text-right">Qty</th>
                  <th className="border p-2 text-left">UOM</th>
                  <th className="border p-2 text-right">Weight</th>
                  <th className="border p-2 text-left">Warehouse</th>
                </tr>
              </thead>
              <tbody>
                {entry.items.map((item) => (
                  <tr key={item.id}>
                    <td className="border p-2">{formatValue(item.document_sap_doc_num)}</td>
                    <td className="border p-2">{item.item_name || item.item_code}</td>
                    <td className="border p-2 text-right">{formatValue(item.quantity)}</td>
                    <td className="border p-2">{formatValue(item.uom)}</td>
                    <td className="border p-2 text-right">{formatValue(item.total_weight)}</td>
                    <td className="border p-2">
                      {formatValue(item.warehouse_code || item.from_warehouse || item.to_warehouse)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <footer className="grid gap-4 border-t pt-4 text-sm md:grid-cols-[1fr_auto]">
          <div className="grid gap-3 sm:grid-cols-2">
            <PrintField label="Reprint Reason" value={printLog?.reprint_reason} />
            <PrintField
              label="Printed By"
              value={printLog?.printed_by_name || printLog?.printed_by}
            />
            <PrintField label="Printer" value={printLog?.printer_name} />
            <PrintField label="Random Code" value={entry.random_code} />
          </div>
          <div className="flex flex-col items-center justify-center rounded-md border p-3">
            <QRCodeSVG value={qrValue} size={112} level="M" includeMargin={false} />
            <div className="mt-2 flex items-center gap-1 text-xs text-slate-600">
              <QrCode className="h-3 w-3" />
              Gatepass QR
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

function formatActualGateOut(entry: SalesDispatchGateOut) {
  if (entry.status !== 'DISPATCHED') return '-';
  return entry.gate_out_date || entry.out_time
    ? formatDateTime(entry.gate_out_date, entry.out_time)
    : formatTimestamp(entry.dispatched_at);
}

function PrintField({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase text-slate-500">{label}</div>
      <div>{formatValue(value)}</div>
    </div>
  );
}

function getPrintableDocuments(entry: SalesDispatchGateOut): PrintableDocument[] {
  if (entry.documents?.length) {
    return entry.documents.map((document) => ({
      key: String(document.id),
      document_type: document.document_type,
      sap_doc_num: document.sap_doc_num,
      customer_name: document.customer_name || document.to_warehouse || document.warehouses,
      eway_bill: document.eway_bill,
      item_summary: document.item_summary,
      items: getDocumentItems(entry, document),
    }));
  }

  return [
    {
      key: `${entry.document_type}:${entry.sap_doc_entry}`,
      document_type: entry.document_type,
      sap_doc_num: entry.sap_doc_num,
      customer_name: entry.customer_name || entry.to_warehouse || entry.warehouses,
      eway_bill: entry.eway_bill,
      item_summary: entry.item_summary,
      items: entry.items,
    },
  ];
}

function getDocumentItems(entry: SalesDispatchGateOut, document: SalesDispatchGateOutDocument) {
  if (document.items?.length) return document.items;
  return entry.items.filter(
    (item) => item.document === document.id || item.document_sap_doc_num === document.sap_doc_num,
  );
}

function formatDocumentNumbers(entry: SalesDispatchGateOut) {
  const numbers = entry.document_numbers?.length
    ? entry.document_numbers
    : entry.sap_doc_num
      ? [entry.sap_doc_num]
      : [];
  return numbers.join(', ') || '-';
}

function formatPrintType(value: SalesDispatchGatepassPrintLog['print_type']) {
  return value === 'REPRINT' ? 'Reprint' : 'Original';
}

function findNewestReprintLog(entry: SalesDispatchGateOut, reason: string) {
  return (
    entry.gatepass_print_logs?.find(
      (log) => log.print_type === 'REPRINT' && log.reprint_reason === reason,
    ) ||
    entry.gatepass_print_logs?.find((log) => log.print_type === 'REPRINT') ||
    null
  );
}
