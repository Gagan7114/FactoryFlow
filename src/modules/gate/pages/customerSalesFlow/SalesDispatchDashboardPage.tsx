import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  List,
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
  type SalesDispatchDashboardEntry,
  type SalesDispatchGateOut,
  type SalesDispatchLock,
  useSalesDispatchEntries,
  useSalesDispatchLock,
  useSalesDispatchPendingBookings,
  useUpdateSalesDispatchLock,
} from '@/modules/gate/api';
import { DateRangePicker, GateStatusBadge } from '@/modules/gate/components';
import { Button, Card, CardContent, Input } from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

import { getSalesDispatchRoutes, isSalesDispatchOutPath } from './salesDispatchRoutes';

const GATE_OUT_PENDING_STATUS = 'PRINT_COMMITTED';
const GATE_OUT_COMPLETED_STATUS = 'DISPATCHED';
const ACTIVE_SALES_DISPATCH_STATUSES = [
  'DOCKED',
  'PHOTO_ATTACHED',
  'READY_FOR_GATEPASS',
  'GATEPASS_PRINTED',
  'PRINT_COMMITTED',
];
const GATEPASS_PENDING_STATUSES = ['DOCKED', 'PHOTO_ATTACHED', 'READY_FOR_GATEPASS'];

type DashboardFilter =
  | 'ALL'
  | 'PENDING_OUT'
  | 'AWAITING_GATEPASS'
  | 'PRINT_NOT_COMMITTED'
  | 'MARKED_OUT'
  | 'PENDING_DOCKING'
  | 'WAITING_INSIDE'
  | 'MISSING_PHOTO_GPS'
  | 'GATEPASS_PENDING'
  | 'DISPATCHED';

