import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Filter,
  Loader2,
  Package,
  Search,
  Truck,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  NativeSelect,
  SelectOption,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import {
  useDispatchBoxReport,
  useDispatchDetailReport,
  useDispatchPalletReport,
  useDispatchRejectedScanReport,
  useDispatchReport,
} from '../api';
import type {
  DispatchBoxReportRow,
  DispatchPalletReportRow,
  DispatchRejectedScanReportRow,
  DispatchReportFilters,
  DispatchSummaryReportRow,
} from '../types';

type ReportTab = 'dispatch' | 'pallets' | 'boxes' | 'rejected';
type CsvRow = Record<string, string | number | boolean | null | undefined>;

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-';
  return new Date(value).toLocaleString('en-IN');
}

function formatNumber(value: string | number | null | undefined) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return String(value ?? '-');
  return numeric.toLocaleString('en-IN', { maximumFractionDigits: 3 });
}

function formatQtyWithBoxes(
  qty: string | number | null | undefined,
  boxes?: string | number | null,
  uom = 'PCS',
) {
  const qtyText = `${formatNumber(qty)} ${uom}`.trim();
  const boxValue = Number(boxes ?? 0);
  if (!Number.isFinite(boxValue) || boxValue <= 0) return qtyText;
  return `${qtyText} / ${formatNumber(boxValue)} Boxes`;
}

