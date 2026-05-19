import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Truck,
  Unlock,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { useGlobalDateRange } from '@/core/store/hooks';
import {
  type SalesDispatchGateOut,
  type SalesDispatchLock,
  type SalesDispatchReport,
  useSalesDispatchEntries,
  useSalesDispatchLock,
  useSalesDispatchReports,
  useUpdateSalesDispatchLock,
} from '@/modules/gate/api';
import { DateRangePicker, GateStatusBadge } from '@/modules/gate/components';
import { Button, Card, CardContent, Input } from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { getSalesDispatchRoutes, isSalesDispatchOutPath } from './salesDispatchRoutes';

const GATE_OUT_PENDING_STATUS = 'PRINT_COMMITTED';
const GATE_OUT_COMPLETED_STATUS = 'DISPATCHED';

export default function SalesDispatchDashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const routes = getSalesDispatchRoutes(location.pathname);
  const isGateOutMode = isSalesDispatchOutPath(location.pathname);
  const { dateRange, dateRangeAsDateObjects, setDateRange } = useGlobalDateRange();
  const [searchTerm, setSearchTerm] = useState('');
  const listParams = useMemo(() => ({
    from_date: dateRange.from,
    to_date: dateRange.to,
    search: searchTerm.trim() || undefined,
    document_type: isGateOutMode ? 'INVOICE' as const : undefined,
  }), [dateRange.from, dateRange.to, searchTerm, isGateOutMode]);

  const { data: entries = [], isFetching, refetch } = useSalesDispatchEntries(listParams);
  const { data: report, isFetching: isReportFetching } = useSalesDispatchReports(listParams);
  const { data: dispatchLock } = useSalesDispatchLock();
  const updateLock = useUpdateSalesDispatchLock();

  const gateOutPendingEntries = useMemo(() => entries.filter(
    (entry) => entry.status === GATE_OUT_PENDING_STATUS,
  ), [entries]);
  const gateOutDispatchedEntries = useMemo(() => entries.filter(
    (entry) => entry.status === GATE_OUT_COMPLETED_STATUS,
  ), [entries]);
  const displayEntries = useMemo(() => {
    if (!isGateOutMode) return entries;

    return entries
      .filter((entry) => [GATE_OUT_PENDING_STATUS, GATE_OUT_COMPLETED_STATUS].includes(entry.status))
      .sort(sortSalesDispatchOutEntries);
  }, [entries, isGateOutMode]);

  const filteredEntries = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return displayEntries;
    return displayEntries.filter((entry) => buildSalesDispatchSearchText(entry).includes(query));
  }, [displayEntries, searchTerm]);

  const counts = report?.counts;
  const pendingOutCount = counts?.ready_for_dispatch ?? gateOutPendingEntries.length;
  const completedCount = counts?.dispatched ?? entries.filter((entry) => entry.status === 'DISPATCHED').length;
  const waitingInsideCount = counts?.waiting_inside ?? entries.filter((entry) => (
    !['DISPATCHED', 'CANCELLED', 'REJECTED'].includes(entry.status)
  )).length;
  const missingPhotoCount = counts?.missing_photo ?? entries.filter((entry) => (
    !entry.truck_photo || !entry.photo_latitude || !entry.photo_longitude
  )).length;
  const gatepassPendingCount = counts?.gatepass_pending ?? entries.filter(
    (entry) => ['DOCKED', 'PHOTO_ATTACHED', 'READY_FOR_GATEPASS'].includes(entry.status),
  ).length;
  const printedNotCommittedCount = counts?.printed_not_committed ?? entries.filter(
    (entry) => entry.status === 'GATEPASS_PRINTED',
  ).length;

  const handleToggleLock = async () => {
    const isLocked = Boolean(dispatchLock?.is_locked);
    try {
      if (isLocked) {
        await updateLock.mutateAsync({ is_locked: false });
        toast.success('Docking printing unlocked');
        return;
      }

      const reason = window.prompt('Reason for locking Docking printing');
      if (reason === null) return;
      const trimmedReason = reason.trim();
      if (!trimmedReason) {
        toast.error('A reason is required to lock Docking printing');
        return;
      }
      await updateLock.mutateAsync({ is_locked: true, reason: trimmedReason });
      toast.success('Docking printing locked');
    } catch (lockError) {
      toast.error(getErrorMessage(lockError, 'Failed to update Docking lock'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {isGateOutMode ? 'Sales Dispatch Out' : 'Docking'}
          </h2>
          <p className="text-muted-foreground">
            {isGateOutMode
              ? 'View Docking-created invoice dispatches and mark vehicles out'
              : 'Dock SAP invoices, verify truck documents, and print gatepasses'}
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
          <DateRangePicker
            date={dateRangeAsDateObjects}
            onDateChange={(date) => {
              if (date && 'from' in date) {
                setDateRange(date);
              } else {
                setDateRange(undefined);
              }
            }}
          />
          <Button variant="outline" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {isFetching ? 'Refreshing' : 'Refresh'}
          </Button>
          {!isGateOutMode && (
            <Button onClick={() => navigate(routes.newEntry)}>
              <Plus className="mr-2 h-4 w-4" />
              New Entry
            </Button>
          )}
        </div>
      </div>

      {!isGateOutMode && (
        <DockingLockPanel
          lock={dispatchLock}
          isSaving={updateLock.isPending}
          onToggle={() => void handleToggleLock()}
        />
      )}

      {isGateOutMode ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={<Truck className="h-5 w-5 text-blue-600" />} label="Pending Out" value={pendingOutCount} />
          <StatCard icon={<FileText className="h-5 w-5 text-violet-600" />} label="Awaiting Gatepass" value={gatepassPendingCount} />
          <StatCard icon={<Clock className="h-5 w-5 text-amber-600" />} label="Print Not Committed" value={printedNotCommittedCount} />
          <StatCard icon={<CheckCircle2 className="h-5 w-5 text-green-600" />} label="Marked Out" value={completedCount} />
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={<Truck className="h-5 w-5 text-blue-600" />} label="Waiting Inside" value={waitingInsideCount} />
          <StatCard icon={<AlertTriangle className="h-5 w-5 text-amber-600" />} label="Missing Photo / GPS" value={missingPhotoCount} />
          <StatCard icon={<FileText className="h-5 w-5 text-violet-600" />} label="Gatepass Pending" value={gatepassPendingCount} />
          <StatCard icon={<CheckCircle2 className="h-5 w-5 text-green-600" />} label="Dispatched" value={completedCount} />
        </div>
      )}

      <ReportSnapshots
        report={report}
        isLoading={isReportFetching}
        isGateOutMode={isGateOutMode}
        gateOutPendingEntries={gateOutPendingEntries}
        gateOutDispatchedEntries={gateOutDispatchedEntries}
      />

      <section>
        <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Truck className="h-4 w-4" />
            {isGateOutMode ? 'Sales Dispatch Out Entries' : 'Docking Entries'}
          </h3>
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search entry, document, customer, vehicle"
              className="pl-9"
            />
          </div>
        </div>

        {isFetching && displayEntries.length === 0 ? (
          <EmptyState text={isGateOutMode ? 'Loading sales dispatch out entries' : 'Loading docking entries'} />
        ) : displayEntries.length === 0 ? (
          <EmptyState text={isGateOutMode ? 'No pending or completed sales dispatch out entries' : 'No docking entries yet'} />
        ) : filteredEntries.length === 0 ? (
          <EmptyState text={isGateOutMode ? 'No sales dispatch out entries match this search' : 'No docking entries match this search'} />
        ) : (
          <DispatchTable
            entries={filteredEntries}
            detailPath={routes.detail}
            gatepassPath={routes.gatepass}
            isGateOutMode={isGateOutMode}
          />
        )}
      </section>
    </div>
  );
}

function DispatchTable({
  entries,
  detailPath,
  gatepassPath,
  isGateOutMode,
}: {
  entries: SalesDispatchGateOut[];
  detailPath: (entryId: string | number) => string;
  gatepassPath: (entryId: string | number) => string;
  isGateOutMode: boolean;
}) {
  const navigate = useNavigate();

  return (
    <div className="overflow-hidden rounded-md border">
      <div className="max-h-[520px] overflow-auto">
        <table className="w-full min-w-[1100px]">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 text-left text-sm font-medium">Entry No.</th>
              <th className="p-3 text-left text-sm font-medium">SAP Document</th>
              <th className="p-3 text-left text-sm font-medium">Customer</th>
              <th className="p-3 text-left text-sm font-medium">Items</th>
              <th className="p-3 text-left text-sm font-medium">Vehicle</th>
              <th className="p-3 text-left text-sm font-medium">Gate Out</th>
              <th className="p-3 text-left text-sm font-medium">Gatepass</th>
              <th className="p-3 text-left text-sm font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                key={entry.id}
                className="cursor-pointer border-t transition-colors hover:bg-muted/50"
                onClick={() => {
                  navigate(getSalesDispatchDashboardEntryPath(entry, detailPath, gatepassPath, isGateOutMode));
                }}
              >
                <td className="whitespace-nowrap p-3 text-sm font-medium">{entry.entry_no}</td>
                <td className="whitespace-nowrap p-3 text-sm">
                  <div>{entry.sap_doc_num || entry.sap_doc_entry}</div>
                  <div className="text-xs text-muted-foreground">{formatDocumentType(entry.document_type)}</div>
                </td>
                <td className="p-3 text-sm">
                  <div className="font-medium">{entry.customer_name || '-'}</div>
                  <div className="text-xs text-muted-foreground">
                    {entry.customer_code || entry.place_of_supply || '-'}
                  </div>
                </td>
                <td className="p-3 text-sm">{entry.item_summary || summarizeItems(entry.items)}</td>
                <td className="whitespace-nowrap p-3 text-sm">{entry.vehicle_no}</td>
                <td className="whitespace-nowrap p-3 text-sm">
                  {formatDateTime(entry.gate_out_date, entry.out_time)}
                </td>
                <td className="whitespace-nowrap p-3 text-sm">
                  <GateStatusBadge
                    status={entry.gatepass_no ? 'PRINTED' : 'PENDING'}
                    label={entry.gatepass_no || 'Pending'}
                  />
                </td>
                <td className="whitespace-nowrap p-3 text-sm">
                  <GateStatusBadge
                    status={entry.status}
                    label={getSalesDispatchDashboardStatusLabel(entry.status, isGateOutMode)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DockingLockPanel({
  lock,
  isSaving,
  onToggle,
}: {
  lock?: SalesDispatchLock;
  isSaving: boolean;
  onToggle: () => void;
}) {
  const isLocked = Boolean(lock?.is_locked);

  return (
    <Card className={isLocked ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}>
      <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          {isLocked ? (
            <Lock className="mt-0.5 h-5 w-5 text-red-600" />
          ) : (
            <Unlock className="mt-0.5 h-5 w-5 text-emerald-600" />
          )}
          <div>
            <p className="font-medium">
              {isLocked ? 'Docking printing is locked' : 'Docking printing is open'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {isLocked ? lock?.reason || 'No reason recorded' : 'Gatepass print and commit are available'}
            </p>
            {lock?.changed_at ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Last changed {formatDashboardTimestamp(lock.changed_at)}
                {lock.changed_by_name ? ` by ${lock.changed_by_name}` : ''}
              </p>
            ) : null}
          </div>
        </div>
        <Button
          type="button"
          variant={isLocked ? 'default' : 'destructive'}
          onClick={onToggle}
          disabled={isSaving}
        >
          {isLocked ? (
            <Unlock className="mr-2 h-4 w-4" />
          ) : (
            <Lock className="mr-2 h-4 w-4" />
          )}
          {isSaving ? 'Saving' : isLocked ? 'Unlock' : 'Lock Printing'}
        </Button>
      </CardContent>
    </Card>
  );
}

function ReportSnapshots({
  report,
  isLoading,
  isGateOutMode,
  gateOutPendingEntries,
  gateOutDispatchedEntries,
}: {
  report?: SalesDispatchReport;
  isLoading: boolean;
  isGateOutMode: boolean;
  gateOutPendingEntries: SalesDispatchGateOut[];
  gateOutDispatchedEntries: SalesDispatchGateOut[];
}) {
  if (!report && isLoading && gateOutPendingEntries.length === 0) {
    return <EmptyState text="Loading docking report snapshots" />;
  }

  if (isGateOutMode) {
    const pendingEntries = report?.ready_for_dispatch ?? gateOutPendingEntries;
    const dispatchedEntries = gateOutDispatchedEntries
      .slice()
      .sort((first, second) => timestampValue(second.dispatched_at || second.updated_at)
        - timestampValue(first.dispatched_at || first.updated_at));

    return (
      <div className="grid gap-3 xl:grid-cols-3">
        <ReportList
          icon={<Truck className="h-4 w-4 text-blue-600" />}
          title="Pending Out"
          entries={pendingEntries}
          emptyText="No pending gate out entries"
          isGateOutMode={isGateOutMode}
        />
        <ReportList
          icon={<CheckCircle2 className="h-4 w-4 text-green-600" />}
          title="Recently Marked Out"
          entries={dispatchedEntries}
          emptyText="No marked out entries in this range"
          isGateOutMode={isGateOutMode}
        />
        <ReportList
          icon={<FileText className="h-4 w-4 text-red-600" />}
          title="Rejected / Cancelled"
          entries={report?.rejected_cancelled ?? []}
          emptyText="No exceptions in this range"
          isGateOutMode={isGateOutMode}
        />
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="grid gap-3 xl:grid-cols-3">
      <ReportList
        icon={<Clock className="h-4 w-4 text-blue-600" />}
        title="Waiting Inside"
        entries={report.waiting_inside}
        emptyText="No waiting vehicles"
        isGateOutMode={isGateOutMode}
      />
      <ReportList
        icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
        title="Photo / GPS Missing"
        entries={report.missing_photo}
        emptyText="All active entries have location photos"
        isGateOutMode={isGateOutMode}
      />
      <ReportList
        icon={<FileText className="h-4 w-4 text-red-600" />}
        title="Rejected / Cancelled"
        entries={report.rejected_cancelled}
        emptyText="No exceptions in this range"
        isGateOutMode={isGateOutMode}
      />
    </div>
  );
}

function ReportList({
  icon,
  title,
  entries,
  emptyText,
  isGateOutMode,
}: {
  icon: React.ReactNode;
  title: string;
  entries: SalesDispatchGateOut[];
  emptyText: string;
  isGateOutMode: boolean;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const routes = getSalesDispatchRoutes(location.pathname);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            {icon}
            {title}
          </h3>
          <span className="text-sm font-semibold">{entries.length}</span>
        </div>
        {entries.length === 0 ? (
          <div className="flex h-20 items-center justify-center rounded-md border text-center text-sm text-muted-foreground">
            {emptyText}
          </div>
        ) : (
          <div className="space-y-2">
            {entries.slice(0, 4).map((entry) => (
              <button
                key={entry.id}
                type="button"
                className="w-full rounded-md border p-3 text-left transition-colors hover:bg-muted/50"
                onClick={() => navigate(getSalesDispatchDashboardEntryPath(
                  entry,
                  routes.detail,
                  routes.gatepass,
                  isGateOutMode,
                ))}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{entry.entry_no}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.vehicle_no} - {entry.sap_doc_num || entry.sap_doc_entry}
                    </p>
                  </div>
                  <GateStatusBadge
                    status={entry.status}
                    label={getSalesDispatchDashboardStatusLabel(entry.status, isGateOutMode)}
                  />
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function buildSalesDispatchSearchText(entry: SalesDispatchGateOut) {
  return [
    entry.entry_no,
    entry.sap_doc_num,
    entry.sap_doc_entry,
    entry.customer_name,
    entry.customer_code,
    entry.vehicle_no,
    entry.driver_name,
    entry.transporter_name,
    entry.gatepass_no,
    entry.item_summary,
    entry.status,
  ].join(' ').toLowerCase();
}

function sortSalesDispatchOutEntries(first: SalesDispatchGateOut, second: SalesDispatchGateOut) {
  const firstPriority = first.status === GATE_OUT_PENDING_STATUS ? 0 : 1;
  const secondPriority = second.status === GATE_OUT_PENDING_STATUS ? 0 : 1;

  if (firstPriority !== secondPriority) {
    return firstPriority - secondPriority;
  }

  return timestampValue(second.updated_at || second.created_at)
    - timestampValue(first.updated_at || first.created_at);
}

function timestampValue(value?: string | null) {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getSalesDispatchDashboardEntryPath(
  entry: SalesDispatchGateOut,
  detailPath: (entryId: string | number) => string,
  gatepassPath: (entryId: string | number) => string,
  isGateOutMode: boolean,
) {
  if (isGateOutMode && entry.status === GATE_OUT_PENDING_STATUS) {
    return gatepassPath(entry.vehicle_entry);
  }
  return detailPath(entry.id);
}

function getSalesDispatchDashboardStatusLabel(status: string, isGateOutMode: boolean) {
  if (!isGateOutMode) return status;
  if (status === GATE_OUT_PENDING_STATUS) return 'PENDING OUT';
  if (status === GATE_OUT_COMPLETED_STATUS) return 'MARKED OUT';
  return status;
}

function formatDocumentType(value: string) {
  return value === 'STOCK_TRANSFER' ? 'Stock Transfer' : 'A/R Invoice';
}

function formatDateTime(date?: string | null, time?: string | null) {
  if (!date && !time) return '-';
  return [date, time].filter(Boolean).join(' ');
}

function formatDashboardTimestamp(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function summarizeItems(items: SalesDispatchGateOut['items']) {
  if (!items.length) return '-';
  return items
    .slice(0, 2)
    .map((item) => `${item.item_code} (${item.quantity} ${item.uom})`)
    .join(', ');
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          {icon}
          <span className="text-2xl font-bold">{value}</span>
        </div>
        <p className="mt-2 text-sm font-medium text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-24 items-center justify-center rounded-lg border text-sm text-muted-foreground">
      {text}
    </div>
  );
}
