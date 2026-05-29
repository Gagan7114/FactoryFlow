import {
  ArrowRightLeft,
  Boxes,
  CheckCircle2,
  ChevronRight,
  Factory,
  Loader2,
  PackageCheck,
  Scale,
  Search,
  TriangleAlert,
} from 'lucide-react';
import { Fragment, type KeyboardEvent, useEffect, useMemo, useState } from 'react';

import type { ApiError } from '@/core/api';
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
} from '@/shared/components/ui';
import { useDebounce } from '@/shared/hooks';

import { SAPUnavailableBanner } from '../../sap-plan/components/SAPUnavailableBanner';
import { useInventoryReconciliationReport } from '../api';
import type {
  ComponentReconciliationRow,
  InventoryReconciliationFilters,
  InventoryReconciliationSourceType,
  ProductionReconciliationRow,
  ReconciliationStatus,
  TransferReconciliationRow,
} from '../types';

type DashboardRow =
  | {
      id: string;
      kind: 'transfer';
      row: TransferReconciliationRow;
    }
  | {
      id: string;
      kind: 'production_order';
      row: ProductionReconciliationRow;
    }
  | {
      id: string;
      kind: 'bom_component';
      row: ComponentReconciliationRow;
    };

type StatusFilter = 'issues' | 'all' | ReconciliationStatus;
type TypeFilter = 'all' | InventoryReconciliationSourceType;

const numberFormatter = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 3,
});

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  currency: 'INR',
  maximumFractionDigits: 0,
  style: 'currency',
});

function toDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDefaultFilters(): InventoryReconciliationFilters {
  const today = toDateInput(new Date());
  return {
    date_from: today,
    date_to: today,
    limit: 500,
  };
}

function isSAPError(err: unknown): err is ApiError {
  const status = (err as ApiError)?.status;
  return status === 502 || status === 503;
}

function isCompleteDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function formatQuantity(value: number): string {
  return numberFormatter.format(value || 0);
}

function formatSignedQuantity(value: number): string {
  if (Math.abs(value) < 0.001) return formatQuantity(0);
  return `${value > 0 ? '+' : ''}${formatQuantity(value)}`;
}

function formatCurrency(value: number): string {
  return currencyFormatter.format(value || 0);
}

