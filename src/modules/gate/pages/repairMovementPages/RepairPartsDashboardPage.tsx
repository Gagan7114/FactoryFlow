import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  Clock,
  FileText,
  Plus,
  RefreshCw,
  Search,
  Wrench,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useGlobalDateRange } from '@/core/store/hooks';
import { DateRangePicker } from '@/modules/gate/components';
import { Badge, Button, Card, CardContent, Input } from '@/shared/components/ui';

import {
  buildRepairMovementDateTimeLabel,
  buildRepairMovementItemsSearchText,
  buildRepairMovementItemsSummary,
  buildRepairMovementQtySummary,
  formatRepairMovementDate,
  getRepairMovementValue,
  parseRepairMovementItems,
  readRepairMovementEntries,
  REPAIR_PARTS_IN_COMPLETED_KEY,
  REPAIR_PARTS_OUT_COMPLETED_KEY,
  type RepairMovementEntry,
} from './repairMovement.storage';

type RepairPartsDirection = 'in' | 'out';

interface RepairPartsDashboardPageProps {
  direction: RepairPartsDirection;
}

const dashboardConfig = {
  out: {
    title: 'Repair Parts Out',
    subtitle: 'Record spare parts, tools, and repairable items leaving the gate',
    newPath: '/gate/repair-parts-out/new',
    storageKey: REPAIR_PARTS_OUT_COMPLETED_KEY,
    dateField: 'gateOutDate',
    timeField: 'outTime',
    sectionTitle: 'Repair Parts Gate-Out Entries',
    emptyText: 'No repair parts out entries in this date range',
    searchPlaceholder: 'Search entry, item, vendor, vehicle',
  },
  in: {
    title: 'Repair Parts In',
    subtitle: 'Receive repaired or returned parts back through the gate',
    newPath: '/gate/repair-parts-in/new',
    storageKey: REPAIR_PARTS_IN_COMPLETED_KEY,
    dateField: 'gateInDate',
    timeField: 'inTime',
    sectionTitle: 'Repair Parts Gate-In Entries',
    emptyText: 'No repair parts in entries in this date range',
    searchPlaceholder: 'Search entry, out entry, item, vendor',
  },
} satisfies Record<
  RepairPartsDirection,
  {
    title: string;
    subtitle: string;
    newPath: string;
    storageKey: string;
    dateField: string;
    timeField: string;
    sectionTitle: string;
    emptyText: string;
    searchPlaceholder: string;
  }
>;

