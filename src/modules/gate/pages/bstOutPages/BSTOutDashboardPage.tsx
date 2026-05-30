import { CheckCircle2, Clock, FileText, RefreshCw, Search, Truck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useGlobalDateRange } from '@/core/store/hooks';
import { type SalesDispatchGateOut, useSalesDispatchEntries } from '@/modules/gate/api';
import { DateRangePicker, GateStatusBadge } from '@/modules/gate/components';
import { Button, Card, CardContent, Input } from '@/shared/components/ui';

import { GATE_OUT_ROUTES } from '../customerSalesFlow/salesDispatchRoutes';

const PENDING_OUT_STATUS = 'PRINT_COMMITTED';
const MARKED_OUT_STATUS = 'DISPATCHED';

export default function BSTOutDashboardPage() {
  const navigate = useNavigate();
  const { dateRange, dateRangeAsDateObjects, setDateRange } = useGlobalDateRange();
  const [searchTerm, setSearchTerm] = useState('');

  const queryParams = useMemo(
    () => ({
      from_date: dateRange.from,
      to_date: dateRange.to,
      document_type: 'STOCK_TRANSFER' as const,
    }),
    [dateRange.from, dateRange.to],
  );

  const {
    data: dockingEntries = [],
    isLoading,
    isFetching,
    refetch,
  } = useSalesDispatchEntries(queryParams);

  const gateOutEntries = useMemo(
    () =>
      dockingEntries
        .filter((entry) => [PENDING_OUT_STATUS, MARKED_OUT_STATUS].includes(entry.status))
        .sort(sortBstOutEntries),
    [dockingEntries],
  );

  const filteredEntries = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return gateOutEntries;

    return gateOutEntries.filter((entry) => buildBstOutSearchText(entry).includes(query));
  }, [gateOutEntries, searchTerm]);

  const pendingCount = dockingEntries.filter((entry) => entry.status === PENDING_OUT_STATUS).length;
  const markedOutCount = dockingEntries.filter(
    (entry) => entry.status === MARKED_OUT_STATUS,
  ).length;
  const awaitingDockingCount = dockingEntries.filter(
    (entry) =>
      ![PENDING_OUT_STATUS, MARKED_OUT_STATUS, 'CANCELLED', 'REJECTED'].includes(entry.status),
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">BST Out</h2>
          <p className="text-muted-foreground">
            View Docking-created stock transfers and mark vehicles out
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
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
        <StatCard
          icon={<Truck className="h-5 w-5 text-blue-600" />}
          label="Pending Out"
          value={pendingCount}
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5 text-green-600" />}
          label="Marked Out"
          value={markedOutCount}
        />
        <StatCard
          icon={<Clock className="h-5 w-5 text-amber-600" />}
          label="Awaiting Docking"
          value={awaitingDockingCount}
        />
        <StatCard
          icon={<FileText className="h-5 w-5 text-violet-600" />}
          label="Total BST Docking"
          value={dockingEntries.length}
        />
      </div>

      <section>
        <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Truck className="h-4 w-4" />
            BST Out Entries
          </h3>
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search entry, BST, warehouse, vehicle"
              className="pl-9"
            />
          </div>
        </div>
        {isLoading ? (
          <EmptyState text="Loading BST out entries..." />
        ) : gateOutEntries.length === 0 ? (
          <EmptyState text="No pending or marked-out BST entries in this date range" />
        ) : filteredEntries.length === 0 ? (
          <EmptyState text="No BST out entries match this search" />
        ) : (
          <div className="overflow-hidden rounded-md border">
            <div className="max-h-[520px] overflow-auto">
              <table className="w-full min-w-[1100px]">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-3 text-left text-sm font-medium">Entry No.</th>
                    <th className="p-3 text-left text-sm font-medium">SAP BST</th>
                    <th className="p-3 text-left text-sm font-medium">From</th>
                    <th className="p-3 text-left text-sm font-medium">To</th>
                    <th className="p-3 text-left text-sm font-medium">Items</th>
                    <th className="p-3 text-left text-sm font-medium">Vehicle</th>
                    <th className="p-3 text-left text-sm font-medium">Gate Out</th>
                    <th className="p-3 text-left text-sm font-medium">Gatepass</th>
                    <th className="p-3 text-left text-sm font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="cursor-pointer border-t transition-colors hover:bg-muted/50"
                      onClick={() =>
                        navigate(
                          hasCompleteGateOutWeighment(entry)
                            ? GATE_OUT_ROUTES.bstOutGatepass(entry.vehicle_entry)
                            : GATE_OUT_ROUTES.bstOutWeighment(entry.vehicle_entry),
                        )
                      }
                    >
                      <td className="whitespace-nowrap p-3 text-sm font-medium">
                        {entry.entry_no}
                      </td>
                      <td className="whitespace-nowrap p-3 text-sm">{entry.sap_doc_num}</td>
                      <td className="whitespace-nowrap p-3 text-sm">
                        {entry.from_warehouse || '-'}
                      </td>
                      <td className="whitespace-nowrap p-3 text-sm">
                        {entry.to_warehouse || entry.warehouses || '-'}
                      </td>
                      <td className="p-3 text-sm">{entry.item_summary || summarizeItems(entry)}</td>
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
                          label={formatBstOutStatus(entry.status)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function sortBstOutEntries(first: SalesDispatchGateOut, second: SalesDispatchGateOut) {
  const firstPriority = first.status === PENDING_OUT_STATUS ? 0 : 1;
  const secondPriority = second.status === PENDING_OUT_STATUS ? 0 : 1;

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

function buildBstOutSearchText(entry: SalesDispatchGateOut) {
  return [
    entry.entry_no,
    entry.sap_doc_num,
    entry.sap_doc_entry,
    entry.from_warehouse,
    entry.to_warehouse,
    entry.warehouses,
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

function formatBstOutStatus(status: string) {
  if (status === PENDING_OUT_STATUS) return 'PENDING OUT';
  if (status === MARKED_OUT_STATUS) return 'MARKED OUT';
  return status;
}

function hasCompleteGateOutWeighment(entry: SalesDispatchGateOut) {
  const gross = toFiniteNumber(entry.gross_weight);
  const tare = toFiniteNumber(entry.tare_weight);
  return gross !== null && gross > 0 && tare !== null && tare >= 0 && gross >= tare;
}

function toFiniteNumber(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function formatDateTime(date?: string | null, time?: string | null) {
  if (!date && !time) return '-';
  return [date, time].filter(Boolean).join(' ');
}

function summarizeItems(entry: SalesDispatchGateOut) {
  if (entry.items.length === 0) return '-';
  const [firstItem] = entry.items;
  const suffix = entry.items.length > 1 ? ` +${entry.items.length - 1}` : '';
  return `${firstItem.item_name || firstItem.item_code}${suffix}`;
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
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
