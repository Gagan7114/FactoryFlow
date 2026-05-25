import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
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
  CardHeader,
  CardTitle,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui';

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
  return new Date(value).toLocaleString();
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
    <Card>
      <CardContent className="grid grid-cols-1 gap-3 p-4 md:grid-cols-4">
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
        <div className="space-y-2">
          <Label htmlFor="dispatch-report-bill">Bill</Label>
          <Input
            id="dispatch-report-bill"
            value={filters.bill_number || ''}
            onChange={(event) => update('bill_number', event.target.value)}
            placeholder="Bill number"
          />
        </div>
        <div className="space-y-2">
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
          <Input
            id="dispatch-report-status"
            value={filters.status || ''}
            onChange={(event) => update('status', event.target.value)}
            placeholder="COMPLETED"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dispatch-report-material">Material</Label>
          <Input
            id="dispatch-report-material"
            value={filters.material_code || ''}
            onChange={(event) => update('material_code', event.target.value)}
            placeholder="Material code"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dispatch-report-pallet">Pallet</Label>
          <Input
            id="dispatch-report-pallet"
            value={filters.pallet_barcode || ''}
            onChange={(event) => update('pallet_barcode', event.target.value)}
            placeholder="Pallet barcode"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dispatch-report-box">Box</Label>
          <Input
            id="dispatch-report-box"
            value={filters.box_barcode || ''}
            onChange={(event) => update('box_barcode', event.target.value)}
            placeholder="Box barcode"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td className="px-3 py-6 text-center text-muted-foreground" colSpan={colSpan}>
        <Loader2 className="mx-auto h-4 w-4 animate-spin" />
      </td>
    </tr>
  );
}

function EmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td className="px-3 py-6 text-center text-muted-foreground" colSpan={colSpan}>
        No report rows found.
      </td>
    </tr>
  );
}