export default function RepairPartsDashboardPage({ direction }: RepairPartsDashboardPageProps) {
  const navigate = useNavigate();
  const { dateRange, dateRangeAsDateObjects, setDateRange } = useGlobalDateRange();
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const config = dashboardConfig[direction];

  const entries = useMemo(
    () => {
      void refreshKey;
      return readRepairMovementEntries(config.storageKey);
    },
    [config.storageKey, refreshKey],
  );
  const outEntries = useMemo(
    () => {
      void refreshKey;
      return readRepairMovementEntries(REPAIR_PARTS_OUT_COMPLETED_KEY);
    },
    [refreshKey],
  );
  const inEntries = useMemo(
    () => {
      void refreshKey;
      return readRepairMovementEntries(REPAIR_PARTS_IN_COMPLETED_KEY);
    },
    [refreshKey],
  );
  const linkedOutEntryNos = useMemo(
    () => new Set(
      inEntries
        .filter((entry) => entry.status !== 'CANCELLED')
        .map((entry) => getRepairMovementValue(entry, 'sourceOutEntry')),
    ),
    [inEntries],
  );

  const filteredEntries = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return entries.filter((entry) => {
      const entryDate = getRepairMovementValue(entry, config.dateField);
      const comparableDate = entryDate !== '-' ? entryDate : entry.createdAt.slice(0, 10);

      if (dateRange.from && comparableDate < dateRange.from) return false;
      if (dateRange.to && comparableDate > dateRange.to) return false;

      if (!query) return true;

      const searchableValues = [
        entry.entryNo,
        entry.status,
        getRepairMovementValue(entry, 'sourceOutEntry'),
        buildRepairMovementItemsSearchText(entry),
        getRepairMovementValue(entry, 'vendorName'),
        getRepairMovementValue(entry, 'vehicleNo'),
        getRepairMovementValue(entry, 'driverName'),
        getRepairMovementValue(entry, 'department'),
        getRepairMovementValue(entry, 'requestedBy'),
      ];

      return searchableValues.some((value) => value.toLowerCase().includes(query));
    });
  }, [config.dateField, dateRange.from, dateRange.to, entries, searchTerm]);

  const returnableOutEntries = outEntries.filter(
    (entry) => entry.status !== 'CANCELLED' && getRepairMovementValue(entry, 'returnable') === 'Yes',
  );
  const awaitingReturnCount = returnableOutEntries.filter(
    (entry) => !linkedOutEntryNos.has(entry.entryNo),
  ).length;
  const receivedBackCount = returnableOutEntries.length - awaitingReturnCount;
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = entries.filter(
    (entry) => getRepairMovementValue(entry, config.dateField) === today,
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{config.title}</h2>
          <p className="text-muted-foreground">{config.subtitle}</p>
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
          <Button variant="outline" onClick={() => setRefreshKey((key) => key + 1)}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => navigate(config.newPath)}>
            <Plus className="mr-2 h-4 w-4" />
            New Entry
          </Button>
        </div>
      </div>

      {direction === 'out' ? (
        <OutStats
          totalCount={filteredEntries.length}
          awaitingReturnCount={awaitingReturnCount}
          receivedBackCount={receivedBackCount}
          todayCount={todayCount}
        />
      ) : (
        <InStats
          totalCount={filteredEntries.length}
          linkedCount={filteredEntries.filter((entry) => (
            getRepairMovementValue(entry, 'sourceOutEntry') !== '-'
          )).length}
          todayCount={todayCount}
        />
      )}

      <section>
        <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            {direction === 'out' ? (
              <ArrowUpFromLine className="h-4 w-4" />
            ) : (
              <ArrowDownToLine className="h-4 w-4" />
            )}
            {config.sectionTitle}
          </h3>
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={config.searchPlaceholder}
              className="pl-9"
            />
          </div>
        </div>

        {entries.length === 0 ? (
          <EmptyState text={config.emptyText} />
        ) : filteredEntries.length === 0 ? (
          <EmptyState text="No repair movement entries match this filter" />
        ) : direction === 'out' ? (
          <RepairPartsOutTable entries={filteredEntries} linkedOutEntryNos={linkedOutEntryNos} />
        ) : (
          <RepairPartsInTable entries={filteredEntries} />
        )}
      </section>
    </div>
  );
}

function OutStats({
  totalCount,
  awaitingReturnCount,
  receivedBackCount,
  todayCount,
}: {
  totalCount: number;
  awaitingReturnCount: number;
  receivedBackCount: number;
  todayCount: number;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <StatCard icon={<Clock className="h-5 w-5 text-amber-600" />} label="Awaiting Return" value={awaitingReturnCount} />
      <StatCard icon={<CheckCircle2 className="h-5 w-5 text-green-600" />} label="Received Back" value={receivedBackCount} />
      <StatCard icon={<FileText className="h-5 w-5 text-violet-600" />} label="Total Out" value={totalCount} />
      <StatCard icon={<Wrench className="h-5 w-5 text-blue-600" />} label="Today" value={todayCount} />
    </div>
  );
}