export default function SalesDispatchDashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const routes = getSalesDispatchRoutes(location.pathname);
  const isGateOutMode = isSalesDispatchOutPath(location.pathname);
  const { dateRange, dateRangeAsDateObjects, setDateRange } = useGlobalDateRange();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilterState, setSelectedFilterState] = useState<{
    isGateOutMode: boolean;
    filter: DashboardFilter;
  }>({ isGateOutMode, filter: 'ALL' });
  const selectedFilter =
    selectedFilterState.isGateOutMode === isGateOutMode ? selectedFilterState.filter : 'ALL';
  const listParams = useMemo(
    () => ({
      from_date: dateRange.from,
      to_date: dateRange.to,
      search: searchTerm.trim() || undefined,
      document_type: isGateOutMode ? ('INVOICE' as const) : undefined,
    }),
    [dateRange.from, dateRange.to, searchTerm, isGateOutMode],
  );

  const { data: entries = [], isFetching, refetch } = useSalesDispatchEntries(listParams);
  const {
    data: pendingBookings = [],
    isFetching: isPendingBookingsFetching,
    refetch: refetchPendingBookings,
  } = useSalesDispatchPendingBookings(listParams, { enabled: !isGateOutMode });
  const { data: dispatchLock } = useSalesDispatchLock();
  const updateLock = useUpdateSalesDispatchLock();
  const isDashboardFetching = isFetching || isPendingBookingsFetching;

  const displayEntries = useMemo(() => {
    if (isGateOutMode) return entries.slice().sort(sortSalesDispatchOutEntries);

    return [...pendingBookings, ...entries].sort(sortDockingDashboardEntries);
  }, [entries, isGateOutMode, pendingBookings]);

  const cardFilteredEntries = useMemo(
    () =>
      displayEntries.filter((entry) => matchesSalesDispatchDashboardFilter(entry, selectedFilter)),
    [displayEntries, selectedFilter],
  );

  const filteredEntries = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return cardFilteredEntries;
    return cardFilteredEntries.filter((entry) =>
      buildSalesDispatchSearchText(entry).includes(query),
    );
  }, [cardFilteredEntries, searchTerm]);

  const allCount = countSalesDispatchDashboardEntries(displayEntries, 'ALL');
  const pendingOutCount = countSalesDispatchDashboardEntries(displayEntries, 'PENDING_OUT');
  const awaitingGatepassCount = countSalesDispatchDashboardEntries(
    displayEntries,
    'AWAITING_GATEPASS',
  );
  const printedNotCommittedCount = countSalesDispatchDashboardEntries(
    displayEntries,
    'PRINT_NOT_COMMITTED',
  );
  const markedOutCount = countSalesDispatchDashboardEntries(displayEntries, 'MARKED_OUT');
  const pendingDockingCount = countSalesDispatchDashboardEntries(displayEntries, 'PENDING_DOCKING');
  const waitingInsideCount = countSalesDispatchDashboardEntries(displayEntries, 'WAITING_INSIDE');
  const missingPhotoCount = countSalesDispatchDashboardEntries(displayEntries, 'MISSING_PHOTO_GPS');
  const gatepassPendingCount = countSalesDispatchDashboardEntries(
    displayEntries,
    'GATEPASS_PENDING',
  );
  const dispatchedCount = countSalesDispatchDashboardEntries(displayEntries, 'DISPATCHED');

  const statCards = isGateOutMode
    ? [
        {
          filter: 'ALL' as const,
          icon: <List className="h-5 w-5 text-slate-600" />,
          label: 'All',
          value: allCount,
        },
        {
          filter: 'PENDING_OUT' as const,
          icon: <Truck className="h-5 w-5 text-blue-600" />,
          label: 'Pending Out',
          value: pendingOutCount,
        },
        {
          filter: 'AWAITING_GATEPASS' as const,
          icon: <FileText className="h-5 w-5 text-violet-600" />,
          label: 'Awaiting Gatepass',
          value: awaitingGatepassCount,
        },
        {
          filter: 'PRINT_NOT_COMMITTED' as const,
          icon: <Clock className="h-5 w-5 text-amber-600" />,
          label: 'Print Not Committed',
          value: printedNotCommittedCount,
        },
        {
          filter: 'MARKED_OUT' as const,
          icon: <CheckCircle2 className="h-5 w-5 text-green-600" />,
          label: 'Marked Out',
          value: markedOutCount,
        },
      ]
    : [
        {
          filter: 'ALL' as const,
          icon: <List className="h-5 w-5 text-slate-600" />,
          label: 'All',
          value: allCount,
        },
        {
          filter: 'PENDING_DOCKING' as const,
          icon: <Clock className="h-5 w-5 text-amber-600" />,
          label: 'Pending',
          value: pendingDockingCount,
        },
        {
          filter: 'WAITING_INSIDE' as const,
          icon: <Truck className="h-5 w-5 text-blue-600" />,
          label: 'Waiting Inside',
          value: waitingInsideCount,
        },
        {
          filter: 'MISSING_PHOTO_GPS' as const,
          icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
          label: 'Missing Photo / GPS',
          value: missingPhotoCount,
        },
        {
          filter: 'GATEPASS_PENDING' as const,
          icon: <FileText className="h-5 w-5 text-violet-600" />,
          label: 'Gatepass Pending',
          value: gatepassPendingCount,
        },
        {
          filter: 'DISPATCHED' as const,
          icon: <CheckCircle2 className="h-5 w-5 text-green-600" />,
          label: 'Dispatched',
          value: dispatchedCount,
        },
      ];

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
          <Button
            variant="outline"
            onClick={() => {
              void refetch();
              if (!isGateOutMode) void refetchPendingBookings();
            }}
            disabled={isDashboardFetching}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {isDashboardFetching ? 'Refreshing' : 'Refresh'}
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

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        {statCards.map((card) => (
          <StatCard
            key={card.filter}
            icon={card.icon}
            label={card.label}
            value={card.value}
            isActive={selectedFilter === card.filter}
            onClick={() => setSelectedFilterState({ isGateOutMode, filter: card.filter })}
          />
        ))}
      </div>

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

        {isDashboardFetching && displayEntries.length === 0 ? (
          <EmptyState
            text={isGateOutMode ? 'Loading sales dispatch out entries' : 'Loading docking entries'}
          />
        ) : displayEntries.length === 0 ? (
          <EmptyState
            text={isGateOutMode ? 'No sales dispatch out entries yet' : 'No docking entries yet'}
          />
        ) : filteredEntries.length === 0 ? (
          <EmptyState
            text={
              searchTerm.trim()
                ? isGateOutMode
                  ? 'No sales dispatch out entries match this search'
                  : 'No docking entries match this search'
                : isGateOutMode
                  ? 'No sales dispatch out entries match this filter'
                  : 'No docking entries match this filter'
            }
          />
        ) : (
          <DispatchTable
            entries={filteredEntries}
            newEntryPath={routes.newEntry}
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
  newEntryPath,
  detailPath,
  gatepassPath,
  isGateOutMode,
}: {
  entries: SalesDispatchDashboardEntry[];
  newEntryPath: string;
  detailPath: (entryId: string | number) => string;
  gatepassPath: (entryId: string | number) => string;
  isGateOutMode: boolean;
}) {
  const navigate = useNavigate();

  return (
    <div className="overflow-hidden rounded-md border">
      <div className="max-h-[520px] overflow-auto">
        <table className="w-full min-w-[1580px] table-fixed">
          <colgroup>
            <col className="w-[180px]" />
            <col className="w-[160px]" />
            <col className="w-[230px]" />
            <col className="w-[320px]" />
            <col className="w-[130px]" />
            <col className="w-[165px]" />
            <col className="w-[260px]" />
            <col className="w-[135px]" />
          </colgroup>
          <thead className="bg-muted/50">
            <tr>
              <th className="whitespace-nowrap p-3 text-left text-sm font-medium">Entry No.</th>
              <th className="whitespace-nowrap p-3 text-left text-sm font-medium">SAP Document</th>
              <th className="whitespace-nowrap p-3 text-left text-sm font-medium">Customer</th>
              <th className="whitespace-nowrap p-3 text-left text-sm font-medium">Items</th>
              <th className="whitespace-nowrap p-3 text-left text-sm font-medium">Vehicle</th>
              <th className="whitespace-nowrap p-3 text-left text-sm font-medium">Gate Out</th>
              <th className="whitespace-nowrap p-3 text-left text-sm font-medium">Gatepass</th>
              <th className="whitespace-nowrap p-3 text-left text-sm font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const itemSummary = entry.item_summary || summarizeItems(getEntryItems(entry));

              return (
                <tr
                  key={entry.id}
                  className="cursor-pointer border-t align-top transition-colors hover:bg-muted/50"
                  onClick={() => {
                    navigate(
                      getSalesDispatchDashboardEntryPath(
                        entry,
                        newEntryPath,
                        detailPath,
                        gatepassPath,
                        isGateOutMode,
                      ),
                    );
                  }}
                >
                  <td className="whitespace-nowrap p-3 text-sm font-medium">
                    {isPendingBookingEntry(entry) ? 'Pending' : entry.entry_no}
                  </td>
                  <td className="whitespace-nowrap p-3 text-sm">
                    <div>{entry.sap_doc_num || entry.sap_doc_entry}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDocumentType(entry.document_type)}
                    </div>
                  </td>
                  <td className="p-3 text-sm">
                    <div className="truncate whitespace-nowrap font-medium">
                      {entry.customer_name || '-'}
                    </div>
                    <div className="truncate whitespace-nowrap text-xs text-muted-foreground">
                      {entry.customer_code || entry.place_of_supply || '-'}
                    </div>
                  </td>
                  <td className="p-3 text-sm" title={itemSummary}>
                    <div className="truncate whitespace-nowrap">{itemSummary}</div>
                  </td>
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
              );
            })}
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
              {isLocked
                ? lock?.reason || 'No reason recorded'
                : 'Gatepass print and commit are available'}
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
          {isLocked ? <Unlock className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
          {isSaving ? 'Saving' : isLocked ? 'Unlock' : 'Lock Printing'}
        </Button>
      </CardContent>
    </Card>
  );
}

