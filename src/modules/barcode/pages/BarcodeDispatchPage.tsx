import {
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileSearch,
  Loader2,
  Lock,
  PackageCheck,
  Play,
  RefreshCw,
  ScanLine,
  Settings,
  XCircle,
} from 'lucide-react';
import { type FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from '@/shared/components/ui';

import {
  useCancelDispatchSession,
  useCloseDispatchSession,
  useCreateDispatchSession,
  useDispatchScanLogs,
  useDispatchSession,
  useDispatchSessionDispatch,
  useDispatchSessions,
  useDispatchSettings,
  useLookupDispatchBill,
  useRetryDispatchSapSync,
  useSubmitDispatchScan,
  useUpdateDispatchSettings,
} from '../api';
import BarcodeScanner from '../components/BarcodeScanner';
import type {
  DispatchBillLine,
  DispatchBillLookupResponse,
  DispatchScanLog,
  DispatchSession,
  DispatchSessionLine,
  DispatchSessionStatus,
} from '../types';
import {
  canMarkDispatchComplete,
  canSubmitDispatchScan,
  formatDispatchScanMessage,
  getDispatchActiveLine,
  getLineProgress,
  isLineComplete,
  isLineLocked,
} from '../utils/dispatchValidation';
import { toastBarcodeError } from '../utils/errors';

type DispatchTab = 'active' | 'completed' | 'closed';

const SESSION_STATUS_LABEL: Record<DispatchSessionStatus, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  PARTIAL: 'Partial',
  READY_TO_DISPATCH: 'Ready',
  COMPLETED: 'Completed',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
  SAP_SYNC_FAILED: 'SAP Sync Failed',
};

const CLOSED_STATUSES = new Set<DispatchSessionStatus>([
  'COMPLETED',
  'CLOSED',
  'CANCELLED',
  'SAP_SYNC_FAILED',
]);

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function formatQty(qty: string | number | null | undefined, uom?: string) {
  const numeric = Number(qty ?? 0);
  const cleanQty = Number.isFinite(numeric) ? numeric.toLocaleString() : String(qty ?? '0');
  return `${cleanQty} ${uom ?? ''}`.trim();
}

function statusBadgeClass(status: DispatchSessionStatus) {
  if (status === 'COMPLETED') return 'bg-green-100 text-green-800 border-green-200';
  if (status === 'READY_TO_DISPATCH') return 'bg-sky-100 text-sky-800 border-sky-200';
  if (status === 'SAP_SYNC_FAILED' || status === 'CANCELLED') {
    return 'bg-red-100 text-red-800 border-red-200';
  }
  if (status === 'CLOSED') return 'bg-slate-100 text-slate-800 border-slate-200';
  if (status === 'PARTIAL') return 'bg-amber-100 text-amber-800 border-amber-200';
  return 'bg-blue-100 text-blue-800 border-blue-200';
}

function getRequestId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return undefined;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function BillLookupSummary({ bill }: { bill: DispatchBillLookupResponse }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">SAP Bill Preview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Metric label="Bill" value={bill.bill_number} />
          <Metric label="Customer" value={bill.customer.name || bill.customer.code || '-'} />
          <Metric label="Delivery Ref" value={bill.reference_delivery_number || '-'} />
          <Metric label="Lines" value={bill.lines.length.toString()} />
        </div>
        <BillLinePreview lines={bill.lines} />
      </CardContent>
    </Card>
  );
}