function ReportCard({
  title,
  onExport,
  children,
}: {
  title: string;
  onExport: () => void;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSpreadsheet className="h-4 w-4" />
            {title}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function DispatchSummaryTable({
  rows,
  loading,
}: {
  rows: DispatchSummaryReportRow[];
  loading: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[1100px] text-sm">
        <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Session</th>
            <th className="px-3 py-2 text-left font-medium">Bill</th>
            <th className="px-3 py-2 text-left font-medium">Customer</th>
            <th className="px-3 py-2 text-left font-medium">Status</th>
            <th className="px-3 py-2 text-left font-medium">Created By</th>
            <th className="px-3 py-2 text-left font-medium">Completed By</th>
            <th className="px-3 py-2 text-right font-medium">Expected</th>
            <th className="px-3 py-2 text-right font-medium">Dispatched</th>
            <th className="px-3 py-2 text-right font-medium">Pending</th>
            <th className="px-3 py-2 text-left font-medium">SAP</th>
          </tr>
        </thead>
        <tbody>
          {loading && <LoadingRow colSpan={10} />}
          {!loading && rows.length === 0 && <EmptyRow colSpan={10} />}
          {!loading &&
            rows.map((row) => (
              <tr key={row.session_id} className="border-t">
                <td className="px-3 py-3 font-mono text-xs">{row.session_id}</td>
                <td className="px-3 py-3 font-mono text-xs">{row.bill_number}</td>
                <td className="px-3 py-3">{row.customer_name || row.customer_code || '-'}</td>
                <td className="px-3 py-3">
                  <Badge>{row.status}</Badge>
                </td>
                <td className="px-3 py-3">{row.created_by || '-'}</td>
                <td className="px-3 py-3">{row.completed_by || '-'}</td>
                <td className="px-3 py-3 text-right">{row.total_expected_qty}</td>
                <td className="px-3 py-3 text-right">{row.total_dispatched_qty}</td>
                <td className="px-3 py-3 text-right">{row.pending_qty}</td>
                <td className="px-3 py-3">{row.sap_sync_status.replaceAll('_', ' ')}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

function PalletReportTable({ rows, loading }: { rows: DispatchPalletReportRow[]; loading: boolean }) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Pallet</th>
            <th className="px-3 py-2 text-left font-medium">Status</th>
            <th className="px-3 py-2 text-right font-medium">Total Boxes</th>
            <th className="px-3 py-2 text-right font-medium">Dispatched</th>
            <th className="px-3 py-2 text-right font-medium">Remaining</th>
            <th className="px-3 py-2 text-left font-medium">Bill</th>
            <th className="px-3 py-2 text-left font-medium">Dispatched Time</th>
          </tr>
        </thead>
        <tbody>
          {loading && <LoadingRow colSpan={7} />}
          {!loading && rows.length === 0 && <EmptyRow colSpan={7} />}
          {!loading &&
            rows.map((row) => (
              <tr key={row.pallet_id} className="border-t">
                <td className="px-3 py-3 font-mono text-xs">{row.pallet_barcode}</td>
                <td className="px-3 py-3">{row.pallet_status}</td>
                <td className="px-3 py-3 text-right">{row.total_boxes}</td>
                <td className="px-3 py-3 text-right">{row.dispatched_boxes}</td>
                <td className="px-3 py-3 text-right">{row.remaining_boxes}</td>
                <td className="px-3 py-3 font-mono text-xs">{row.bill_number || '-'}</td>
                <td className="px-3 py-3">{formatDateTime(row.dispatched_time)}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

function BoxReportTable({ rows, loading }: { rows: DispatchBoxReportRow[]; loading: boolean }) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[960px] text-sm">
        <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Box</th>
            <th className="px-3 py-2 text-left font-medium">Material</th>
            <th className="px-3 py-2 text-right font-medium">Qty</th>
            <th className="px-3 py-2 text-left font-medium">Pallet</th>
            <th className="px-3 py-2 text-left font-medium">Status</th>
            <th className="px-3 py-2 text-left font-medium">Bill</th>
            <th className="px-3 py-2 text-left font-medium">Removed</th>
            <th className="px-3 py-2 text-left font-medium">Dispatched Time</th>
          </tr>
        </thead>
        <tbody>
          {loading && <LoadingRow colSpan={8} />}
          {!loading && rows.length === 0 && <EmptyRow colSpan={8} />}
          {!loading &&
            rows.map((row) => (
              <tr key={row.box_id} className="border-t">
                <td className="px-3 py-3 font-mono text-xs">{row.box_barcode}</td>
                <td className="px-3 py-3 font-mono text-xs">{row.material_code}</td>
                <td className="px-3 py-3 text-right">{row.quantity} {row.uom}</td>
                <td className="px-3 py-3 font-mono text-xs">{row.pallet_barcode || '-'}</td>
                <td className="px-3 py-3">{row.box_status}</td>
                <td className="px-3 py-3 font-mono text-xs">{row.bill_number || '-'}</td>
                <td className="px-3 py-3">{row.removed_from_pallet ? 'Yes' : 'No'}</td>
                <td className="px-3 py-3">{formatDateTime(row.dispatched_time)}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

function RejectedReportTable({
  rows,
  loading,
}: {
  rows: DispatchRejectedScanReportRow[];
  loading: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Barcode</th>
            <th className="px-3 py-2 text-left font-medium">Type</th>
            <th className="px-3 py-2 text-left font-medium">Reason</th>
            <th className="px-3 py-2 text-left font-medium">Bill</th>
            <th className="px-3 py-2 text-left font-medium">User</th>
            <th className="px-3 py-2 text-left font-medium">Scan Time</th>
          </tr>
        </thead>
        <tbody>
          {loading && <LoadingRow colSpan={6} />}
          {!loading && rows.length === 0 && <EmptyRow colSpan={6} />}
          {!loading &&
            rows.map((row) => (
              <tr key={row.scan_id} className="border-t">
                <td className="px-3 py-3 font-mono text-xs">{row.barcode}</td>
                <td className="px-3 py-3">{row.scan_type}</td>
                <td className="px-3 py-3">{row.rejection_reason || row.rejection_code}</td>
                <td className="px-3 py-3 font-mono text-xs">{row.bill_number}</td>
                <td className="px-3 py-3">{row.user || '-'}</td>
                <td className="px-3 py-3">{formatDateTime(row.scan_time)}</td>
              </tr>
            ))}
        </tbody>
      </table>
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

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Dispatch Reports"
        description="Review completed dispatches, pallet movement, box dispatches, and rejected scans"
      />

      <FilterPanel filters={filters} setFilters={setFilters} />

      {detailReport.data && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Dispatch Detail: {detailReport.data.session.bill_number}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <Metric label="Customer" value={detailReport.data.session.customer_name || '-'} />
              <Metric label="Status" value={detailReport.data.session.status} />
              <Metric label="Expected" value={detailReport.data.session.total_expected_qty} />
              <Metric label="Dispatched" value={detailReport.data.session.total_dispatched_qty} />
            </div>
            <DispatchSummaryTable
              rows={[
                {
                  session_id: detailReport.data.session.session_id,
                  bill_number: detailReport.data.session.bill_number,
                  delivery_number: detailReport.data.session.delivery_number,
                  customer_code: detailReport.data.session.customer_code,
                  customer_name: detailReport.data.session.customer_name,
                  status: detailReport.data.session.status,
                  created_by: '',
                  completed_by: '',
                  started_at: null,
                  completed_at: null,
                  total_expected_qty: detailReport.data.session.total_expected_qty,
                  total_dispatched_qty: detailReport.data.session.total_dispatched_qty,
                  pending_qty: '',
                  sap_sync_status: '',
                  sap_sync_error: '',
                },
              ]}
              loading={detailReport.isLoading}
            />
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={(value) => setTab(value as ReportTab)}>
        <TabsList className="grid h-auto w-full grid-cols-4">
          <TabsTrigger value="dispatch">Dispatch</TabsTrigger>
          <TabsTrigger value="pallets">Pallets</TabsTrigger>
          <TabsTrigger value="boxes">Boxes</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value="dispatch">
          <ReportCard
            title="Dispatch Summary Report"
            onExport={() => downloadCsv('dispatch-summary-report', dispatchReport.data ?? [])}
          >
            <DispatchSummaryTable
              rows={dispatchReport.data ?? []}
              loading={dispatchReport.isLoading}
            />
          </ReportCard>
        </TabsContent>

        <TabsContent value="pallets">
          <ReportCard
            title="Pallet Dispatch Report"
            onExport={() => downloadCsv('dispatch-pallet-report', palletReport.data ?? [])}
          >
            <PalletReportTable rows={palletReport.data ?? []} loading={palletReport.isLoading} />
          </ReportCard>
        </TabsContent>

        <TabsContent value="boxes">
          <ReportCard
            title="Box Dispatch Report"
            onExport={() => downloadCsv('dispatch-box-report', boxReport.data ?? [])}
          >
            <BoxReportTable rows={boxReport.data ?? []} loading={boxReport.isLoading} />
          </ReportCard>
        </TabsContent>

        <TabsContent value="rejected">
          <ReportCard
            title="Rejected Scan Report"
            onExport={() => downloadCsv('dispatch-rejected-scan-report', rejectedReport.data ?? [])}
          >
            <RejectedReportTable
              rows={rejectedReport.data ?? []}
              loading={rejectedReport.isLoading}
            />
          </ReportCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}