function buildSalesDispatchSearchText(entry: SalesDispatchDashboardEntry) {
  return [
    isPendingBookingEntry(entry) ? 'pending docking booked' : entry.entry_no,
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
  ]
    .join(' ')
    .toLowerCase();
}

function countSalesDispatchDashboardEntries(
  entries: SalesDispatchDashboardEntry[],
  filter: DashboardFilter,
) {
  return entries.filter((entry) => matchesSalesDispatchDashboardFilter(entry, filter)).length;
}

function matchesSalesDispatchDashboardFilter(
  entry: SalesDispatchDashboardEntry,
  filter: DashboardFilter,
) {
  switch (filter) {
    case 'ALL':
      return true;
    case 'PENDING_DOCKING':
      return isPendingBookingEntry(entry);
    case 'PENDING_OUT':
      return entry.status === GATE_OUT_PENDING_STATUS;
    case 'AWAITING_GATEPASS':
    case 'GATEPASS_PENDING':
      return GATEPASS_PENDING_STATUSES.includes(entry.status);
    case 'PRINT_NOT_COMMITTED':
      return entry.status === 'GATEPASS_PRINTED';
    case 'MARKED_OUT':
    case 'DISPATCHED':
      return entry.status === GATE_OUT_COMPLETED_STATUS;
    case 'WAITING_INSIDE':
      return ACTIVE_SALES_DISPATCH_STATUSES.includes(entry.status);
    case 'MISSING_PHOTO_GPS':
      if (isPendingBookingEntry(entry)) return false;
      return (
        ACTIVE_SALES_DISPATCH_STATUSES.includes(entry.status) &&
        (!entry.truck_photo || !entry.photo_latitude || !entry.photo_longitude)
      );
    default:
      return true;
  }
}