function BillLinePreview({ lines }: { lines: DispatchBillLine[] }) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Seq</th>
            <th className="px-3 py-2 text-left font-medium">Material</th>
            <th className="px-3 py-2 text-left font-medium">Description</th>
            <th className="px-3 py-2 text-right font-medium">Bill Qty</th>
            <th className="px-3 py-2 text-left font-medium">Batch</th>
            <th className="px-3 py-2 text-left font-medium">Warehouse</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={`${line.sap_line_no}-${line.sequence_no}`} className="border-t">
              <td className="px-3 py-2 font-mono text-xs">{line.sequence_no}</td>
              <td className="px-3 py-2 font-mono text-xs">{line.material_code}</td>
              <td className="px-3 py-2">{line.material_description || '-'}</td>
              <td className="px-3 py-2 text-right">{formatQty(line.quantity, line.uom)}</td>
              <td className="px-3 py-2 font-mono text-xs">{line.batch_number || '-'}</td>
              <td className="px-3 py-2 font-mono text-xs">{line.warehouse_code || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SessionSummary({ session }: { session: DispatchSession }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Dispatch Details</CardTitle>
          <Badge className={statusBadgeClass(session.status)}>
            {SESSION_STATUS_LABEL[session.status] ?? session.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <Metric label="Bill" value={session.bill_number} />
          <Metric label="Customer" value={session.customer_name || session.customer_code || '-'} />
          <Metric label="Expected" value={formatQty(session.total_expected_qty)} />
          <Metric label="Scanned" value={formatQty(session.total_scanned_qty)} />
          <Metric label="Pending" value={formatQty(session.pending_qty)} />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Metric label="Delivery Ref" value={session.delivery_number || session.reference_delivery_number || '-'} />
          <Metric label="Pallet Scans" value={session.pallet_scan_count.toString()} />
          <Metric label="Box Scans" value={session.box_scan_count.toString()} />
          <Metric label="SAP Sync" value={(session.sap_sync_status || session.sap_update_status).replaceAll('_', ' ')} />
        </div>
      </CardContent>
    </Card>
  );
}

function DispatchLines({ session }: { session: DispatchSession }) {
  const activeLine = getDispatchActiveLine(session);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Bill Lines</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Seq</th>
                <th className="px-3 py-2 text-left font-medium">Material</th>
                <th className="px-3 py-2 text-left font-medium">Description</th>
                <th className="px-3 py-2 text-right font-medium">Bill Qty</th>
                <th className="px-3 py-2 text-right font-medium">Scanned</th>
                <th className="px-3 py-2 text-right font-medium">Pending</th>
                <th className="px-3 py-2 text-left font-medium">Progress</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {session.lines.map((line) => (
                <DispatchLineRow
                  key={line.id}
                  line={line}
                  activeLine={activeLine}
                  session={session}
                />
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function DispatchLineRow({
  line,
  activeLine,
  session,
}: {
  line: DispatchSessionLine;
  activeLine: DispatchSessionLine | null;
  session: DispatchSession;
}) {
  const locked = isLineLocked(line, session);
  const complete = isLineComplete(line);
  const active = activeLine?.id === line.id;
  const progress = getLineProgress(line);

  return (
    <tr className={active ? 'border-t bg-sky-50/70' : 'border-t'}>
      <td className="px-3 py-3 font-mono text-xs">{line.sequence_no}</td>
      <td className="px-3 py-3">
        <div className="font-mono text-xs font-semibold">{line.material_code}</div>
        <div className="text-xs text-muted-foreground">{line.batch_number || '-'}</div>
      </td>
      <td className="px-3 py-3">{line.material_description || '-'}</td>
      <td className="px-3 py-3 text-right">{formatQty(line.bill_qty, line.uom)}</td>
      <td className="px-3 py-3 text-right">{formatQty(line.scanned_qty, line.uom)}</td>
      <td className="px-3 py-3 text-right">{formatQty(line.pending_qty || line.remaining_qty, line.uom)}</td>
      <td className="px-3 py-3">
        <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-green-500" style={{ width: `${progress}%` }} />
        </div>
      </td>
      <td className="px-3 py-3">
        {complete && (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Complete
          </Badge>
        )}
        {active && !complete && (
          <Badge className="bg-sky-100 text-sky-800 border-sky-200">
            <ScanLine className="mr-1 h-3 w-3" />
            Active
          </Badge>
        )}
        {locked && (
          <Badge className="bg-slate-100 text-slate-700 border-slate-200">
            <Lock className="mr-1 h-3 w-3" />
            Locked
          </Badge>
        )}
      </td>
    </tr>
  );
}

function ActiveLinePanel({ session }: { session: DispatchSession }) {
  const activeLine = getDispatchActiveLine(session);

  if (!activeLine) {
    return (
      <div className="rounded-md border bg-green-50 p-4">
        <div className="flex items-center gap-2 font-semibold text-green-800">
          <CheckCircle2 className="h-4 w-4" />
          Ready to dispatch
        </div>
        <p className="mt-1 text-sm text-green-700">All bill lines are scanned and waiting for final confirmation.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-background p-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <ScanLine className="h-4 w-4 text-sky-700" />
        Current Item {activeLine.sequence_no}
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Metric label="Material" value={activeLine.material_code} />
        <Metric label="Pending" value={formatQty(activeLine.pending_qty || activeLine.remaining_qty, activeLine.uom)} />
        <Metric label="Batch" value={activeLine.batch_number || '-'} />
        <Metric label="Warehouse" value={activeLine.warehouse_code || '-'} />
      </div>
      <p className="mt-3 text-sm font-medium">{activeLine.material_description || '-'}</p>
    </div>
  );
}

function RecentScanLogs({ logs }: { logs: DispatchScanLog[] }) {
  const recentLogs = useMemo(() => logs.slice(0, 10), [logs]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Scan Audit</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {recentLogs.length === 0 && (
          <p className="text-sm text-muted-foreground">No scans recorded for this session.</p>
        )}
        {recentLogs.map((log) => (
          <div
            key={log.id}
            className={
              log.result === 'ACCEPTED'
                ? 'rounded-md border border-green-200 bg-green-50 p-3'
                : 'rounded-md border border-red-200 bg-red-50 p-3'
            }
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-2">
                {log.result === 'ACCEPTED' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-700" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0 text-red-700" />
                )}
                <span className="truncate font-mono text-xs">{log.raw_barcode}</span>
              </div>
              <Badge
                className={
                  log.result === 'ACCEPTED'
                    ? 'bg-green-100 text-green-800 border-green-200'
                    : 'bg-red-100 text-red-800 border-red-200'
                }
              >
                {log.result}
              </Badge>
            </div>
            <p className="mt-2 text-sm">{formatDispatchScanMessage(log)}</p>
            <div className="mt-1 text-xs text-muted-foreground">
              {(log.scan_type || log.entity_type).replaceAll('_', ' ')} · {log.material_code || '-'} ·{' '}
              {formatDateTime(log.scanned_at)}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function SessionTable({
  title,
  rows,
  selectedId,
  onOpen,
  mode,
  loading,
}: {
  title: string;
  rows: DispatchSession[];
  selectedId: number | null;
  onOpen: (sessionId: number) => void;
  mode: DispatchTab;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Bill</th>
                <th className="px-3 py-2 text-left font-medium">Customer</th>
                <th className="px-3 py-2 text-right font-medium">Items</th>
                <th className="px-3 py-2 text-right font-medium">Scanned</th>
                <th className="px-3 py-2 text-right font-medium">Pending</th>
                <th className="px-3 py-2 text-left font-medium">User</th>
                <th className="px-3 py-2 text-left font-medium">Time</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td className="px-3 py-6 text-center text-muted-foreground" colSpan={9}>
                    Loading dispatches...
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-center text-muted-foreground" colSpan={9}>
                    No dispatches found.
                  </td>
                </tr>
              )}
              {!loading &&
                rows.map((session) => (
                  <tr
                    key={session.id}
                    className={selectedId === session.id ? 'border-t bg-sky-50/70' : 'border-t'}
                  >
                    <td className="px-3 py-3 font-mono text-xs">{session.bill_number}</td>
                    <td className="px-3 py-3">{session.customer_name || session.customer_code || '-'}</td>
                    <td className="px-3 py-3 text-right">
                      {session.completed_line_count}/{session.line_count}
                    </td>
                    <td className="px-3 py-3 text-right">{formatQty(session.total_scanned_qty)}</td>
                    <td className="px-3 py-3 text-right">{formatQty(session.pending_qty)}</td>
                    <td className="px-3 py-3">{mode === 'completed' ? session.completed_by_name || '-' : session.created_by_name || '-'}</td>
                    <td className="px-3 py-3">
                      {mode === 'completed'
                        ? formatDateTime(session.completed_at || session.dispatched_at)
                        : mode === 'closed'
                          ? formatDateTime(session.closed_at || session.cancelled_at)
                          : formatDateTime(session.started_at || session.created_at)}
                    </td>
                    <td className="px-3 py-3">
                      <Badge className={statusBadgeClass(session.status)}>
                        {SESSION_STATUS_LABEL[session.status] ?? session.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => onOpen(session.id)}>
                        {mode === 'active' ? 'Continue' : 'View'}
                      </Button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function DispatchSettingsPanel() {
  const { data: settings } = useDispatchSettings();
  const updateSettings = useUpdateDispatchSettings();

  const toggle = async (key: keyof typeof settings, checked: boolean) => {
    if (!settings) return;
    try {
      await updateSettings.mutateAsync({ [key]: checked });
      toast.success('Dispatch setting updated');
    } catch (err: unknown) {
      toastBarcodeError(err, 'Unable to update dispatch setting.');
    }
  };

  if (!settings) return null;

  const rows: Array<[keyof typeof settings, string]> = [
    ['allow_partial_dispatch', 'Allow partial dispatch'],
    ['allow_partial_pallet_dispatch', 'Allow partial pallet dispatch'],
    ['allow_box_dispatch_from_pallet', 'Allow box dispatch from pallet'],
    ['require_sequential_item_scanning', 'Require sequential item scanning'],
    ['require_sap_sync_on_completion', 'Require SAP sync on completion'],
    ['allow_manual_close', 'Allow manual close'],
    ['allow_admin_override', 'Allow admin override'],
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings className="h-4 w-4" />
          Dispatch Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {rows.map(([key, label]) => (
          <div key={key} className="flex items-center justify-between rounded-md border p-3">
            <span className="text-sm font-medium">{label}</span>
            <Switch
              checked={Boolean(settings[key])}
              onChange={(checked) => toggle(key, checked)}
              disabled={updateSettings.isPending}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function BarcodeDispatchPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<DispatchTab>('active');
  const [billNumber, setBillNumber] = useState('');
  const [lookupBill, setLookupBill] = useState<DispatchBillLookupResponse | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [closeReason, setCloseReason] = useState('');
  const [filters, setFilters] = useState({ bill_number: '', customer: '', from_date: '', to_date: '' });

  const lookupMutation = useLookupDispatchBill();
  const createSessionMutation = useCreateDispatchSession();
  const submitScanMutation = useSubmitDispatchScan();
  const completeMutation = useDispatchSessionDispatch();
  const closeMutation = useCloseDispatchSession();
  const cancelMutation = useCancelDispatchSession();
  const retrySapMutation = useRetryDispatchSapSync();

  const activeSessions = useDispatchSessions({ ...filters, status_group: 'active' });
  const completedSessions = useDispatchSessions({ ...filters, status_group: 'completed' });
  const closedSessions = useDispatchSessions({ ...filters, status_group: 'closed' });
  const sessionQuery = useDispatchSession(selectedSessionId);
  const session = sessionQuery.data ?? null;
  const { data: scanLogs = [] } = useDispatchScanLogs(selectedSessionId);

  const rowsByTab = {
    active: activeSessions.data ?? [],
    completed: completedSessions.data ?? [],
    closed: closedSessions.data ?? [],
  };
  const loadingByTab = {
    active: activeSessions.isLoading,
    completed: completedSessions.isLoading,
    closed: closedSessions.isLoading,
  };

  const trimmedBillNumber = billNumber.trim();
  const isSessionClosed = Boolean(session && CLOSED_STATUSES.has(session.status));
  const scanEnabled = canSubmitDispatchScan(session);
  const completeEnabled = canMarkDispatchComplete(session);

  const handleLookup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!trimmedBillNumber) {
      toast.error('Bill number is required');
      return;
    }

    try {
      const result = await lookupMutation.mutateAsync({ bill_number: trimmedBillNumber });
      setLookupBill(result);
      toast.success(`Bill ${result.bill_number} loaded from SAP`);
    } catch (err: unknown) {
      toastBarcodeError(err, 'Unable to fetch bill details from SAP.');
    }
  };

  const handleStartSession = async () => {
    if (!trimmedBillNumber) {
      toast.error('Bill number is required');
      return;
    }

    try {
      const result = await createSessionMutation.mutateAsync({ bill_number: trimmedBillNumber });
      setSelectedSessionId(result.id);
      setLookupBill(null);
      setTab('active');
      toast.success(`Dispatch session created for bill ${result.bill_number}`);
    } catch (err: unknown) {
      toastBarcodeError(err, 'Unable to start dispatch session.');
    }
  };

  const handleScan = async (barcode: string) => {
    if (!session || !scanEnabled) {
      toast.error('No active dispatch line is ready for scanning');
      return;
    }

    try {
      const result = await submitScanMutation.mutateAsync({
        sessionId: session.id,
        data: {
          barcode,
          device_id: 'web-dispatch-screen',
          request_id: getRequestId(),
        },
      });

      if (result.scan.result === 'ACCEPTED') {
        toast.success(formatDispatchScanMessage(result.scan));
      } else {
        toast.warning(formatDispatchScanMessage(result.scan));
      }
    } catch (err: unknown) {
      toastBarcodeError(err, 'Unable to submit dispatch scan.');
    }
  };

  const handleComplete = async () => {
    if (!session || !completeEnabled) return;

    try {
      const result = await completeMutation.mutateAsync(session.id);
      setTab(result.status === 'COMPLETED' ? 'completed' : 'completed');
      toast.success(`Bill ${result.bill_number} completed`);
    } catch (err: unknown) {
      toastBarcodeError(err, 'Unable to complete dispatch.');
    }
  };

  const handleClose = async () => {
    if (!session || !closeReason.trim()) {
      toast.error('Close reason is required');
      return;
    }
    try {
      await closeMutation.mutateAsync({
        sessionId: session.id,
        data: { reason: closeReason.trim() },
      });
      setCloseReason('');
      setTab('closed');
      toast.success('Dispatch session closed');
    } catch (err: unknown) {
      toastBarcodeError(err, 'Unable to close dispatch session.');
    }
  };

  const handleCancel = async () => {
    if (!session || !closeReason.trim()) {
      toast.error('Cancel reason is required');
      return;
    }
    try {
      await cancelMutation.mutateAsync({
        sessionId: session.id,
        data: { reason: closeReason.trim() },
      });
      setCloseReason('');
      setTab('closed');
      toast.success('Dispatch session cancelled');
    } catch (err: unknown) {
      toastBarcodeError(err, 'Unable to cancel dispatch session.');
    }
  };

  const handleRetrySap = async () => {
    if (!session) return;
    try {
      await retrySapMutation.mutateAsync(session.id);
      toast.success('SAP sync retry submitted');
    } catch (err: unknown) {
      toastBarcodeError(err, 'Unable to retry SAP sync.');
    }
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Barcode Dispatch"
        description="Manage SAP bill dispatches by item, box, and pallet scans"
      >
        <Button variant="outline" onClick={() => navigate('/barcode/dispatch/reports')}>
          <Download className="h-4 w-4" />
          Reports
        </Button>
      </DashboardHeader>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <form onSubmit={handleLookup} className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto]">
                <div className="space-y-2">
                  <Label htmlFor="dispatch-bill-number">Bill Number</Label>
                  <Input
                    id="dispatch-bill-number"
                    value={billNumber}
                    onChange={(event) => setBillNumber(event.target.value)}
                    placeholder="SAP billing document / invoice number"
                    autoComplete="off"
                  />
                </div>
                <div className="flex flex-col gap-2 self-end sm:flex-row lg:justify-end">
                  <Button type="submit" variant="outline" disabled={lookupMutation.isPending}>
                    {lookupMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileSearch className="h-4 w-4" />
                    )}
                    Lookup
                  </Button>
                  <Button
                    type="button"
                    onClick={handleStartSession}
                    disabled={createSessionMutation.isPending}
                  >
                    {createSessionMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    Create Dispatch
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {lookupBill && <BillLookupSummary bill={lookupBill} />}

          <Card>
            <CardContent className="grid grid-cols-1 gap-3 p-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="dispatch-filter-bill">Bill</Label>
                <Input
                  id="dispatch-filter-bill"
                  value={filters.bill_number}
                  onChange={(event) => setFilters((current) => ({ ...current, bill_number: event.target.value }))}
                  placeholder="Search bill"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dispatch-filter-customer">Customer</Label>
                <Input
                  id="dispatch-filter-customer"
                  value={filters.customer}
                  onChange={(event) => setFilters((current) => ({ ...current, customer: event.target.value }))}
                  placeholder="Search customer"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dispatch-filter-from">From</Label>
                <Input
                  id="dispatch-filter-from"
                  type="date"
                  value={filters.from_date}
                  onChange={(event) => setFilters((current) => ({ ...current, from_date: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dispatch-filter-to">To</Label>
                <Input
                  id="dispatch-filter-to"
                  type="date"
                  value={filters.to_date}
                  onChange={(event) => setFilters((current) => ({ ...current, to_date: event.target.value }))}
                />
              </div>
            </CardContent>
          </Card>

          <Tabs value={tab} onValueChange={(value) => setTab(value as DispatchTab)}>
            <TabsList className="grid h-auto w-full grid-cols-3">
              <TabsTrigger value="active">Active Dispatch</TabsTrigger>
              <TabsTrigger value="completed">Completed Dispatch</TabsTrigger>
              <TabsTrigger value="closed">Closed Dispatch</TabsTrigger>
            </TabsList>
            <TabsContent value="active">
              <SessionTable
                title="Active Dispatch"
                rows={rowsByTab.active}
                selectedId={selectedSessionId}
                onOpen={setSelectedSessionId}
                mode="active"
                loading={loadingByTab.active}
              />
            </TabsContent>
            <TabsContent value="completed">
              <SessionTable
                title="Completed Dispatch"
                rows={rowsByTab.completed}
                selectedId={selectedSessionId}
                onOpen={setSelectedSessionId}
                mode="completed"
                loading={loadingByTab.completed}
              />
            </TabsContent>
            <TabsContent value="closed">
              <SessionTable
                title="Closed Dispatch"
                rows={rowsByTab.closed}
                selectedId={selectedSessionId}
                onOpen={setSelectedSessionId}
                mode="closed"
                loading={loadingByTab.closed}
              />
            </TabsContent>
          </Tabs>
        </div>

        <DispatchSettingsPanel />
      </div>

      {sessionQuery.isLoading && selectedSessionId && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">Loading dispatch details...</CardContent>
        </Card>
      )}

      {session && (
        <>
          <SessionSummary session={session} />

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="space-y-4">
              <DispatchLines session={session} />
              <ActiveLinePanel session={session} />
              <RecentScanLogs logs={scanLogs} />
            </div>

            <div className="space-y-4">
              {scanEnabled ? (
                <BarcodeScanner
                  onScan={handleScan}
                  placeholder="Scan item, box, or pallet barcode..."
                  autoFocusInput
                />
              ) : (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 font-semibold">
                      <PackageCheck className="h-4 w-4 text-green-700" />
                      Scanner Locked
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {isSessionClosed ? 'This dispatch cannot accept more scans.' : 'All required quantities are scanned.'}
                    </p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardContent className="space-y-3 p-4">
                  <Button
                    className="w-full"
                    onClick={handleComplete}
                    disabled={!completeEnabled || completeMutation.isPending}
                  >
                    {completeMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ClipboardCheck className="h-4 w-4" />
                    )}
                    Complete Dispatch
                  </Button>

                  {session.status === 'SAP_SYNC_FAILED' && (
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={handleRetrySap}
                      disabled={retrySapMutation.isPending}
                    >
                      {retrySapMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      Retry SAP Sync
                    </Button>
                  )}

                  {!isSessionClosed && (
                    <div className="space-y-2">
                      <Label htmlFor="dispatch-close-reason">Close / Cancel Reason</Label>
                      <Textarea
                        id="dispatch-close-reason"
                        value={closeReason}
                        onChange={(event) => setCloseReason(event.target.value)}
                        placeholder="Required before closing or cancelling"
                      />
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <Button
                          variant="outline"
                          onClick={handleClose}
                          disabled={closeMutation.isPending || !closeReason.trim()}
                        >
                          {closeMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Lock className="h-4 w-4" />
                          )}
                          Close
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleCancel}
                          disabled={cancelMutation.isPending || !closeReason.trim()}
                        >
                          {cancelMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {isSessionClosed && (
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => navigate(`/barcode/dispatch/reports?session=${session.id}`)}
                    >
                      <Download className="h-4 w-4" />
                      View Report
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