function downloadCsv(filename: string, rows: CsvRow[]) {
  if (!rows.length) {
    toast.info('No rows to export');
    return;
  }
  const headers = Object.keys(rows[0]);
  const escape = (value: CsvRow[string]) => {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  const csv = [headers.join(','), ...rows.map((row) => headers.map((header) => escape(row[header])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${filename}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function SummaryTile({
  label,
  value,
  icon,
  tone = 'slate',
}: {
  label: string;
  value: string;
  icon: ReactNode;
  tone?: 'slate' | 'emerald' | 'amber' | 'rose' | 'cyan';
}) {
  const toneClass = {
    slate: 'border-slate-200 bg-white',
    emerald: 'border-emerald-200 bg-emerald-50/70',
    amber: 'border-amber-200 bg-amber-50/70',
    rose: 'border-rose-200 bg-rose-50/70',
    cyan: 'border-cyan-200 bg-cyan-50/70',
  }[tone];

  return (
    <div className={cn('rounded-md border p-4', toneClass)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold leading-none">{value}</p>
    </div>
  );
}

function FilterPanel({
  filters,
  setFilters,
}: {
  filters: DispatchReportFilters;
  setFilters: (filters: DispatchReportFilters) => void;
}) {
  const update = (key: keyof DispatchReportFilters, value: string) => {
    setFilters({ ...filters, [key]: value });
  };

  return (
    <section className="rounded-md border bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Filter className="h-4 w-4 text-slate-700" />
        <h2 className="text-base font-semibold">Filters</h2>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <div className="space-y-2">
          <Label htmlFor="dispatch-report-from">From</Label>
          <Input
            id="dispatch-report-from"
            type="date"
            value={filters.from_date || ''}
            onChange={(event) => update('from_date', event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dispatch-report-to">To</Label>
          <Input
            id="dispatch-report-to"
            type="date"
            value={filters.to_date || ''}
            onChange={(event) => update('to_date', event.target.value)}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="dispatch-report-search">Search</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="dispatch-report-search"
              value={filters.bill_number || ''}
              onChange={(event) => update('bill_number', event.target.value)}
              className="pl-9"
              placeholder="Bill number"
            />
          </div>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="dispatch-report-customer">Customer</Label>
          <Input
            id="dispatch-report-customer"
            value={filters.customer || ''}
            onChange={(event) => update('customer', event.target.value)}
            placeholder="Customer"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dispatch-report-status">Status</Label>
          <NativeSelect
            id="dispatch-report-status"
            value={filters.status || ''}
            onChange={(event) => update('status', event.target.value)}
          >
            <SelectOption value="">All</SelectOption>
            <SelectOption value="ACTIVE">Active</SelectOption>
            <SelectOption value="PARTIAL">In progress</SelectOption>
            <SelectOption value="COMPLETED">Completed</SelectOption>
            <SelectOption value="CLOSED">Closed</SelectOption>
            <SelectOption value="CANCELLED">Cancelled</SelectOption>
            <SelectOption value="SAP_SYNC_FAILED">SAP failed</SelectOption>
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="dispatch-report-material">Material</Label>
          <Input
            id="dispatch-report-material"
            value={filters.material_code || ''}
            onChange={(event) => update('material_code', event.target.value)}
            placeholder="Code"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="dispatch-report-pallet">Pallet</Label>
          <Input
            id="dispatch-report-pallet"
            value={filters.pallet_barcode || ''}
            onChange={(event) => update('pallet_barcode', event.target.value)}
            placeholder="Pallet barcode"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="dispatch-report-box">Box</Label>
          <Input
            id="dispatch-report-box"
            value={filters.box_barcode || ''}
            onChange={(event) => update('box_barcode', event.target.value)}
            placeholder="Box barcode"
          />
        </div>
      </div>
    </section>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      Loading report
    </div>
  );
}

function EmptyState() {
  return <div className="p-8 text-center text-sm text-muted-foreground">No rows found.</div>;
}

function ReportShell({
  title,
  count,
  onExport,
  children,
}: {
  title: string;
  count: number;
  onExport: () => void;
  children: ReactNode;
}) {
  return (
    <Card className="rounded-md">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-slate-700" />
          <h2 className="text-base font-semibold">{title}</h2>
          <Badge className="border-slate-200 bg-slate-50 text-slate-700">{count.toLocaleString('en-IN')}</Badge>
        </div>
        <Button variant="outline" size="sm" onClick={onExport}>
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}

function DispatchSummaryList({ rows, loading }: { rows: DispatchSummaryReportRow[]; loading: boolean }) {
  if (loading) return <LoadingState />;
  if (!rows.length) return <EmptyState />;

  return (
    <div className="divide-y">
      {rows.map((row) => (
        <div key={row.session_id} className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1.2fr)_420px]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-mono text-sm font-semibold">{row.bill_number}</p>
              <Badge>{row.status}</Badge>
              <Badge className="border-slate-200 bg-slate-50 text-slate-700">
                {row.sap_sync_status?.replaceAll('_', ' ') || '-'}
              </Badge>
            </div>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {row.customer_name || row.customer_code || '-'} · {row.delivery_number || 'No delivery ref'}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Started {formatDateTime(row.started_at)} · Completed {formatDateTime(row.completed_at)}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <SummaryTile label="Expected" value={formatQtyWithBoxes(row.total_expected_qty, row.total_expected_boxes)} icon={<Package className="h-4 w-4" />} tone="cyan" />
            <SummaryTile label="Dispatched" value={formatQtyWithBoxes(row.total_dispatched_qty, row.total_dispatched_boxes)} icon={<CheckCircle2 className="h-4 w-4" />} tone="emerald" />
            <SummaryTile label="Pending" value={formatQtyWithBoxes(row.pending_qty, row.pending_boxes)} icon={<AlertTriangle className="h-4 w-4" />} tone="amber" />
          </div>
        </div>
      ))}
    </div>
  );
}

function PalletReportList({ rows, loading }: { rows: DispatchPalletReportRow[]; loading: boolean }) {
  if (loading) return <LoadingState />;
  if (!rows.length) return <EmptyState />;

  return (
    <div className="grid gap-3 p-4 lg:grid-cols-2">
      {rows.map((row) => (
        <div key={row.pallet_id} className="rounded-md border bg-slate-50/50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-mono text-sm font-semibold">{row.pallet_barcode}</p>
              <p className="mt-1 text-xs text-muted-foreground">{row.bill_number || 'No bill linked'}</p>
            </div>
            <Badge>{row.pallet_status}</Badge>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <SummaryTile label="Total" value={row.total_boxes.toLocaleString('en-IN')} icon={<Boxes className="h-4 w-4" />} />
            <SummaryTile label="Done" value={row.dispatched_boxes.toLocaleString('en-IN')} icon={<CheckCircle2 className="h-4 w-4" />} tone="emerald" />
            <SummaryTile label="Left" value={row.remaining_boxes.toLocaleString('en-IN')} icon={<Package className="h-4 w-4" />} tone="amber" />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{formatDateTime(row.dispatched_time)}</p>
        </div>
      ))}
    </div>
  );
}

function BoxReportList({ rows, loading }: { rows: DispatchBoxReportRow[]; loading: boolean }) {
  if (loading) return <LoadingState />;
  if (!rows.length) return <EmptyState />;

  return (
    <div className="divide-y">
      {rows.map((row) => (
        <div key={row.box_id} className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-mono text-sm font-semibold">{row.box_barcode}</p>
              <Badge>{row.box_status}</Badge>
              {row.removed_from_pallet && (
                <Badge className="border-amber-200 bg-amber-50 text-amber-700">Removed from pallet</Badge>
              )}
            </div>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {row.material_code} · {row.pallet_barcode || 'Loose box'}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(row.dispatched_time)}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <SummaryTile label="Qty" value={`${formatNumber(row.quantity)} ${row.uom}`} icon={<Package className="h-4 w-4" />} tone="cyan" />
            <SummaryTile label="Bill" value={row.bill_number || '-'} icon={<Truck className="h-4 w-4" />} />
          </div>
        </div>
      ))}
    </div>
  );
}

function RejectedReportList({ rows, loading }: { rows: DispatchRejectedScanReportRow[]; loading: boolean }) {
  if (loading) return <LoadingState />;
  if (!rows.length) return <EmptyState />;

  return (
    <div className="divide-y">
      {rows.map((row) => (
        <div key={row.scan_id} className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-700" />
              <p className="truncate font-mono text-sm font-semibold">{row.barcode}</p>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {row.rejection_reason || row.rejection_code || 'Rejected scan'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Badge className="border-rose-200 bg-rose-50 text-rose-700">{row.scan_type}</Badge>
            <span className="text-xs text-muted-foreground">{row.bill_number}</span>
            <span className="text-xs text-muted-foreground">{formatDateTime(row.scan_time)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function BarcodeDispatchReportsPage() {
  const [searchParams] = useSearchParams();
  const sessionId = Number(searchParams.get('session') || 0) || null;
  const [tab, setTab] = useState<ReportTab>('dispatch');
  const [filters, setFilters] = useState<DispatchReportFilters>({});

  const cleanFilters = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(filters).filter(([, value]) => String(value || '').trim()),
      ) as DispatchReportFilters,
    [filters],
  );

  const dispatchReport = useDispatchReport(cleanFilters);
  const palletReport = useDispatchPalletReport(cleanFilters);
  const boxReport = useDispatchBoxReport(cleanFilters);
  const rejectedReport = useDispatchRejectedScanReport(cleanFilters);
  const detailReport = useDispatchDetailReport(sessionId);

  const dispatchRows = dispatchReport.data ?? [];
  const palletRows = palletReport.data ?? [];
  const boxRows = boxReport.data ?? [];
  const rejectedRows = rejectedReport.data ?? [];

  const totalDispatched = dispatchRows.reduce((sum, row) => sum + Number(row.total_dispatched_qty || 0), 0);
  const totalPending = dispatchRows.reduce((sum, row) => sum + Number(row.pending_qty || 0), 0);
  const totalDispatchedBoxes = dispatchRows.reduce((sum, row) => sum + Number(row.total_dispatched_boxes || 0), 0);
  const totalPendingBoxes = dispatchRows.reduce((sum, row) => sum + Number(row.pending_boxes || 0), 0);

  return (
    <div className="space-y-5">
      <DashboardHeader
        title="Dispatch Reports"
        description="Operational dispatch history for bills, pallets, boxes, and rejected scans"
      />

      <section className="grid gap-3 md:grid-cols-4">
        <SummaryTile label="Dispatches" value={dispatchRows.length.toLocaleString('en-IN')} icon={<Truck className="h-4 w-4" />} tone="cyan" />
        <SummaryTile label="Dispatched Qty" value={formatQtyWithBoxes(totalDispatched, totalDispatchedBoxes)} icon={<CheckCircle2 className="h-4 w-4" />} tone="emerald" />
        <SummaryTile label="Pending Qty" value={formatQtyWithBoxes(totalPending, totalPendingBoxes)} icon={<Package className="h-4 w-4" />} tone="amber" />
        <SummaryTile label="Rejected Scans" value={rejectedRows.length.toLocaleString('en-IN')} icon={<AlertTriangle className="h-4 w-4" />} tone={rejectedRows.length ? 'rose' : 'slate'} />
      </section>

      <FilterPanel filters={filters} setFilters={setFilters} />

      {detailReport.data && (
        <Card className="rounded-md">
          <div className="border-b p-4">
            <h2 className="text-base font-semibold">Dispatch detail · {detailReport.data.session.bill_number}</h2>
          </div>
          <CardContent className="grid gap-3 p-4 md:grid-cols-4">
            <SummaryTile label="Customer" value={detailReport.data.session.customer_name || '-'} icon={<Truck className="h-4 w-4" />} />
            <SummaryTile label="Status" value={detailReport.data.session.status} icon={<FileSpreadsheet className="h-4 w-4" />} />
            <SummaryTile
              label="Expected"
              value={formatQtyWithBoxes(detailReport.data.session.total_expected_qty, detailReport.data.session.total_expected_boxes)}
              icon={<Package className="h-4 w-4" />}
              tone="cyan"
            />
            <SummaryTile
              label="Dispatched"
              value={formatQtyWithBoxes(detailReport.data.session.total_dispatched_qty, detailReport.data.session.total_dispatched_boxes)}
              icon={<CheckCircle2 className="h-4 w-4" />}
              tone="emerald"
            />
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={(value) => setTab(value as ReportTab)}>
        <TabsList className="grid h-auto w-full grid-cols-4 rounded-md">
          <TabsTrigger value="dispatch">Dispatch</TabsTrigger>
          <TabsTrigger value="pallets">Pallets</TabsTrigger>
          <TabsTrigger value="boxes">Boxes</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value="dispatch">
          <ReportShell
            title="Dispatch summary"
            count={dispatchRows.length}
            onExport={() => downloadCsv('dispatch-summary-report', dispatchRows)}
          >
            <DispatchSummaryList rows={dispatchRows} loading={dispatchReport.isLoading} />
          </ReportShell>
        </TabsContent>

        <TabsContent value="pallets">
          <ReportShell
            title="Pallet dispatch"
            count={palletRows.length}
            onExport={() => downloadCsv('dispatch-pallet-report', palletRows)}
          >
            <PalletReportList rows={palletRows} loading={palletReport.isLoading} />
          </ReportShell>
        </TabsContent>

        <TabsContent value="boxes">
          <ReportShell
            title="Box dispatch"
            count={boxRows.length}
            onExport={() => downloadCsv('dispatch-box-report', boxRows)}
          >
            <BoxReportList rows={boxRows} loading={boxReport.isLoading} />
          </ReportShell>
        </TabsContent>

        <TabsContent value="rejected">
          <ReportShell
            title="Rejected scans"
            count={rejectedRows.length}
            onExport={() => downloadCsv('dispatch-rejected-scan-report', rejectedRows)}
          >
            <RejectedReportList rows={rejectedRows} loading={rejectedReport.isLoading} />
          </ReportShell>
        </TabsContent>
      </Tabs>
    </div>
  );
}