function sortDockingDashboardEntries(
  first: SalesDispatchDashboardEntry,
  second: SalesDispatchDashboardEntry,
) {
  const firstPriority = isPendingBookingEntry(first) ? 0 : 1;
  const secondPriority = isPendingBookingEntry(second) ? 0 : 1;

  if (firstPriority !== secondPriority) {
    return firstPriority - secondPriority;
  }

  return (
    timestampValue(second.updated_at || second.created_at) -
    timestampValue(first.updated_at || first.created_at)
  );
}

function sortSalesDispatchOutEntries(first: SalesDispatchGateOut, second: SalesDispatchGateOut) {
  const firstPriority = first.status === GATE_OUT_PENDING_STATUS ? 0 : 1;
  const secondPriority = second.status === GATE_OUT_PENDING_STATUS ? 0 : 1;

  if (firstPriority !== secondPriority) {
    return firstPriority - secondPriority;
  }

  return (
    timestampValue(second.updated_at || second.created_at) -
    timestampValue(first.updated_at || first.created_at)
  );
}

function timestampValue(value?: string | null) {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getSalesDispatchDashboardEntryPath(
  entry: SalesDispatchDashboardEntry,
  newEntryPath: string,
  detailPath: (entryId: string | number) => string,
  gatepassPath: (entryId: string | number) => string,
  isGateOutMode: boolean,
) {
  if (isPendingBookingEntry(entry)) {
    return `${newEntryPath}?dispatchPlanIds=${entry.dispatch_plan_ids.join(',')}`;
  }
  if (isGateOutMode && entry.status === GATE_OUT_PENDING_STATUS) {
    return gatepassPath(entry.vehicle_entry);
  }
  return detailPath(entry.id);
}

function getSalesDispatchDashboardStatusLabel(status: string, isGateOutMode: boolean) {
  if (status === 'PENDING_DOCKING') return 'PENDING';
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

function isPendingBookingEntry(
  entry: SalesDispatchDashboardEntry,
): entry is Extract<SalesDispatchDashboardEntry, { row_type: 'PENDING_BOOKING' }> {
  return 'row_type' in entry && entry.row_type === 'PENDING_BOOKING';
}

function getEntryItems(entry: SalesDispatchDashboardEntry) {
  return isPendingBookingEntry(entry) ? [] : entry.items;
}

function StatCard({
  icon,
  label,
  value,
  isActive,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onClick}
      className={cn(
        'rounded-lg border bg-card p-4 text-left text-card-foreground shadow-sm transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        isActive && 'border-primary/60 bg-primary/5 ring-1 ring-primary/30',
      )}
    >
      <span className="flex items-center justify-between">
        <span>{icon}</span>
        <span className="text-2xl font-bold">{value}</span>
      </span>
      <span
        className={cn(
          'mt-2 block text-sm font-medium text-muted-foreground',
          isActive && 'text-foreground',
        )}
      >
        {label}
      </span>
    </button>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-24 items-center justify-center rounded-lg border text-sm text-muted-foreground">
      {text}
    </div>
  );
}
