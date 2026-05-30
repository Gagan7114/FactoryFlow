import { ChevronDown, ChevronsUpDown, ChevronUp } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Card, CardContent } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { NonMovingItem } from '../types';

interface NonMovingTableProps {
  items: NonMovingItem[];
  isLoading: boolean;
  onSearchSelect?: (term: string) => void;
}

type SortCol = keyof Pick<
  NonMovingItem,
  | 'item_code'
  | 'item_name'
  | 'branch'
  | 'quantity'
  | 'value'
  | 'days_since_last_movement'
  | 'consumption_ratio'
>;

interface SortState {
  col: SortCol;
  dir: 'asc' | 'desc';
}

type MovementStatus = 'recent' | 'slow-moving' | 'non-moving';

function getMovementStatus(days: number): MovementStatus {
  if (days > 45) return 'non-moving';
  if (days >= 30) return 'slow-moving';
  return 'recent';
}

function rowAgeClasses(days: number): string {
  switch (getMovementStatus(days)) {
    case 'non-moving':
      return 'bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50';
    case 'slow-moving':
      return 'bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-950/20 dark:hover:bg-yellow-950/40';
    case 'recent':
    default:
      return 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40';
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function firstSearchWord(value: string): string {
  return value.trim().split(/\s+/)[0] ?? '';
}

function SortIcon({ col, sort }: { col: SortCol; sort: SortState }) {
  if (sort.col !== col)
    return <ChevronsUpDown className="ml-1 inline h-3 w-3 text-muted-foreground/50" />;
  return sort.dir === 'asc' ? (
    <ChevronUp className="ml-1 inline h-3 w-3" />
  ) : (
    <ChevronDown className="ml-1 inline h-3 w-3" />
  );
}

function NonMovingStatusBadge({ days }: { days: number }) {
  const config = {
    recent: {
      label: 'Recently Moved',
      classes: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    },
    'slow-moving': {
      label: 'Slow Moving',
      classes: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    },
    'non-moving': {
      label: 'Non Moving',
      classes: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    },
  } as const;
  const { label, classes } = config[getMovementStatus(days)];

  return (
    <span className={cn('inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs', classes)}>
      {label}
    </span>
  );
}

function formatConsumptionRatio(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function NonMovingTable({ items, isLoading, onSearchSelect }: NonMovingTableProps) {
  const [sort, setSort] = useState<SortState>({
    col: 'value',
    dir: 'desc',
  });

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const aVal = a[sort.col] ?? '';
      const bVal = b[sort.col] ?? '';
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [items, sort]);

  function toggleSort(col: SortCol) {
    setSort((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: 'asc' },
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4 border-b p-4">
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (sorted.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No items found for the selected filters.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th
                  className="cursor-pointer px-4 py-3 text-left font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => toggleSort('item_code')}
                >
                  Item Code <SortIcon col="item_code" sort={sort} />
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-left font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => toggleSort('item_name')}
                >
                  Item Name <SortIcon col="item_name" sort={sort} />
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-left font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => toggleSort('branch')}
                >
                  Branch <SortIcon col="branch" sort={sort} />
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Sub Group
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-right font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => toggleSort('quantity')}
                >
                  Quantity <SortIcon col="quantity" sort={sort} />
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-right font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => toggleSort('value')}
                >
                  Value <SortIcon col="value" sort={sort} />
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-right font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => toggleSort('days_since_last_movement')}
                >
                  Days Idle <SortIcon col="days_since_last_movement" sort={sort} />
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Last Movement
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-right font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => toggleSort('consumption_ratio')}
                >
                  Consumption <SortIcon col="consumption_ratio" sort={sort} />
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((item) => (
                <tr
                  key={`${item.item_code}-${item.branch}`}
                  className={cn(
                    'border-b transition-colors',
                    rowAgeClasses(item.days_since_last_movement),
                  )}
                >
                  <td
                    className="cursor-pointer px-4 py-3 font-mono text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSearchSelect?.(item.item_code);
                    }}
                    onKeyDown={(event) => {
                      event.stopPropagation();
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onSearchSelect?.(item.item_code);
                      }
                    }}
                  >
                    {item.item_code}
                  </td>
                  <td
                    className="cursor-pointer px-4 py-3 font-medium underline-offset-2 hover:text-primary hover:underline"
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSearchSelect?.(firstSearchWord(item.item_name));
                    }}
                    onKeyDown={(event) => {
                      event.stopPropagation();
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onSearchSelect?.(firstSearchWord(item.item_name));
                      }
                    }}
                  >
                    {item.item_name}
                  </td>
                  <td className="px-4 py-3">{item.branch}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.sub_group}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {item.quantity.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatCurrency(item.value)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {item.days_since_last_movement.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3">
                    <NonMovingStatusBadge days={item.days_since_last_movement} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {item.last_movement_date ?? '-'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatConsumptionRatio(item.consumption_ratio)}
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