function InStats({
  totalCount,
  linkedCount,
  todayCount,
}: {
  totalCount: number;
  linkedCount: number;
  todayCount: number;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <StatCard icon={<CheckCircle2 className="h-5 w-5 text-green-600" />} label="Received" value={totalCount} />
      <StatCard icon={<ArrowUpFromLine className="h-5 w-5 text-blue-600" />} label="Linked To Out" value={linkedCount} />
      <StatCard icon={<Wrench className="h-5 w-5 text-amber-600" />} label="Today" value={todayCount} />
    </div>
  );
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

function RepairPartsOutTable({
  entries,
  linkedOutEntryNos,
}: {
  entries: RepairMovementEntry[];
  linkedOutEntryNos: Set<string>;
}) {
  const navigate = useNavigate();

  return (
    <div className="overflow-hidden rounded-md border">
      <div className="max-h-[520px] overflow-auto">
        <table className="w-full min-w-[1040px]">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 text-left text-sm font-medium">Entry No.</th>
              <th className="p-3 text-left text-sm font-medium">Item</th>
              <th className="p-3 text-left text-sm font-medium">Qty</th>
              <th className="p-3 text-left text-sm font-medium">Vendor</th>
              <th className="p-3 text-left text-sm font-medium">Vehicle</th>
              <th className="p-3 text-left text-sm font-medium">Gate Out</th>
              <th className="p-3 text-left text-sm font-medium">Expected Return</th>
              <th className="p-3 text-left text-sm font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const isReceived = linkedOutEntryNos.has(entry.entryNo);

              return (
                <tr
                  key={entry.id}
                  className="cursor-pointer border-t transition-colors hover:bg-muted/50"
                  onClick={() => navigate(`/gate/repair-parts-out/${entry.id}`)}
                >
                  <td className="whitespace-nowrap p-3 text-sm font-medium">{entry.entryNo}</td>
                  <td className="p-3 text-sm">
                    <RepairItemsCell entry={entry} />
                  </td>
                  <td className="whitespace-nowrap p-3 text-sm">
                    {buildRepairMovementQtySummary(entry)}
                  </td>
                  <td className="whitespace-nowrap p-3 text-sm">
                    {getRepairMovementValue(entry, 'vendorName')}
                  </td>
                  <td className="whitespace-nowrap p-3 text-sm">
                    {getRepairMovementValue(entry, 'vehicleNo')}
                  </td>
                  <td className="whitespace-nowrap p-3 text-sm">
                    {buildRepairMovementDateTimeLabel(
                      entry.values.gateOutDate,
                      entry.values.outTime,
                    )}
                  </td>
                  <td className="whitespace-nowrap p-3 text-sm text-muted-foreground">
                    {formatRepairMovementDate(entry.values.expectedReturnDate)}
                  </td>
                  <td className="whitespace-nowrap p-3 text-sm">
                    <Badge variant={entry.status === 'CANCELLED' ? 'destructive' : isReceived ? 'success' : 'warning'}>
                      {entry.status === 'CANCELLED' ? 'CANCELLED' : isReceived ? 'RECEIVED' : 'AWAITING'}
                    </Badge>
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

function RepairPartsInTable({ entries }: { entries: RepairMovementEntry[] }) {
  const navigate = useNavigate();

  return (
    <div className="overflow-hidden rounded-md border">
      <div className="max-h-[520px] overflow-auto">
        <table className="w-full min-w-[1040px]">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 text-left text-sm font-medium">Entry No.</th>
              <th className="p-3 text-left text-sm font-medium">Out Entry</th>
              <th className="p-3 text-left text-sm font-medium">Item</th>
              <th className="p-3 text-left text-sm font-medium">Qty</th>
              <th className="p-3 text-left text-sm font-medium">Vendor</th>
              <th className="p-3 text-left text-sm font-medium">Gate In</th>
              <th className="p-3 text-left text-sm font-medium">Condition</th>
              <th className="p-3 text-left text-sm font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                key={entry.id}
                className="cursor-pointer border-t transition-colors hover:bg-muted/50"
                onClick={() => navigate(`/gate/repair-parts-in/${entry.id}`)}
              >
                <td className="whitespace-nowrap p-3 text-sm font-medium">{entry.entryNo}</td>
                <td className="whitespace-nowrap p-3 text-sm">
                  {getRepairMovementValue(entry, 'sourceOutEntry')}
                </td>
                <td className="p-3 text-sm">
                  <RepairItemsCell entry={entry} />
                </td>
                <td className="whitespace-nowrap p-3 text-sm">
                  {buildRepairMovementQtySummary(entry)}
                </td>
                <td className="whitespace-nowrap p-3 text-sm">
                  {getRepairMovementValue(entry, 'vendorName')}
                </td>
                <td className="whitespace-nowrap p-3 text-sm">
                  {buildRepairMovementDateTimeLabel(entry.values.gateInDate, entry.values.inTime)}
                </td>
                <td className="whitespace-nowrap p-3 text-sm">
                  {getRepairMovementValue(entry, 'conditionIn')}
                </td>
                <td className="whitespace-nowrap p-3 text-sm">
                  <Badge variant={entry.status === 'CANCELLED' ? 'destructive' : 'success'}>
                    {entry.status === 'CANCELLED' ? 'CANCELLED' : getRepairMovementValue(entry, 'repairStatus')}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RepairItemsCell({ entry }: { entry: RepairMovementEntry }) {
  const items = parseRepairMovementItems(entry);
  const firstSerialNo = items[0]?.serialNo;

  return (
    <>
      <div className="font-medium">{buildRepairMovementItemsSummary(entry)}</div>
      {items.length > 1 ? (
        <div className="text-xs text-muted-foreground">{items.length} items</div>
      ) : firstSerialNo ? (
        <div className="text-xs text-muted-foreground">Serial: {firstSerialNo}</div>
      ) : null}
    </>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-24 items-center justify-center rounded-lg border text-sm text-muted-foreground">
      {text}
    </div>
  );
}