function formatDate(value: string): string {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function getSourceLabel(type: InventoryReconciliationSourceType): string {
  if (type === 'transfer') return 'Transfer';
  if (type === 'production_order') return 'Production';
  return 'BOM Issue';
}

function getExpectedLabel(type: InventoryReconciliationSourceType): string {
  if (type === 'transfer') return 'Out Qty';
  if (type === 'production_order') return 'Planned Qty';
  return 'Required Qty';
}

function getActualLabel(type: InventoryReconciliationSourceType): string {
  if (type === 'transfer') return 'In Qty';
  if (type === 'production_order') return 'Produced Qty';
  return 'Issued Qty';
}

function getStatusBadge(status: ReconciliationStatus) {
  if (status === 'balanced') {
    return (
      <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
        Balanced
      </Badge>
    );
  }
  if (status === 'missing') {
    return (
      <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
        Missing
      </Badge>
    );
  }
  if (status === 'short') {
    return (
      <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
        Short
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">
      Extra
    </Badge>
  );
}

function getRouteText(item: DashboardRow): { label: string; detail: string } {
  if (item.kind === 'transfer') {
    return {
      label: `${item.row.from_warehouse || '--'} -> ${item.row.to_warehouse || '--'}`,
      detail: [item.row.from_warehouse_name, item.row.to_warehouse_name]
        .filter(Boolean)
        .join(' -> '),
    };
  }

  if (item.kind === 'production_order') {
    return {
      label: item.row.warehouse || '--',
      detail: item.row.warehouse_name,
    };
  }

  return {
    label: item.row.warehouse || '--',
    detail: item.row.parent_item_code
      ? `For ${item.row.parent_item_code} ${item.row.parent_item_name || ''}`.trim()
      : item.row.warehouse_name,
  };
}

function getRowItemName(item: DashboardRow): string {
  return item.row.item_name || item.row.item_code || '--';
}

function getCombinedRows(
  transfers: TransferReconciliationRow[],
  production: ProductionReconciliationRow[],
  components: ComponentReconciliationRow[],
): DashboardRow[] {
  const rows: DashboardRow[] = [
    ...transfers.map((row) => ({
      id: `transfer-${row.doc_entry}-${row.document}-${row.item_code}-${row.from_warehouse}-${row.to_warehouse}`,
      kind: 'transfer' as const,
      row,
    })),
    ...production.map((row) => ({
      id: `production-${row.doc_entry}-${row.document}-${row.item_code}`,
      kind: 'production_order' as const,
      row,
    })),
    ...components.map((row) => ({
      id: `component-${row.doc_entry}-${row.document}-${row.item_code}-${row.warehouse}`,
      kind: 'bom_component' as const,
      row,
    })),
  ];

  return rows.sort((a, b) => {
    const statusCompare = Number(a.row.status === 'balanced') - Number(b.row.status === 'balanced');
    if (statusCompare !== 0) return statusCompare;

    const diffCompare = Math.abs(b.row.difference_qty) - Math.abs(a.row.difference_qty);
    if (diffCompare !== 0) return diffCompare;

    return (b.row.date || '').localeCompare(a.row.date || '');
  });
}

function ReconciliationFilters({
  filters,
  isFetching,
  onChange,
  onReset,
}: {
  filters: InventoryReconciliationFilters;
  isFetching?: boolean;
  onChange: (filters: InventoryReconciliationFilters) => void;
  onReset: () => void;
}) {
  const [draftFilters, setDraftFilters] = useState(filters);
  const debouncedFilters = useDebounce(draftFilters, 500);

  useEffect(() => {
    if (!isCompleteDate(debouncedFilters.date_from) || !isCompleteDate(debouncedFilters.date_to)) {
      return;
    }
    onChange({
      ...debouncedFilters,
      warehouse: debouncedFilters.warehouse?.trim() || undefined,
      search: debouncedFilters.search?.trim() || undefined,
    });
  }, [debouncedFilters, onChange]);

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="inventory-reconciliation-from" className="text-xs">
          From
        </Label>
        <Input
          id="inventory-reconciliation-from"
          type="date"
          value={draftFilters.date_from}
          onChange={(event) =>
            setDraftFilters((current) => ({ ...current, date_from: event.target.value }))
          }
          className="w-40"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="inventory-reconciliation-to" className="text-xs">
          To
        </Label>
        <Input
          id="inventory-reconciliation-to"
          type="date"
          value={draftFilters.date_to}
          onChange={(event) =>
            setDraftFilters((current) => ({ ...current, date_to: event.target.value }))
          }
          className="w-40"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="inventory-reconciliation-warehouse" className="text-xs">
          Warehouse
        </Label>
        <Input
          id="inventory-reconciliation-warehouse"
          value={draftFilters.warehouse ?? ''}
          onChange={(event) =>
            setDraftFilters((current) => ({ ...current, warehouse: event.target.value }))
          }
          placeholder="All"
          className="w-36"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="inventory-reconciliation-search" className="text-xs">
          Search
        </Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="inventory-reconciliation-search"
            value={draftFilters.search ?? ''}
            onChange={(event) =>
              setDraftFilters((current) => ({ ...current, search: event.target.value }))
            }
            placeholder="SKU, doc, warehouse"
            className="w-64 pl-9"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="inventory-reconciliation-limit" className="text-xs">
          Limit
        </Label>
        <NativeSelect
          id="inventory-reconciliation-limit"
          value={String(draftFilters.limit ?? 500)}
          onChange={(event) =>
            setDraftFilters((current) => ({ ...current, limit: Number(event.target.value) }))
          }
          className="w-32"
        >
          <SelectOption value="250">250 rows</SelectOption>
          <SelectOption value="500">500 rows</SelectOption>
          <SelectOption value="1000">1000 rows</SelectOption>
        </NativeSelect>
      </div>

      <Button type="button" variant="outline" size="sm" onClick={onReset} className="mb-0.5">
        Reset
      </Button>

      {isFetching && (
        <div className="mb-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading...
        </div>
      )}
    </div>
  );
}

function SummaryCards({
  summary,
}: {
  summary?: {
    total_rows: number;
    total_issues: number;
    transfer_mismatches: number;
    production_shortfalls: number;
    component_gaps: number;
    balanced_rows: number;
    total_difference_qty: number;
  };
}) {
  const cards = [
    {
      label: 'Open Issues',
      value: numberFormatter.format(summary?.total_issues ?? 0),
      icon: TriangleAlert,
    },
    {
      label: 'Transfer Mismatch',
      value: numberFormatter.format(summary?.transfer_mismatches ?? 0),
      icon: ArrowRightLeft,
    },
    {
      label: 'Production Shortfall',
      value: numberFormatter.format(summary?.production_shortfalls ?? 0),
      icon: Factory,
    },
    {
      label: 'BOM Issue Gap',
      value: numberFormatter.format(summary?.component_gaps ?? 0),
      icon: Boxes,
    },
    {
      label: 'Balanced',
      value: numberFormatter.format(summary?.balanced_rows ?? 0),
      icon: CheckCircle2,
    },
    {
      label: 'Difference Qty',
      value: formatQuantity(summary?.total_difference_qty ?? 0),
      icon: Scale,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <Card key={card.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="break-words text-xl font-semibold leading-tight tabular-nums">
                  {card.value}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function ReconciliationTable({
  expandedRow,
  isLoading,
  onExpandedRowChange,
  rows,
  statusFilter,
  typeFilter,
  onStatusFilterChange,
  onTypeFilterChange,
}: {
  expandedRow: string | null;
  isLoading?: boolean;
  onExpandedRowChange: (rowId: string) => void;
  rows: DashboardRow[];
  statusFilter: StatusFilter;
  typeFilter: TypeFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  onTypeFilterChange: (value: TypeFilter) => void;
}) {
  function handleRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, rowId: string) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onExpandedRowChange(rowId);
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <h3 className="flex items-center gap-2 font-semibold">
          <PackageCheck className="h-4 w-4 text-primary" />
          Reconciliation Exceptions
        </h3>
        <div className="flex flex-wrap gap-3">
          <NativeSelect
            value={typeFilter}
            onChange={(event) => onTypeFilterChange(event.target.value as TypeFilter)}
            className="h-9 w-44"
            aria-label="Type"
          >
            <SelectOption value="all">All Types</SelectOption>
            <SelectOption value="transfer">Transfers</SelectOption>
            <SelectOption value="production_order">Production</SelectOption>
            <SelectOption value="bom_component">BOM Issues</SelectOption>
          </NativeSelect>
          <NativeSelect
            value={statusFilter}
            onChange={(event) => onStatusFilterChange(event.target.value as StatusFilter)}
            className="h-9 w-40"
            aria-label="Status"
          >
            <SelectOption value="issues">Issues</SelectOption>
            <SelectOption value="all">All</SelectOption>
            <SelectOption value="missing">Missing</SelectOption>
            <SelectOption value="short">Short</SelectOption>
            <SelectOption value="extra">Extra</SelectOption>
            <SelectOption value="balanced">Balanced</SelectOption>
          </NativeSelect>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-5 py-3 text-left font-medium">Type</th>
              <th className="px-5 py-3 text-left font-medium">Document</th>
              <th className="px-5 py-3 text-left font-medium">SKU</th>
              <th className="px-5 py-3 text-left font-medium">Warehouse / Route</th>
              <th className="px-5 py-3 text-right font-medium">Expected</th>
              <th className="px-5 py-3 text-right font-medium">Actual</th>
              <th className="px-5 py-3 text-right font-medium">Difference</th>
              <th className="px-5 py-3 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !isLoading ? (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-muted-foreground">
                  No reconciliation rows found.
                </td>
              </tr>
            ) : (
              rows.map((item) => {
                const isExpanded = expandedRow === item.id;
                const route = getRouteText(item);
                const itemType = item.kind;
                const rowHasIssue = item.row.status !== 'balanced';

                return (
                  <Fragment key={item.id}>
                    <tr
                      role="button"
                      tabIndex={0}
                      aria-expanded={isExpanded}
                      className={`cursor-pointer border-t transition-colors focus:outline-none ${
                        isExpanded
                          ? 'bg-primary/5'
                          : rowHasIssue
                            ? 'bg-amber-50/50 hover:bg-amber-100/60'
                            : 'hover:bg-muted/40'
                      }`}
                      onClick={() => onExpandedRowChange(item.id)}
                      onKeyDown={(event) => handleRowKeyDown(event, item.id)}
                    >
                      <td className="whitespace-nowrap border-l-4 border-l-transparent px-5 py-3">
                        <Badge variant="outline">{getSourceLabel(itemType)}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3">
                        <div className="font-medium">{item.row.document || '--'}</div>
                        {item.row.date && (
                          <div className="text-xs text-muted-foreground">
                            {formatDate(item.row.date)}
                          </div>
                        )}
                      </td>
                      <td className="min-w-72 px-5 py-3">
                        <div className="font-medium">{getRowItemName(item)}</div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {item.row.item_code || '--'}
                        </div>
                      </td>
                      <td className="min-w-52 px-5 py-3">
                        <div className="font-medium">{route.label}</div>
                        {route.detail && (
                          <div className="text-xs text-muted-foreground">{route.detail}</div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">
                        <div>{formatQuantity(item.row.expected_qty)}</div>
                        <div className="text-xs text-muted-foreground">
                          {getExpectedLabel(itemType)}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">
                        <div>{formatQuantity(item.row.actual_qty)}</div>
                        <div className="text-xs text-muted-foreground">
                          {getActualLabel(itemType)}
                        </div>
                      </td>
                      <td
                        className={`whitespace-nowrap px-5 py-3 text-right font-semibold tabular-nums ${
                          rowHasIssue ? 'text-amber-700' : ''
                        }`}
                      >
                        {formatSignedQuantity(item.row.difference_qty)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(item.row.status)}
                          <ChevronRight
                            className={`h-4 w-4 text-muted-foreground transition-transform ${
                              isExpanded ? 'rotate-90' : ''
                            }`}
                          />
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="border-b border-t bg-muted/30">
                        <td colSpan={8} className="p-0 pb-4 pl-8 pr-4 pt-3">
                          <ReconciliationDetail item={item} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReconciliationDetail({ item }: { item: DashboardRow }) {
  if (item.kind === 'transfer') {
    return (
      <div className="rounded-md border bg-background shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-5 py-3 text-left font-medium">Date</th>
              <th className="px-5 py-3 text-left font-medium">Warehouse</th>
              <th className="px-5 py-3 text-left font-medium">Direction</th>
              <th className="px-5 py-3 text-right font-medium">In Qty</th>
              <th className="px-5 py-3 text-right font-medium">Out Qty</th>
              <th className="px-5 py-3 text-left font-medium">Reference</th>
              <th className="px-5 py-3 text-right font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {item.row.entries.map((entry, index) => (
              <tr
                key={`${entry.date}-${entry.doc_num}-${entry.warehouse}-${entry.direction}-${index}`}
                className="border-t"
              >
                <td className="whitespace-nowrap px-5 py-3">{formatDate(entry.date)}</td>
                <td className="min-w-48 px-5 py-3">
                  <div className="font-medium">{entry.warehouse}</div>
                  <div className="text-xs text-muted-foreground">{entry.warehouse_name}</div>
                </td>
                <td className="px-5 py-3">
                  <Badge
                    variant="outline"
                    className={
                      entry.direction === 'IN'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-rose-200 bg-rose-50 text-rose-700'
                    }
                  >
                    {entry.direction}
                  </Badge>
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">
                  {entry.in_qty ? formatQuantity(entry.in_qty) : '-'}
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">
                  {entry.out_qty ? formatQuantity(entry.out_qty) : '-'}
                </td>
                <td className="whitespace-nowrap px-5 py-3">
                  <div>{entry.reference || entry.doc_num || '--'}</div>
                  {entry.doc_num && entry.reference !== entry.doc_num && (
                    <div className="text-xs text-muted-foreground">Doc {entry.doc_num}</div>
                  )}
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">
                  {formatCurrency(entry.transaction_value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const facts =
    item.kind === 'production_order'
      ? [
          ['Order', item.row.document || '--'],
          ['Due Date', formatDate(item.row.due_date)],
          ['Warehouse', `${item.row.warehouse || '--'} ${item.row.warehouse_name || ''}`.trim()],
          ['Rejected Qty', formatQuantity(item.row.rejected_qty)],
        ]
      : [
          ['Order', item.row.document || '--'],
          ['Due Date', formatDate(item.row.due_date)],
          ['Warehouse', `${item.row.warehouse || '--'} ${item.row.warehouse_name || ''}`.trim()],
          [
            'Parent SKU',
            `${item.row.parent_item_code || '--'} ${item.row.parent_item_name || ''}`.trim(),
          ],
        ];

  return (
    <div className="grid gap-3 rounded-md border bg-background p-4 shadow-sm md:grid-cols-2 xl:grid-cols-4">
      {facts.map(([label, value]) => (
        <div key={label} className="rounded-md border bg-muted/20 px-3 py-2">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="mt-1 text-sm font-medium">{value}</div>
        </div>
      ))}
    </div>
  );
}

export default function InventoryReconciliationDashboardPage() {
  const defaults = useMemo(() => getDefaultFilters(), []);
  const [filters, setFilters] = useState<InventoryReconciliationFilters>(defaults);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('issues');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  const reportQuery = useInventoryReconciliationReport(filters);
  const sapError = isSAPError(reportQuery.error) ? reportQuery.error : null;

  const allRows = useMemo(
    () =>
      getCombinedRows(
        reportQuery.data?.transfer_reconciliations ?? [],
        reportQuery.data?.production_reconciliations ?? [],
        reportQuery.data?.component_reconciliations ?? [],
      ),
    [reportQuery.data],
  );

  const visibleRows = useMemo(
    () =>
      allRows.filter((item) => {
        if (typeFilter !== 'all' && item.kind !== typeFilter) return false;
        if (statusFilter === 'all') return true;
        if (statusFilter === 'issues') return item.row.status !== 'balanced';
        return item.row.status === statusFilter;
      }),
    [allRows, statusFilter, typeFilter],
  );

  function handleReset() {
    setFilters(defaults);
    setExpandedRow(null);
  }

  function handleExpandedRowChange(rowId: string) {
    setExpandedRow((current) => (current === rowId ? null : rowId));
  }

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Inventory Reconciliation"
        description="Expected versus actual quantity across transfers, production orders, and BOM issues"
      />

      <ReconciliationFilters
        key={`${filters.date_from}-${filters.date_to}-${filters.warehouse ?? ''}-${filters.search ?? ''}-${filters.limit ?? 500}`}
        filters={filters}
        isFetching={reportQuery.isFetching}
        onChange={(nextFilters) => {
          setFilters(nextFilters);
          setExpandedRow(null);
        }}
        onReset={handleReset}
      />

      {sapError && (
        <SAPUnavailableBanner
          error={sapError}
          onRetry={() => {
            void reportQuery.refetch();
          }}
        />
      )}

      {!sapError && (
        <>
          <SummaryCards summary={reportQuery.data?.summary} />
          <ReconciliationTable
            rows={visibleRows}
            isLoading={reportQuery.isLoading}
            expandedRow={expandedRow}
            statusFilter={statusFilter}
            typeFilter={typeFilter}
            onExpandedRowChange={handleExpandedRowChange}
            onStatusFilterChange={setStatusFilter}
            onTypeFilterChange={setTypeFilter}
          />
        </>
      )}
    </div>
  );
}
