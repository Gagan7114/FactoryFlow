import { ArrowRight, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ENTRY_TYPES } from '@/config/constants';
import { usePermission } from '@/core/auth';
import { useGlobalDateRange } from '@/core/store/hooks';
import { Badge, Card, CardContent, Input } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import {
  useBSTGateInEntries,
  useBSTGateReturnEntries,
  useEmptyVehicleEligibleEntries,
  useEmptyVehicleGateInEntries,
  useEmptyVehicleGateOutEntries,
  useJobWorkGateInEntries,
  usePersonGateInDashboard,
  useRejectedQCReturnEntries,
  useSalesDispatchEntries,
  useVehicleEntriesCount,
} from '../api';
import { GATE_ENTRY_TYPES, type GateEntryTypeConfig } from '../constants/gateEntryTypes';
import { getJobWorkDisplayStatus, hasLinkedJobWorkProductionOrder } from '../utils';
import {
  CUSTOMER_RETURN_KEY,
  isCustomerReturnAwaitingFactoryHead,
  readCustomerFlowEntries,
} from './customerSalesFlow/customerSalesFlow.storage';
import { readRejectedQCReturnEntries } from './rejectedMaterialPages/rejectedQcReturn.storage';
import {
  getRepairMovementValue,
  readRepairMovementEntries,
  REPAIR_PARTS_IN_COMPLETED_KEY,
  REPAIR_PARTS_OUT_COMPLETED_KEY,
} from './repairMovementPages/repairMovement.storage';

const directionLabels: Record<GateEntryTypeConfig['direction'], string> = {
  in: 'Gate In',
  out: 'Gate Out',
  return: 'Gate In',
};

const directionSearchText: Record<GateEntryTypeConfig['direction'], string> = {
  in: 'gate in inward incoming receive',
  out: 'gate out outward outgoing dispatch',
  return: 'return returned receiving back',
};

type StatTone = 'total' | 'open' | 'completed' | 'cancelled' | 'info' | 'warning';

interface EntryTypeStat {
  label: string;
  value: number;
  tone?: StatTone;
}

interface EntryTypeStats {
  stats: EntryTypeStat[];
  isLoading?: boolean;
}

