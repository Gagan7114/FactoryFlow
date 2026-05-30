import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock3,
  LogIn,
  LogOut,
  type LucideIcon,
  Plus,
  RefreshCw,
  Scale,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { type KeyboardEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ENTRY_TYPES } from '@/config/constants';
import { usePermission } from '@/core/auth';
import type { DateRange } from '@/core/store/filtersSlice';
import { useGlobalDateRange } from '@/core/store/hooks';
import type {
  BSTGateInEntry,
  BSTGateOutEntry,
  BSTGateReturnEntry,
  EmptyVehicleEligibleEntry,
  EmptyVehicleGateInEntry,
  EmptyVehicleGateOutEntry,
  EntryLog,
  JobWorkGateInEntry,
  RejectedQCReturnEntryResponse,
  SalesDispatchGateOut,
  VehicleEntry,
} from '@/modules/gate/api';
import {
  useBSTGateInEntries,
  useBSTGateOutEntries,
  useBSTGateReturnEntries,
  useEmptyVehicleEligibleEntries,
  useEmptyVehicleGateInEntries,
  useEmptyVehicleGateOutEntries,
  useJobWorkGateInEntries,
  usePersonEntries,
  useRejectedQCReturnEntries,
  useSalesDispatchEntries,
  useVehicleEntries,
} from '@/modules/gate/api';
import { DateRangePicker, GateStatusBadge } from '@/modules/gate/components';
import { getLastStep } from '@/modules/gate/hooks';
import { getJobWorkDisplayStatus, hasLinkedJobWorkProductionOrder } from '@/modules/gate/utils';
import { Badge, Button, Input, Tabs, TabsList, TabsTrigger } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import {
  GATE_ENTRY_TYPES,
  type GateEntryDirection,
  type GateEntryTypeConfig,
} from '../constants/gateEntryTypes';
import {
  buildCustomerFlowItemSummary,
  buildCustomerFlowSearchText,
  CUSTOMER_RETURN_KEY,
  type CustomerFlowEntry,
  getCustomerFlowValue,
  getCustomerReturnStatusLabel,
  isCustomerReturnAwaitingFactoryHead,
  readCustomerFlowEntries,
} from './customerSalesFlow/customerSalesFlow.storage';
import { GATE_OUT_ROUTES } from './customerSalesFlow/salesDispatchRoutes';
import { EMPTY_VEHICLE_IN_ROUTES } from './emptyVehicleInPages/emptyVehicleInRoutes';
import {
  buildRejectedQCReturnEntryNo,
  readRejectedQCReturnEntries,
  type RejectedQCReturnEntry,
} from './rejectedMaterialPages/rejectedQcReturn.storage';
import {
  buildRepairMovementItemsSearchText,
  buildRepairMovementItemsSummary,
  getRepairMovementValue,
  readRepairMovementEntries,
  REPAIR_PARTS_IN_COMPLETED_KEY,
  REPAIR_PARTS_OUT_COMPLETED_KEY,
  type RepairMovementEntry,
} from './repairMovementPages/repairMovement.storage';

type QueueKey = 'all' | 'inside' | 'gate-out' | 'weighment' | 'review' | 'completed';

interface GateQueueOption {
  id: QueueKey;
  label: string;
  icon: LucideIcon;
}

interface UnifiedGateEntry {
  id: string;
  entryNo: string;
  movement: string;
  direction: GateEntryDirection;
  subject: string;
  subjectMeta?: string;
  document: string;
  documentMeta?: string;
  stage: string;
  status: string;
  timeLabel: string;
  sortTime: number;
  route: string;
  nextAction: string;
  queueKeys: QueueKey[];
  searchText: string;
}

type StatusTone = 'default' | 'active' | 'warning' | 'success';

const QUEUE_OPTIONS: GateQueueOption[] = [
  { id: 'all', label: 'All entries', icon: ClipboardList },
  { id: 'inside', label: 'Inside', icon: LogIn },
  { id: 'gate-out', label: 'Gate out due', icon: LogOut },
  { id: 'weighment', label: 'Weighment', icon: Scale },
  { id: 'review', label: 'Review', icon: ShieldCheck },
  { id: 'completed', label: 'Done today', icon: CheckCircle2 },
];

const CLASSIC_VEHICLE_TYPE_IDS = [
  'raw-materials',
  'daily-needs',
  'maintenance',
  'construction',
];

const FINAL_STATUSES = new Set([
  'COMPLETED',
  'CANCELLED',
  'REJECTED',
  'FINAL_REJECTED',
  'DISPATCHED',
  'OUT',
  'POSTED',
]);

const DIRECTION_LABELS: Record<GateEntryDirection, string> = {
  in: 'Gate In',
  out: 'Gate Out',
  return: 'Return In',
};

const DIRECTION_CLASSES: Record<GateEntryDirection, string> = {
  in: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300',
  out: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  return:
    'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300',
};

const STATUS_TONE_CLASSES: Record<StatusTone, string> = {
  default:
    'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300',
  active:
    'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300',
  warning:
    'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  success:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
};