const STAT_TONE_CLASSES: Record<StatTone, string> = {
  total: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  open: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  completed: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  cancelled: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  info: 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

const FINAL_STATUSES = new Set(['COMPLETED', 'CANCELLED', 'REJECTED', 'FINAL_REJECTED']);

export default function GateDashboardPage() {
  const navigate = useNavigate();
  const { hasAnyPermission } = usePermission();
  const [searchTerm, setSearchTerm] = useState('');

  const visibleEntryTypes = useMemo(
    () => GATE_ENTRY_TYPES.filter((entryType) => hasAnyPermission(entryType.viewPermissions)),
    [hasAnyPermission],
  );
  const statsByEntryType = useGateDashboardStats(visibleEntryTypes);

  const filteredEntryTypes = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return visibleEntryTypes;

    return visibleEntryTypes.filter((entryType) =>
      [
        entryType.title,
        entryType.description,
        directionLabels[entryType.direction],
        directionSearchText[entryType.direction],
        entryType.vehicleMode === 'vehicle' ? 'vehicle truck tanker' : 'person visitor labour',
        ...entryType.keywords,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [searchTerm, visibleEntryTypes]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gate Management</h2>
          <p className="text-muted-foreground">Complete gate control for all movements</p>
        </div>
        <div className="relative w-full lg:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search type, document, vehicle, reason"
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {filteredEntryTypes.length === 0 ? (
            <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
              No gate entry types match this search
            </div>
          ) : (
            <div className="divide-y">
              {filteredEntryTypes.map((entryType) => (
                <EntryTypeRow
                  key={entryType.id}
                  entryType={entryType}
                  stats={statsByEntryType[entryType.id]}
                  onOpen={() => navigate(entryType.dashboardRoute)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EntryTypeRow({
  entryType,
  stats,
  onOpen,
}: {
  entryType: GateEntryTypeConfig;
  stats?: EntryTypeStats;
  onOpen: () => void;
}) {
  const Icon = entryType.icon;

  return (
    <button
      type="button"
      className="grid w-full gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/50 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto]"
      onClick={onOpen}
    >
      <span className="flex min-w-0 items-start gap-3">
        <span className="rounded-md border p-2">
          <Icon className={cn('h-4 w-4', entryType.colorClassName)} />
        </span>
        <span className="min-w-0">
          <span className="block font-medium">{entryType.title}</span>
          <span className="line-clamp-2 text-sm leading-5 text-muted-foreground">
            {entryType.description}
          </span>
        </span>
      </span>

      <EntryTypeStatsPills stats={stats} />

      <span className="flex flex-wrap gap-2 md:justify-end">
        <Badge variant="outline">{directionLabels[entryType.direction]}</Badge>
      </span>

      <span className="hidden items-center text-sm font-medium text-muted-foreground md:flex">
        Open
        <ArrowRight className="ml-2 h-4 w-4" />
      </span>
    </button>
  );
}

function EntryTypeStatsPills({ stats }: { stats?: EntryTypeStats }) {
  if (!stats) return null;

  if (stats.isLoading) {
    return (
      <span className="flex items-center gap-2 lg:justify-end">
        <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
          Loading stats...
        </span>
      </span>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-2 lg:justify-end">
      {stats.stats.map((stat) => (
        <span
          key={stat.label}
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
            STAT_TONE_CLASSES[stat.tone || 'total'],
          )}
        >
          <span>{stat.label}</span>
          <span className="font-bold">{stat.value}</span>
        </span>
      ))}
    </span>
  );
}

function useGateDashboardStats(
  visibleEntryTypes: GateEntryTypeConfig[],
): Record<string, EntryTypeStats> {
  const { dateRange } = useGlobalDateRange();
  const visibleEntryIds = useMemo(
    () => new Set(visibleEntryTypes.map((entryType) => entryType.id)),
    [visibleEntryTypes],
  );
  const isVisible = (entryTypeId: string) => visibleEntryIds.has(entryTypeId);

  const rawMaterialCounts = useVehicleEntriesCount(
    {
      from_date: dateRange.from,
      to_date: dateRange.to,
      entry_type: ENTRY_TYPES.RAW_MATERIAL,
    },
    { enabled: isVisible('raw-materials') },
  );
  const dailyNeedsCounts = useVehicleEntriesCount(
    {
      from_date: dateRange.from,
      to_date: dateRange.to,
      entry_type: ENTRY_TYPES.DAILY_NEED,
    },
    { enabled: isVisible('daily-needs') },
  );
  const maintenanceCounts = useVehicleEntriesCount(
    {
      from_date: dateRange.from,
      to_date: dateRange.to,
      entry_type: ENTRY_TYPES.MAINTENANCE,
    },
    { enabled: isVisible('maintenance') },
  );
  const constructionCounts = useVehicleEntriesCount(
    {
      from_date: dateRange.from,
      to_date: dateRange.to,
      entry_type: ENTRY_TYPES.CONSTRUCTION,
    },
    { enabled: isVisible('construction') },
  );
  const personDashboard = usePersonGateInDashboard(isVisible('visitor-labour'));
  const emptyVehicleInEntries = useEmptyVehicleGateInEntries(undefined, {
    enabled: isVisible('empty-vehicle-in'),
  });
  const emptyVehicleEligibleEntries = useEmptyVehicleEligibleEntries(undefined, {
    enabled: isVisible('empty-vehicle-out'),
  });
  const emptyVehicleOutEntries = useEmptyVehicleGateOutEntries(undefined, {
    enabled: isVisible('empty-vehicle-out'),
  });
  const bstInEntries = useBSTGateInEntries(undefined, { enabled: isVisible('bst-in') });
  const bstReturnEntries = useBSTGateReturnEntries(undefined, {
    enabled: isVisible('bst-return'),
  });
  const rejectedQCReturnEntries = useRejectedQCReturnEntries({
    enabled: isVisible('rejected-qc-return'),
  });
  const jobWorkEntries = useJobWorkGateInEntries(undefined, { enabled: isVisible('job-work') });
  const salesDispatchOutEntries = useSalesDispatchEntries(
    {
      from_date: dateRange.from,
      to_date: dateRange.to,
      document_type: 'INVOICE',
    },
    { enabled: isVisible('sales-dispatch') },
  );
  const bstOutDockingEntries = useSalesDispatchEntries(
    {
      from_date: dateRange.from,
      to_date: dateRange.to,
      document_type: 'STOCK_TRANSFER',
    },
    { enabled: isVisible('bst-out') },
  );

  const customerReturnEntries = useMemo(() => readCustomerFlowEntries(CUSTOMER_RETURN_KEY), []);
  const repairPartsOutEntries = useMemo(
    () => readRepairMovementEntries(REPAIR_PARTS_OUT_COMPLETED_KEY),
    [],
  );
  const repairPartsInEntries = useMemo(
    () => readRepairMovementEntries(REPAIR_PARTS_IN_COMPLETED_KEY),
    [],
  );
  const localRejectedQCReturnEntries = useMemo(() => readRejectedQCReturnEntries(), []);

  const rejectedEntries = rejectedQCReturnEntries.data?.length
    ? rejectedQCReturnEntries.data
    : localRejectedQCReturnEntries;
  const activeRepairIns = repairPartsInEntries.filter((entry) => entry.status !== 'CANCELLED');
  const linkedRepairOutEntries = new Set(
    activeRepairIns.map((entry) => getRepairMovementValue(entry, 'sourceOutEntry')),
  );
  const returnableRepairOutEntries = repairPartsOutEntries.filter(
    (entry) =>
      entry.status !== 'CANCELLED' && getRepairMovementValue(entry, 'returnable') === 'Yes',
  );
  const awaitingRepairReturn = returnableRepairOutEntries.filter(
    (entry) => !linkedRepairOutEntries.has(entry.entryNo),
  ).length;
  const receivedRepairReturn = returnableRepairOutEntries.length - awaitingRepairReturn;

  return {
    'raw-materials': {
      isLoading: rawMaterialCounts.isLoading,
      stats: buildVehicleCountStats(rawMaterialCounts.data?.total_vehicle_entries),
    },
    'daily-needs': {
      isLoading: dailyNeedsCounts.isLoading,
      stats: buildVehicleCountStats(dailyNeedsCounts.data?.total_vehicle_entries),
    },
    maintenance: {
      isLoading: maintenanceCounts.isLoading,
      stats: buildVehicleCountStats(maintenanceCounts.data?.total_vehicle_entries),
    },
    construction: {
      isLoading: constructionCounts.isLoading,
      stats: buildVehicleCountStats(constructionCounts.data?.total_vehicle_entries),
    },
    'visitor-labour': {
      isLoading: personDashboard.isLoading,
      stats: [
        {
          label: 'Inside',
          value: personDashboard.data?.current.total_inside ?? 0,
          tone: 'open',
        },
        {
          label: 'Today',
          value: personDashboard.data?.today.total_entries ?? 0,
          tone: 'total',
        },
      ],
    },
    'empty-vehicle-in': {
      isLoading: emptyVehicleInEntries.isLoading,
      stats: buildEntryArrayStats(emptyVehicleInEntries.data || [], {
        openLabel: 'Inside',
        isOpen: (entry) => !['COMPLETED', 'CANCELLED'].includes(entry.vehicle_entry_status),
        isCompleted: (entry) => entry.vehicle_entry_status === 'COMPLETED',
      }),
    },
    'bst-in': {
      isLoading: bstInEntries.isLoading,
      stats: buildEntryArrayStats(bstInEntries.data || []),
    },
    'bst-return': {
      isLoading: bstReturnEntries.isLoading,
      stats: buildEntryArrayStats(bstReturnEntries.data || [], { openLabel: 'Returned' }),
    },
    'customer-return': {
      stats: buildEntryArrayStats(customerReturnEntries, {
        openLabel: 'Open',
        isOpen: (entry) =>
          entry.status !== 'COMPLETED' &&
          entry.status !== 'CANCELLED' &&
          !isCustomerReturnAwaitingFactoryHead(entry),
        extraStats: [
          {
            label: 'FH',
            value: customerReturnEntries.filter(isCustomerReturnAwaitingFactoryHead).length,
            tone: 'warning',
          },
        ],
      }),
    },
    'repair-parts-in': {
      stats: [
        {
          label: 'Received',
          value: activeRepairIns.length,
          tone: 'completed',
        },
        {
          label: 'Linked',
          value: activeRepairIns.filter(
            (entry) => getRepairMovementValue(entry, 'sourceOutEntry') !== '-',
          ).length,
          tone: 'info',
        },
      ],
    },
    'rejected-qc-return': {
      isLoading: rejectedQCReturnEntries.isLoading,
      stats: [
        {
          label: 'Done',
          value: rejectedEntries.length,
          tone: 'completed',
        },
        {
          label: 'Items',
          value: rejectedEntries.reduce((sum, entry) => sum + (entry.items?.length || 0), 0),
          tone: 'total',
        },
      ],
    },
    'empty-vehicle-out': {
      isLoading: emptyVehicleEligibleEntries.isLoading || emptyVehicleOutEntries.isLoading,
      stats: [
        {
          label: 'Awaiting',
          value: emptyVehicleEligibleEntries.data?.length ?? 0,
          tone: 'warning',
        },
        ...buildEntryArrayStats(emptyVehicleOutEntries.data || []).slice(1),
      ],
    },
    'bst-out': {
      isLoading: bstOutDockingEntries.isLoading,
      stats: buildEntryArrayStats(bstOutDockingEntries.data || [], {
        openLabel: 'Pending',
        isOpen: (entry) => entry.status === 'PRINT_COMMITTED',
        isCompleted: (entry) => entry.status === 'DISPATCHED',
        extraStats: [
          {
            label: 'Docking',
            value: (bstOutDockingEntries.data || []).filter(
              (entry) => !['PRINT_COMMITTED', 'DISPATCHED', 'CANCELLED', 'REJECTED'].includes(entry.status),
            ).length,
            tone: 'info',
          },
        ],
      }),
    },
    'sales-dispatch': {
      isLoading: salesDispatchOutEntries.isLoading,
      stats: buildEntryArrayStats(salesDispatchOutEntries.data || [], {
        isOpen: (entry) => !['DISPATCHED', 'CANCELLED', 'REJECTED'].includes(entry.status),
        isCompleted: (entry) => entry.status === 'DISPATCHED',
        extraStats: [
          {
            label: 'Ready',
            value: (salesDispatchOutEntries.data || []).filter(
              (entry) => entry.status === 'PRINT_COMMITTED',
            ).length,
            tone: 'info',
          },
        ],
      }),
    },
    'repair-parts-out': {
      stats: [
        {
          label: 'Awaiting',
          value: awaitingRepairReturn,
          tone: 'warning',
        },
        {
          label: 'Returned',
          value: receivedRepairReturn,
          tone: 'completed',
        },
        {
          label: 'Total',
          value: repairPartsOutEntries.length,
          tone: 'total',
        },
      ],
    },
    'job-work': {
      isLoading: jobWorkEntries.isLoading,
      stats: [
        {
          label: 'Pending',
          value: (jobWorkEntries.data || []).filter(
            (entry) => getJobWorkDisplayStatus(entry) === 'PENDING',
          ).length,
          tone: 'warning',
        },
        {
          label: 'Linked',
          value: (jobWorkEntries.data || []).filter(hasLinkedJobWorkProductionOrder).length,
          tone: 'info',
        },
        {
          label: 'Total',
          value: jobWorkEntries.data?.length ?? 0,
          tone: 'total',
        },
      ],
    },
  };
}

function buildVehicleCountStats(
  counts?: Array<{ status: string; count: number }>,
): EntryTypeStat[] {
  const safeCounts = counts || [];
  const total = safeCounts.reduce((sum, item) => sum + item.count, 0);
  const completed = safeCounts
    .filter((item) => item.status === 'COMPLETED')
    .reduce((sum, item) => sum + item.count, 0);
  const open = safeCounts
    .filter((item) => !FINAL_STATUSES.has(item.status))
    .reduce((sum, item) => sum + item.count, 0);

  return [
    { label: 'Open', value: open, tone: 'open' },
    { label: 'Done', value: completed, tone: 'completed' },
    { label: 'Total', value: total, tone: 'total' },
  ];
}

function buildEntryArrayStats<T extends { status?: string }>(
  entries: T[],
  options: {
    openLabel?: string;
    statLimit?: number;
    isOpen?: (entry: T) => boolean;
    isCompleted?: (entry: T) => boolean;
    extraStats?: EntryTypeStat[];
  } = {},
): EntryTypeStat[] {
  const isOpen = options.isOpen || ((entry: T) => !FINAL_STATUSES.has(entry.status || ''));
  const isCompleted = options.isCompleted || ((entry: T) => entry.status === 'COMPLETED');
  const baseStats: EntryTypeStat[] = [
    {
      label: options.openLabel || 'Open',
      value: entries.filter(isOpen).length,
      tone: 'open',
    },
    {
      label: 'Done',
      value: entries.filter(isCompleted).length,
      tone: 'completed',
    },
    {
      label: 'Total',
      value: entries.length,
      tone: 'total',
    },
    ...(options.extraStats || []),
  ];

  return typeof options.statLimit === 'number' ? baseStats.slice(0, options.statLimit) : baseStats;
}