export default function GateDashboardPage() {
  const navigate = useNavigate();
  const { hasAnyPermission } = usePermission();
  const { dateRange, dateRangeAsDateObjects, setDateRange, resetDateRange } = useGlobalDateRange();
  const [activeQueue, setActiveQueue] = useState<QueueKey>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const visibleEntryTypes = useMemo(
    () => GATE_ENTRY_TYPES.filter((entryType) => hasAnyPermission(entryType.viewPermissions)),
    [hasAnyPermission],
  );
  const visibleEntryIds = useMemo(
    () => new Set(visibleEntryTypes.map((entryType) => entryType.id)),
    [visibleEntryTypes],
  );
  const { entries, isLoading } = useUnifiedGateEntries(visibleEntryIds, dateRange);

  const queueCounts = useMemo(() => {
    const counts = Object.fromEntries(QUEUE_OPTIONS.map((option) => [option.id, 0])) as Record<
      QueueKey,
      number
    >;

    entries.forEach((entry) => {
      entry.queueKeys.forEach((key) => {
        counts[key] += 1;
      });
    });

    return counts;
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return entries.filter((entry) => {
      if (!entry.queueKeys.includes(activeQueue)) return false;
      if (!query) return true;
      return entry.searchText.toLowerCase().includes(query);
    });
  }, [activeQueue, entries, searchTerm]);

  const metrics = useMemo(
    () => [
      {
        label: 'Inside factory',
        value: queueCounts.inside,
        icon: LogIn,
        tone: 'active' as const,
        queue: 'inside' as QueueKey,
      },
      {
        label: 'Gate out due',
        value: queueCounts['gate-out'],
        icon: LogOut,
        tone: 'warning' as const,
        queue: 'gate-out' as QueueKey,
      },
      {
        label: 'Pending review',
        value: queueCounts.review,
        icon: ShieldCheck,
        tone: 'default' as const,
        queue: 'review' as QueueKey,
      },
      {
        label: 'Completed',
        value: queueCounts.completed,
        icon: CheckCircle2,
        tone: 'success' as const,
        queue: 'completed' as QueueKey,
      },
    ],
    [queueCounts],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Gate operations</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
            Gate Dashboard
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            One live queue for vehicles, people, returns, weighment, and gate-out work.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => navigate('/gate/new')}>
            <Plus className="h-4 w-4" />
            New movement
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <button
              key={metric.label}
              type="button"
              className={cn(
                'rounded-lg border bg-card p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                activeQueue === metric.queue && 'border-primary/50 ring-1 ring-primary/20',
              )}
              onClick={() => setActiveQueue(metric.queue)}
            >
              <span
                className={cn(
                  'inline-flex h-10 w-10 items-center justify-center rounded-lg border',
                  STATUS_TONE_CLASSES[metric.tone],
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="mt-3 block text-2xl font-semibold text-foreground">
                {metric.value}
              </span>
              <span className="mt-1 block text-sm font-medium text-muted-foreground">
                {metric.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-lg border bg-card p-3 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(240px,360px)_minmax(280px,1fr)]">
          <DateRangePicker
            date={dateRangeAsDateObjects}
            className="w-full"
            onDateChange={(date) => {
              if (date && 'from' in date) {
                setDateRange(date);
              } else {
                resetDateRange();
              }
            }}
          />
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search entry, vehicle, document, person, status"
              className="pl-9"
            />
          </div>
        </div>

        <Tabs
          value={activeQueue}
          onValueChange={(value) => setActiveQueue(value as QueueKey)}
          className="mt-3"
        >
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 bg-muted/70 p-1 md:grid-cols-3 xl:grid-cols-6">
            {QUEUE_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <TabsTrigger
                  key={option.id}
                  value={option.id}
                  className="h-10 gap-2 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm"
                >
                  <Icon className="h-4 w-4" />
                  <span className="truncate">{option.label}</span>
                  <span className="rounded-full bg-background px-1.5 text-[11px] font-semibold text-muted-foreground">
                    {queueCounts[option.id]}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>

      <section className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <div>
            <h3 className="font-semibold text-foreground">Movement queue</h3>
            <p className="text-sm text-muted-foreground">
              Showing{' '}
              <span className="font-semibold text-foreground">{filteredEntries.length}</span> of{' '}
              {entries.length} entries
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/gate/new')}>
            <Plus className="h-4 w-4" />
            New movement
          </Button>
        </div>

        {isLoading ? (
          <GateQueueEmptyState
            icon={Clock3}
            title="Loading gate movements"
            description="Fetching the current gate queue."
          />
        ) : filteredEntries.length === 0 ? (
          <GateQueueEmptyState
            icon={ClipboardList}
            title="No movements in this view"
            description="Change the queue, date range, or search term."
          />
        ) : (
          <div className="max-h-[620px] overflow-auto">
            <table className="w-full min-w-[1120px] text-sm">
              <thead className="sticky top-0 z-10 bg-muted/80 text-xs uppercase text-muted-foreground backdrop-blur">
                <tr>
                  <th className="w-[140px] px-4 py-3 text-left font-semibold">Time</th>
                  <th className="w-[160px] px-4 py-3 text-left font-semibold">Entry</th>
                  <th className="w-[190px] px-4 py-3 text-left font-semibold">Movement</th>
                  <th className="px-4 py-3 text-left font-semibold">Subject</th>
                  <th className="px-4 py-3 text-left font-semibold">Document</th>
                  <th className="w-[170px] px-4 py-3 text-left font-semibold">Stage</th>
                  <th className="w-[140px] px-4 py-3 text-left font-semibold">Status</th>
                  <th className="w-[150px] px-4 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <GateQueueRow
                    key={entry.id}
                    entry={entry}
                    onOpen={() => navigate(entry.route)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function GateQueueRow({ entry, onOpen }: { entry: UnifiedGateEntry; onOpen: () => void }) {
  const handleKeyDown = (event: KeyboardEvent<HTMLTableRowElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpen();
    }
  };

  return (
    <tr
      tabIndex={0}
      className="cursor-pointer border-b transition-colors last:border-b-0 hover:bg-orange-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:bg-orange-950/20"
      onClick={onOpen}
      onKeyDown={handleKeyDown}
    >
      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{entry.timeLabel}</td>
      <td className="px-4 py-3">
        <div className="font-semibold text-foreground">{entry.entryNo}</div>
        <Badge variant="outline" className={cn('mt-1 border', DIRECTION_CLASSES[entry.direction])}>
          {DIRECTION_LABELS[entry.direction]}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <div className="font-semibold text-foreground">{entry.movement}</div>
        <div className="mt-1 text-xs text-muted-foreground">{entry.nextAction}</div>
      </td>
      <td className="px-4 py-3">
        <div className="font-medium text-foreground">{entry.subject}</div>
        {entry.subjectMeta && (
          <div className="mt-1 text-xs text-muted-foreground">{entry.subjectMeta}</div>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="font-medium text-foreground">{entry.document}</div>
        {entry.documentMeta && (
          <div className="mt-1 text-xs text-muted-foreground">{entry.documentMeta}</div>
        )}
      </td>
      <td className="px-4 py-3 text-muted-foreground">{entry.stage}</td>
      <td className="px-4 py-3">
        <GateStatusBadge status={entry.status} />
      </td>
      <td className="px-4 py-3 text-right">
        <Button
          size="sm"
          variant="outline"
          onClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
        >
          Open
          <ArrowRight className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  );
}

function GateQueueEmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center p-8 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg border border-orange-200 bg-orange-50 text-primary dark:border-orange-800 dark:bg-orange-950/40">
        <Icon className="h-6 w-6" />
      </span>
      <p className="mt-4 font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function useUnifiedGateEntries(visibleEntryIds: Set<string>, dateRange: DateRange) {
  const dateParams = useMemo(
    () => ({
      from_date: dateRange.from,
      to_date: dateRange.to,
    }),
    [dateRange.from, dateRange.to],
  );
  const isVisible = (entryTypeId: string) => visibleEntryIds.has(entryTypeId);
  const entryTypeById = useMemo(
    () =>
      Object.fromEntries(GATE_ENTRY_TYPES.map((entryType) => [entryType.id, entryType])) as Record<
        string,
        GateEntryTypeConfig
      >,
    [],
  );

  const rawMaterialEntries = useVehicleEntries(
    { ...dateParams, entry_type: ENTRY_TYPES.RAW_MATERIAL },
    { enabled: isVisible('raw-materials') },
  );
  const dailyNeedEntries = useVehicleEntries(
    { ...dateParams, entry_type: ENTRY_TYPES.DAILY_NEED },
    { enabled: isVisible('daily-needs') },
  );
  const maintenanceEntries = useVehicleEntries(
    { ...dateParams, entry_type: ENTRY_TYPES.MAINTENANCE },
    { enabled: isVisible('maintenance') },
  );
  const constructionEntries = useVehicleEntries(
    { ...dateParams, entry_type: ENTRY_TYPES.CONSTRUCTION },
    { enabled: isVisible('construction') },
  );
  const personEntries = usePersonEntries(dateParams, { enabled: isVisible('visitor-labour') });
  const emptyVehicleInEntries = useEmptyVehicleGateInEntries(dateParams, {
    enabled: isVisible('empty-vehicle-in'),
  });
  const emptyVehicleEligibleEntries = useEmptyVehicleEligibleEntries(dateParams, {
    enabled: isVisible('empty-vehicle-out'),
  });
  const emptyVehicleOutEntries = useEmptyVehicleGateOutEntries(dateParams, {
    enabled: isVisible('empty-vehicle-out'),
  });
  const bstInEntries = useBSTGateInEntries(dateParams, { enabled: isVisible('bst-in') });
  const bstReturnEntries = useBSTGateReturnEntries(dateParams, {
    enabled: isVisible('bst-return'),
  });
  const bstOutEntries = useBSTGateOutEntries(dateParams, { enabled: isVisible('bst-out') });
  const rejectedQCReturnEntries = useRejectedQCReturnEntries(dateParams, {
    enabled: isVisible('rejected-qc-return'),
  });
  const jobWorkEntries = useJobWorkGateInEntries(dateParams, { enabled: isVisible('job-work') });
  const salesDispatchEntries = useSalesDispatchEntries(
    { ...dateParams, document_type: 'INVOICE' },
    { enabled: isVisible('sales-dispatch') },
  );
  const dockingBSTOutEntries = useSalesDispatchEntries(
    { ...dateParams, document_type: 'STOCK_TRANSFER' },
    { enabled: isVisible('bst-out') },
  );

  const customerReturnEntries = isVisible('customer-return')
    ? filterCustomerFlowEntriesByDate(
        readCustomerFlowEntries(CUSTOMER_RETURN_KEY),
        dateRange,
        'gateInDate',
      )
    : [];
  const repairPartsOutEntries = isVisible('repair-parts-out')
    ? filterRepairMovementEntriesByDate(
        readRepairMovementEntries(REPAIR_PARTS_OUT_COMPLETED_KEY),
        dateRange,
        'gateOutDate',
      )
    : [];
  const repairPartsInEntries = isVisible('repair-parts-in')
    ? filterRepairMovementEntriesByDate(
        readRepairMovementEntries(REPAIR_PARTS_IN_COMPLETED_KEY),
        dateRange,
        'gateInDate',
      )
    : [];
  const localRejectedEntries = isVisible('rejected-qc-return')
    ? filterRejectedQCReturnEntriesByDate(readRejectedQCReturnEntries(), dateRange)
    : [];

  const classicQueries = [
    rawMaterialEntries,
    dailyNeedEntries,
    maintenanceEntries,
    constructionEntries,
  ];

  const nextEntries: UnifiedGateEntry[] = [];

  CLASSIC_VEHICLE_TYPE_IDS.forEach((entryTypeId, index) => {
    if (!isVisible(entryTypeId)) return;
    const entryType = entryTypeById[entryTypeId];
    classicQueries[index].data?.forEach((entry) => {
      nextEntries.push(adaptClassicVehicleEntry(entry, entryType));
    });
  });

  if (isVisible('visitor-labour')) {
    personEntries.data?.forEach((entry) => {
      nextEntries.push(adaptPersonEntry(entry, entryTypeById['visitor-labour']));
    });
  }

  if (isVisible('empty-vehicle-in')) {
    emptyVehicleInEntries.data?.forEach((entry) => {
      nextEntries.push(adaptEmptyVehicleInEntry(entry, entryTypeById['empty-vehicle-in']));
    });
  }

  if (isVisible('empty-vehicle-out')) {
    emptyVehicleEligibleEntries.data?.forEach((entry) => {
      nextEntries.push(adaptEmptyVehicleEligibleEntry(entry, entryTypeById['empty-vehicle-out']));
    });
    emptyVehicleOutEntries.data?.forEach((entry) => {
      nextEntries.push(adaptEmptyVehicleOutEntry(entry, entryTypeById['empty-vehicle-out']));
    });
  }

  if (isVisible('bst-in')) {
    bstInEntries.data?.forEach((entry) => {
      nextEntries.push(adaptBSTInEntry(entry, entryTypeById['bst-in']));
    });
  }

  if (isVisible('bst-return')) {
    bstReturnEntries.data?.forEach((entry) => {
      nextEntries.push(adaptBSTReturnEntry(entry, entryTypeById['bst-return']));
    });
  }

  if (isVisible('bst-out')) {
    bstOutEntries.data?.forEach((entry) => {
      nextEntries.push(adaptBSTOutEntry(entry, entryTypeById['bst-out']));
    });
    dockingBSTOutEntries.data?.forEach((entry) => {
      nextEntries.push(adaptSalesDispatchEntry(entry, entryTypeById['bst-out'], 'bst-out'));
    });
  }

  if (isVisible('customer-return')) {
    customerReturnEntries.forEach((entry) => {
      nextEntries.push(adaptCustomerReturnEntry(entry, entryTypeById['customer-return']));
    });
  }

  if (isVisible('repair-parts-out')) {
    repairPartsOutEntries.forEach((entry) => {
      nextEntries.push(adaptRepairMovementEntry(entry, entryTypeById['repair-parts-out'], 'out'));
    });
  }

  if (isVisible('repair-parts-in')) {
    repairPartsInEntries.forEach((entry) => {
      nextEntries.push(adaptRepairMovementEntry(entry, entryTypeById['repair-parts-in'], 'in'));
    });
  }

  if (isVisible('rejected-qc-return')) {
    const rejectedEntries = rejectedQCReturnEntries.data?.length
      ? rejectedQCReturnEntries.data
      : localRejectedEntries;
    rejectedEntries.forEach((entry) => {
      nextEntries.push(adaptRejectedQCReturnEntry(entry, entryTypeById['rejected-qc-return']));
    });
  }

  if (isVisible('sales-dispatch')) {
    salesDispatchEntries.data?.forEach((entry) => {
      nextEntries.push(
        adaptSalesDispatchEntry(entry, entryTypeById['sales-dispatch'], 'sales-dispatch'),
      );
    });
  }

  if (isVisible('job-work')) {
    jobWorkEntries.data?.forEach((entry) => {
      nextEntries.push(adaptJobWorkEntry(entry, entryTypeById['job-work']));
    });
  }

  const entries = nextEntries.sort((a, b) => b.sortTime - a.sortTime);

  const isLoading =
    classicQueries.some((query) => query.isLoading) ||
    personEntries.isLoading ||
    emptyVehicleInEntries.isLoading ||
    emptyVehicleEligibleEntries.isLoading ||
    emptyVehicleOutEntries.isLoading ||
    bstInEntries.isLoading ||
    bstOutEntries.isLoading ||
    bstReturnEntries.isLoading ||
    rejectedQCReturnEntries.isLoading ||
    jobWorkEntries.isLoading ||
    salesDispatchEntries.isLoading ||
    dockingBSTOutEntries.isLoading;

  return { entries, isLoading };
}

function adaptClassicVehicleEntry(
  entry: VehicleEntry,
  entryType: GateEntryTypeConfig,
): UnifiedGateEntry {
  const status = entry.status || 'DRAFT';
  const isFinal = isFinalStatus(status);
  const lastStep = isFinal ? 'review' : getLastStep(entry.id) || 'step1';
  const vehicleNumber = entry.vehicle?.vehicle_number || 'Vehicle';
  const driverName = entry.driver?.name || entry.driver?.mobile || '-';
  const queueKeys = buildQueueKeys({
    direction: entryType.direction,
    isFinal,
    needsReview: !isFinal,
  });

  return buildEntry({
    id: `${entryType.id}-${entry.id}`,
    entryNo: entry.entry_no,
    movement: entryType.title,
    direction: entryType.direction,
    subject: vehicleNumber,
    subjectMeta: driverName,
    document: entry.remarks || entry.entry_no,
    documentMeta: entryType.description,
    stage: isFinal ? 'Completed' : formatStepLabel(lastStep),
    status,
    time: entry.entry_time || entry.updated_at || entry.created_at,
    route: `${entryType.dashboardRoute}/edit/${entry.id}/${lastStep}`,
    nextAction: isFinal ? 'Open record' : 'Continue entry',
    queueKeys,
    searchParts: [
      entryType.title,
      entryType.description,
      entry.entry_no,
      status,
      vehicleNumber,
      driverName,
      entry.remarks,
      entryType.keywords.join(' '),
    ],
  });
}

function adaptPersonEntry(entry: EntryLog, entryType: GateEntryTypeConfig): UnifiedGateEntry {
  const status = entry.status;
  const isInside = status === 'IN';
  const isFinal = status === 'OUT' || status === 'CANCELLED';
  const subject = entry.name_snapshot || 'Person';
  const typeLabel = entry.person_type?.name || 'Visitor/Labour';
  const queueKeys = buildQueueKeys({
    direction: entryType.direction,
    isFinal,
    inside: isInside,
    completed: status === 'OUT',
  });

  return buildEntry({
    id: `${entryType.id}-${entry.id}`,
    entryNo: `PERSON-${entry.id}`,
    movement: entryType.title,
    direction: entryType.direction,
    subject,
    subjectMeta: [typeLabel, entry.vehicle_no].filter(Boolean).join(' - '),
    document: entry.purpose || 'People movement',
    documentMeta: [entry.gate_in?.name, entry.gate_out?.name].filter(Boolean).join(' to '),
    stage: isInside ? 'Inside factory' : status === 'OUT' ? 'Exited' : 'Cancelled',
    status,
    time: entry.exit_time || entry.entry_time || entry.updated_at,
    route: `/gate/visitor-labour/entry/${entry.id}`,
    nextAction: isInside ? 'Mark exit' : 'Open record',
    queueKeys,
    searchParts: [
      entry.id,
      subject,
      typeLabel,
      entry.vehicle_no,
      entry.purpose,
      status,
      entry.remarks,
    ],
  });
}

function adaptEmptyVehicleInEntry(
  entry: EmptyVehicleGateInEntry,
  entryType: GateEntryTypeConfig,
): UnifiedGateEntry {
  const isFinal = entry.vehicle_entry_status === 'COMPLETED';
  const queueKeys = buildQueueKeys({
    direction: entryType.direction,
    isFinal,
    inside: !isFinal && entry.vehicle_entry_status !== 'CANCELLED',
    completed: isFinal,
    needsReview: !isFinal,
  });
  const route = isFinal
    ? EMPTY_VEHICLE_IN_ROUTES.review(entry.id)
    : EMPTY_VEHICLE_IN_ROUTES.details(entry.id);

  return buildEntry({
    id: `${entryType.id}-${entry.id}`,
    entryNo: entry.entry_no,
    movement: entryType.title,
    direction: entryType.direction,
    subject: entry.vehicle_number,
    subjectMeta: entry.driver_name,
    document: entry.sap_doc_num || entry.document_reference || entry.reason_display,
    documentMeta: entry.reason_display,
    stage: isFinal ? 'Completed' : 'Inside factory',
    status: entry.vehicle_entry_status,
    time: joinDateTime(entry.gate_in_date, entry.in_time) || entry.updated_at,
    route,
    nextAction: isFinal ? 'Open record' : 'Continue inward',
    queueKeys,
    searchParts: [
      entry.entry_no,
      entry.vehicle_number,
      entry.driver_name,
      entry.reason_display,
      entry.sap_doc_num,
      entry.document_reference,
      entry.vehicle_entry_status,
    ],
  });
}

function adaptEmptyVehicleEligibleEntry(
  entry: EmptyVehicleEligibleEntry,
  entryType: GateEntryTypeConfig,
): UnifiedGateEntry {
  return buildEntry({
    id: `${entryType.id}-eligible-${entry.id}`,
    entryNo: entry.entry_no,
    movement: entryType.title,
    direction: entryType.direction,
    subject: entry.vehicle_number,
    subjectMeta: entry.driver_name,
    document: formatStatusLabel(entry.entry_type),
    documentMeta: entry.remarks,
    stage: 'Awaiting gate out',
    status: entry.status,
    time: entry.entry_time,
    route: '/gate/empty-vehicle-out/new',
    nextAction: 'Record gate out',
    queueKeys: ['all', 'gate-out', 'weighment'],
    searchParts: [
      entry.entry_no,
      entry.entry_type,
      entry.status,
      entry.vehicle_number,
      entry.vehicle_type,
      entry.driver_name,
      entry.remarks,
    ],
  });
}

function adaptEmptyVehicleOutEntry(
  entry: EmptyVehicleGateOutEntry,
  entryType: GateEntryTypeConfig,
): UnifiedGateEntry {
  const isCancelled = entry.status === 'CANCELLED';

  return buildEntry({
    id: `${entryType.id}-out-${entry.id}`,
    entryNo: entry.entry_no,
    movement: entryType.title,
    direction: entryType.direction,
    subject: entry.vehicle_number,
    subjectMeta: entry.driver_name,
    document: entry.vehicle_entry_no,
    documentMeta: formatStatusLabel(entry.vehicle_entry_type),
    stage: isCancelled ? 'Cancelled' : 'Gate out completed',
    status: entry.status,
    time: joinDateTime(entry.gate_out_date, entry.out_time) || entry.updated_at,
    route: `/gate/empty-vehicle-out/${entry.id}`,
    nextAction: 'Open record',
    queueKeys: buildQueueKeys({
      direction: entryType.direction,
      isFinal: true,
      completed: entry.status === 'COMPLETED',
    }),
    searchParts: [
      entry.entry_no,
      entry.vehicle_entry_no,
      entry.vehicle_entry_type,
      entry.vehicle_number,
      entry.driver_name,
      entry.status,
    ],
  });
}

function adaptBSTInEntry(
  entry: BSTGateInEntry,
  entryType: GateEntryTypeConfig,
): UnifiedGateEntry {
  const isFinal = isFinalStatus(entry.status);
  const route = getBSTInResumePath(entry);

  return buildEntry({
    id: `${entryType.id}-${entry.id}`,
    entryNo: entry.entry_no,
    movement: entryType.title,
    direction: entryType.direction,
    subject: entry.vehicle_number,
    subjectMeta: entry.driver_name,
    document: entry.sap_doc_num,
    documentMeta: [entry.sap_from_warehouse, entry.sap_to_warehouse].filter(Boolean).join(' to '),
    stage: isFinal ? 'Received' : 'Receiving',
    status: entry.status,
    time: joinDateTime(entry.gate_in_date, entry.in_time) || entry.updated_at,
    route,
    nextAction: isFinal ? 'Open record' : 'Complete receipt',
    queueKeys: buildQueueKeys({
      direction: entryType.direction,
      isFinal,
      inside: !isFinal,
      completed: entry.status === 'COMPLETED',
      needsReview: !isFinal,
    }),
    searchParts: [
      entry.entry_no,
      entry.bst_gate_out_entry_no,
      entry.vehicle_number,
      entry.driver_name,
      entry.sap_doc_num,
      entry.sap_from_warehouse,
      entry.sap_to_warehouse,
      entry.status,
    ],
  });
}

function adaptBSTReturnEntry(
  entry: BSTGateReturnEntry,
  entryType: GateEntryTypeConfig,
): UnifiedGateEntry {
  const isFinal = isFinalStatus(entry.status);
  const route = getBSTReturnResumePath(entry);

  return buildEntry({
    id: `${entryType.id}-${entry.id}`,
    entryNo: entry.entry_no,
    movement: entryType.title,
    direction: entryType.direction,
    subject: entry.vehicle_number,
    subjectMeta: entry.driver_name,
    document: entry.sap_doc_num,
    documentMeta: entry.bst_gate_out_entry_no,
    stage: isFinal ? 'Return completed' : 'Return receiving',
    status: entry.status,
    time: joinDateTime(entry.gate_in_date, entry.in_time) || entry.updated_at,
    route,
    nextAction: isFinal ? 'Open record' : 'Complete return',
    queueKeys: buildQueueKeys({
      direction: entryType.direction,
      isFinal,
      inside: !isFinal,
      completed: entry.status === 'COMPLETED',
      needsReview: !isFinal,
    }),
    searchParts: [
      entry.entry_no,
      entry.bst_gate_out_entry_no,
      entry.vehicle_number,
      entry.driver_name,
      entry.sap_doc_num,
      entry.sap_from_warehouse,
      entry.sap_to_warehouse,
      entry.status,
    ],
  });
}

function adaptBSTOutEntry(entry: BSTGateOutEntry, entryType: GateEntryTypeConfig): UnifiedGateEntry {
  const isFinal = isFinalStatus(entry.status);
  const route = `/gate/bst-out/new/review?entryId=${encodeURIComponent(
    String(entry.vehicle_entry),
  )}`;

  return buildEntry({
    id: `${entryType.id}-legacy-${entry.id}`,
    entryNo: entry.entry_no,
    movement: entryType.title,
    direction: entryType.direction,
    subject: entry.vehicle_number,
    subjectMeta: entry.driver_name,
    document: entry.sap_doc_num,
    documentMeta: [entry.sap_from_warehouse, entry.sap_to_warehouse].filter(Boolean).join(' to '),
    stage: isFinal ? 'Gate out completed' : 'Gate out review',
    status: entry.status,
    time: joinDateTime(entry.gate_out_date, entry.out_time) || entry.updated_at,
    route,
    nextAction: isFinal ? 'Open record' : 'Continue gate out',
    queueKeys: buildQueueKeys({
      direction: entryType.direction,
      isFinal,
      gateOut: !isFinal,
      completed: entry.status === 'COMPLETED',
      needsReview: !isFinal,
    }),
    searchParts: [
      entry.entry_no,
      entry.vehicle_number,
      entry.driver_name,
      entry.sap_doc_num,
      entry.sap_from_warehouse,
      entry.sap_to_warehouse,
      entry.status,
    ],
  });
}

function adaptCustomerReturnEntry(
  entry: CustomerFlowEntry,
  entryType: GateEntryTypeConfig,
): UnifiedGateEntry {
  const status = getCustomerReturnStatusLabel(entry);
  const awaitingHead = isCustomerReturnAwaitingFactoryHead(entry);
  const isFinal = entry.status === 'COMPLETED' || entry.status === 'CANCELLED';

  return buildEntry({
    id: `${entryType.id}-${entry.id}`,
    entryNo: entry.entryNo,
    movement: entryType.title,
    direction: entryType.direction,
    subject: getCustomerFlowValue(entry, 'vehicleNo'),
    subjectMeta: getCustomerFlowValue(entry, 'driverName'),
    document: getCustomerFlowValue(entry, 'invoiceNo'),
    documentMeta: buildCustomerFlowItemSummary(entry.items),
    stage: awaitingHead ? 'Factory head review' : isFinal ? 'Posted' : 'Return processing',
    status,
    time: getCustomerFlowValue(entry, 'gateInDate') || entry.updatedAt,
    route: `/gate/customer-return/${entry.id}`,
    nextAction: awaitingHead ? 'Review decision' : isFinal ? 'Open record' : 'Continue return',
    queueKeys: buildQueueKeys({
      direction: entryType.direction,
      isFinal,
      inside: !isFinal,
      completed: entry.status === 'COMPLETED',
      needsReview: !isFinal || awaitingHead,
    }),
    searchParts: [buildCustomerFlowSearchText(entry), status],
  });
}

function adaptRepairMovementEntry(
  entry: RepairMovementEntry,
  entryType: GateEntryTypeConfig,
  direction: 'in' | 'out',
): UnifiedGateEntry {
  const isFinal = entry.status === 'COMPLETED' || entry.status === 'CANCELLED';
  const route = `/gate/repair-parts-${direction}/${entry.id}`;

  return buildEntry({
    id: `${entryType.id}-${entry.id}`,
    entryNo: entry.entryNo,
    movement: entryType.title,
    direction: entryType.direction,
    subject: getRepairMovementValue(entry, 'vehicleNo'),
    subjectMeta: getRepairMovementValue(entry, 'driverName'),
    document: buildRepairMovementItemsSummary(entry),
    documentMeta: getRepairMovementValue(entry, 'vendorName'),
    stage: direction === 'out' ? 'Sent for repair' : 'Received back',
    status: entry.status,
    time:
      getRepairMovementValue(entry, direction === 'out' ? 'gateOutDate' : 'gateInDate') ||
      entry.updatedAt,
    route,
    nextAction: 'Open record',
    queueKeys: buildQueueKeys({
      direction: entryType.direction,
      isFinal,
      completed: entry.status === 'COMPLETED',
    }),
    searchParts: [
      entry.entryNo,
      entry.status,
      getRepairMovementValue(entry, 'vehicleNo'),
      getRepairMovementValue(entry, 'driverName'),
      getRepairMovementValue(entry, 'vendorName'),
      buildRepairMovementItemsSearchText(entry),
    ],
  });
}

function adaptRejectedQCReturnEntry(
  entry: RejectedQCReturnEntryResponse | RejectedQCReturnEntry,
  entryType: GateEntryTypeConfig,
): UnifiedGateEntry {
  if ('vehicle' in entry && typeof entry.vehicle === 'object') {
    return buildEntry({
      id: `${entryType.id}-local-${entry.id}`,
      entryNo: entry.entryNo || buildRejectedQCReturnEntryNo(),
      movement: entryType.title,
      direction: entryType.direction,
      subject: entry.vehicle.vehicleNo || 'Vehicle',
      subjectMeta: entry.vehicle.driverName,
      document: entry.vehicle.challanNo || entry.vehicle.manualSapRef || 'Rejected QC',
      documentMeta: entry.items?.[0]?.itemName || `${entry.items.length} items`,
      stage: 'Gate out completed',
      status: entry.status,
      time: entry.vehicle.gateOutDate || entry.updatedAt,
      route: '/gate/rejected-qc-return',
      nextAction: 'Open queue',
      queueKeys: ['all', 'completed'],
      searchParts: [
        entry.entryNo,
        entry.status,
        entry.vehicle.vehicleNo,
        entry.vehicle.driverName,
        entry.vehicle.challanNo,
        entry.items.map((item) => item.itemName).join(' '),
      ],
    });
  }

  const isFinal = entry.status === 'COMPLETED' || entry.status === 'CANCELLED';

  return buildEntry({
    id: `${entryType.id}-${entry.id}`,
    entryNo: entry.entry_no,
    movement: entryType.title,
    direction: entryType.direction,
    subject: entry.vehicle_number,
    subjectMeta: entry.driver_name,
    document: entry.challan_no || entry.eway_bill_no || 'Rejected QC',
    documentMeta: entry.items?.[0]?.item_name || `${entry.items?.length || 0} items`,
    stage: isFinal ? 'Gate out completed' : 'Weighment pending',
    status: entry.status,
    time: joinDateTime(entry.gate_out_date, entry.out_time) || entry.updated_at,
    route: '/gate/rejected-qc-return',
    nextAction: isFinal ? 'Open queue' : 'Continue return',
    queueKeys: buildQueueKeys({
      direction: entryType.direction,
      isFinal,
      gateOut: !isFinal,
      weighment: !isFinal,
      completed: entry.status === 'COMPLETED',
    }),
    searchParts: [
      entry.entry_no,
      entry.status,
      entry.vehicle_number,
      entry.driver_name,
      entry.challan_no,
      entry.eway_bill_no,
      entry.items?.map((item) => item.item_name).join(' '),
    ],
  });
}

function adaptSalesDispatchEntry(
  entry: SalesDispatchGateOut,
  entryType: GateEntryTypeConfig,
  flow: 'sales-dispatch' | 'bst-out',
): UnifiedGateEntry {
  const hasWeighment = hasCompleteGateOutWeighment(entry);
  const isFinal = isFinalStatus(entry.status);
  const isReadyForGateOut = entry.status === 'PRINT_COMMITTED';
  const route =
    flow === 'bst-out'
      ? hasWeighment
        ? GATE_OUT_ROUTES.bstOutGatepass(entry.vehicle_entry)
        : GATE_OUT_ROUTES.bstOutWeighment(entry.vehicle_entry)
      : hasWeighment
        ? GATE_OUT_ROUTES.salesDispatchOutGatepass(entry.vehicle_entry)
        : GATE_OUT_ROUTES.salesDispatchOutWeighment(entry.vehicle_entry);

  return buildEntry({
    id: `${entryType.id}-docking-${entry.id}`,
    entryNo: entry.entry_no,
    movement: entryType.title,
    direction: entryType.direction,
    subject: entry.vehicle_no,
    subjectMeta: entry.driver_name,
    document: entry.sap_doc_num,
    documentMeta: entry.customer_name || [entry.from_warehouse, entry.to_warehouse].filter(Boolean).join(' to '),
    stage: getSalesDispatchStage(entry),
    status: entry.status,
    time: joinDateTime(entry.gate_out_date || entry.dispatch_date, entry.out_time) || entry.updated_at,
    route: isFinal
      ? flow === 'bst-out'
        ? GATE_OUT_ROUTES.bstOutDashboard
        : GATE_OUT_ROUTES.salesDispatchOutEntry(entry.id)
      : route,
    nextAction: getSalesDispatchNextAction(entry),
    queueKeys: buildQueueKeys({
      direction: entryType.direction,
      isFinal,
      gateOut: isReadyForGateOut,
      weighment: !hasWeighment && !isFinal,
      completed: entry.status === 'DISPATCHED',
      needsReview: !isFinal && !isReadyForGateOut,
    }),
    searchParts: [
      entry.entry_no,
      entry.status,
      entry.vehicle_no,
      entry.driver_name,
      entry.sap_doc_num,
      entry.customer_name,
      entry.from_warehouse,
      entry.to_warehouse,
      entry.document_numbers?.join(' '),
    ],
  });
}

function adaptJobWorkEntry(
  entry: JobWorkGateInEntry,
  entryType: GateEntryTypeConfig,
): UnifiedGateEntry {
  const displayStatus = getJobWorkDisplayStatus(entry);
  const isFinal = displayStatus === 'COMPLETED' || entry.status === 'CANCELLED';
  const linked = hasLinkedJobWorkProductionOrder(entry);

  return buildEntry({
    id: `${entryType.id}-${entry.id}`,
    entryNo: entry.entry_no,
    movement: entryType.title,
    direction: entryType.direction,
    subject: entry.vehicle_number,
    subjectMeta: entry.driver_name,
    document: entry.production_order_doc_num || entry.sap_doc_num || 'Pending production order',
    documentMeta: entry.production_item_name || entry.sap_supplier_name,
    stage: linked ? 'Production linked' : 'Awaiting link',
    status: displayStatus,
    time: joinDateTime(entry.gate_in_date, entry.in_time) || entry.updated_at,
    route: getJobWorkResumePath(entry),
    nextAction: linked ? 'Open record' : 'Link production',
    queueKeys: buildQueueKeys({
      direction: entryType.direction,
      isFinal,
      weighment: !isFinal,
      needsReview: !linked || !isFinal,
      completed: displayStatus === 'COMPLETED',
    }),
    searchParts: [
      entry.entry_no,
      entry.vehicle_number,
      entry.driver_name,
      entry.sap_doc_num,
      entry.sap_supplier_name,
      entry.production_order_doc_num,
      entry.production_item_name,
      displayStatus,
    ],
  });
}

function buildEntry({
  id,
  entryNo,
  movement,
  direction,
  subject,
  subjectMeta,
  document,
  documentMeta,
  stage,
  status,
  time,
  route,
  nextAction,
  queueKeys,
  searchParts,
}: Omit<UnifiedGateEntry, 'timeLabel' | 'sortTime' | 'searchText'> & {
  time?: string | null;
  searchParts: unknown[];
}): UnifiedGateEntry {
  return {
    id,
    entryNo: entryNo || '-',
    movement,
    direction,
    subject: subject || '-',
    subjectMeta: subjectMeta && subjectMeta !== '-' ? subjectMeta : undefined,
    document: document || '-',
    documentMeta: documentMeta && documentMeta !== '-' ? documentMeta : undefined,
    stage,
    status,
    timeLabel: formatDateTime(time),
    sortTime: toTimestamp(time),
    route,
    nextAction,
    queueKeys: Array.from(new Set(queueKeys)),
    searchText: searchParts
      .filter((part) => part !== undefined && part !== null)
      .map((part) => String(part))
      .join(' '),
  };
}

function buildQueueKeys({
  direction,
  isFinal,
  inside,
  gateOut,
  weighment,
  needsReview,
  completed,
}: {
  direction: GateEntryDirection;
  isFinal: boolean;
  inside?: boolean;
  gateOut?: boolean;
  weighment?: boolean;
  needsReview?: boolean;
  completed?: boolean;
}): QueueKey[] {
  const keys: QueueKey[] = ['all'];

  if (completed) keys.push('completed');
  if (isFinal) return keys;
  if (inside ?? direction !== 'out') keys.push('inside');
  if (gateOut) keys.push('gate-out');
  if (weighment) keys.push('weighment');
  if (needsReview) keys.push('review');

  return keys;
}

function getBSTInResumePath(entry: BSTGateInEntry) {
  const vehicleEntryId = entry.vehicle_entry;

  if (entry.status === 'COMPLETED') {
    return `/gate/bst-in/new/review?entryId=${vehicleEntryId}`;
  }

  const lastStep = getLastStep(vehicleEntryId);

  switch (lastStep) {
    case 'review':
      return `/gate/bst-in/new/review?entryId=${vehicleEntryId}`;
    case 'attachments':
      return `/gate/bst-in/new/attachments?entryId=${vehicleEntryId}`;
    default:
      return `/gate/bst-in/new?entryId=${vehicleEntryId}`;
  }
}

function getBSTReturnResumePath(entry: BSTGateReturnEntry) {
  const vehicleEntryId = entry.vehicle_entry;

  if (entry.status === 'COMPLETED') {
    return `/gate/bst-return/new/review?entryId=${vehicleEntryId}`;
  }

  const lastStep = getLastStep(vehicleEntryId);

  switch (lastStep) {
    case 'review':
      return `/gate/bst-return/new/review?entryId=${vehicleEntryId}`;
    case 'attachments':
      return `/gate/bst-return/new/attachments?entryId=${vehicleEntryId}`;
    default:
      return `/gate/bst-return/new?entryId=${vehicleEntryId}`;
  }
}

function getJobWorkResumePath(entry: JobWorkGateInEntry) {
  const vehicleEntryId = entry.vehicle_entry;

  if (entry.status === 'COMPLETED') {
    return `/gate/job-work/new?entryId=${vehicleEntryId}`;
  }

  const lastStep = getLastStep(vehicleEntryId);

  switch (lastStep) {
    case 'review':
      return `/gate/job-work/new/review?entryId=${vehicleEntryId}`;
    case 'attachments':
      return `/gate/job-work/new/attachments?entryId=${vehicleEntryId}`;
    case 'step2':
      return `/gate/job-work/new/step2?entryId=${vehicleEntryId}`;
    default:
      return `/gate/job-work/new?entryId=${vehicleEntryId}`;
  }
}

function hasCompleteGateOutWeighment(entry: SalesDispatchGateOut) {
  return Boolean(
    entry.gross_weight &&
      entry.tare_weight &&
      entry.net_weight &&
      entry.first_weighment_time &&
      entry.second_weighment_time,
  );
}

function getSalesDispatchStage(entry: SalesDispatchGateOut) {
  if (entry.status === 'PRINT_COMMITTED') return 'Ready for gate out';
  if (entry.status === 'GATEPASS_PRINTED') return 'Print committed pending';
  if (entry.status === 'READY_FOR_GATEPASS') return 'Gatepass pending';
  if (entry.status === 'DISPATCHED') return 'Dispatched';
  if (entry.status === 'CANCELLED' || entry.status === 'REJECTED') return formatStatusLabel(entry.status);
  if (!hasCompleteGateOutWeighment(entry)) return 'Weighment pending';
  return 'Gate out processing';
}

function getSalesDispatchNextAction(entry: SalesDispatchGateOut) {
  if (entry.status === 'PRINT_COMMITTED') return 'Mark gate out';
  if (entry.status === 'DISPATCHED') return 'Open record';
  if (!hasCompleteGateOutWeighment(entry)) return 'Record weighment';
  return 'Prepare gatepass';
}

function isFinalStatus(status?: string | null) {
  return FINAL_STATUSES.has(String(status || '').toUpperCase());
}

function formatStepLabel(step?: string | null) {
  if (!step) return 'Vehicle details';
  const labels: Record<string, string> = {
    step1: 'Vehicle details',
    step2: 'Flow details',
    step3: 'Flow details',
    step4: 'Arrival slip',
    step5: 'Weighment',
    attachments: 'Attachments',
    review: 'Review',
  };
  return labels[step] || formatStatusLabel(step);
}

function formatStatusLabel(value?: string | null) {
  if (!value) return '-';
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function joinDateTime(date?: string | null, time?: string | null) {
  if (!date && !time) return '';
  return [date, time].filter(Boolean).join('T');
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';

  try {
    const normalized = value.includes('T') ? value : value.replace(' ', 'T');
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

function toTimestamp(value?: string | null) {
  if (!value) return 0;
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const timestamp = new Date(normalized).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function filterCustomerFlowEntriesByDate(
  entries: CustomerFlowEntry[],
  dateRange: DateRange,
  dateField: string,
) {
  return entries.filter((entry) => {
    const storedDate = getCustomerFlowValue(entry, dateField);
    const comparableDate = storedDate !== '-' ? storedDate : entry.createdAt.slice(0, 10);
    return isDateInRange(comparableDate, dateRange);
  });
}

function filterRepairMovementEntriesByDate(
  entries: RepairMovementEntry[],
  dateRange: DateRange,
  dateField: string,
) {
  return entries.filter((entry) => {
    const storedDate = getRepairMovementValue(entry, dateField);
    const comparableDate = storedDate !== '-' ? storedDate : entry.createdAt.slice(0, 10);
    return isDateInRange(comparableDate, dateRange);
  });
}

function filterRejectedQCReturnEntriesByDate(
  entries: RejectedQCReturnEntry[],
  dateRange: DateRange,
) {
  return entries.filter((entry) => {
    const gateOutDate = typeof entry.values.gateOutDate === 'string' ? entry.values.gateOutDate : '';
    const comparableDate = gateOutDate || entry.createdAt.slice(0, 10);
    return isDateInRange(comparableDate, dateRange);
  });
}

function isDateInRange(value: string | undefined, dateRange: DateRange) {
  if (!value) return false;
  const date = value.slice(0, 10);
  if (dateRange.from && date < dateRange.from) return false;
  if (dateRange.to && date > dateRange.to) return false;
  return true;
}
