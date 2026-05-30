import {
  Boxes,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Factory,
  Loader2,
  PackageCheck,
  Route,
  Search,
  TriangleAlert,
  Warehouse,
} from 'lucide-react';
import { Fragment, type KeyboardEvent, useCallback, useEffect, useMemo, useState } from 'react';

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
import { useProductionFlowReport } from '../api';
import type { ProductionFlowFilters, ProductionFlowRow, ProductionFlowStatus } from '../types';

type StatusFilter = 'all' | ProductionFlowStatus;

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

function getDefaultFilters(): ProductionFlowFilters {
  const today = toDateInput(new Date());
  return {
    date_from: today,
    date_to: today,
    limit: 500,
    status: 'all',
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

function getStatusLabel(status: ProductionFlowStatus): string {
  const labels: Record<ProductionFlowStatus, string> = {
    not_started: 'Not Started',
    material_pending: 'Material Pending',
    production_pending: 'Production Pending',
    fg_pending: 'FG Pending',
    complete: 'Complete',
  };
  return labels[status];
}

function getStatusBadge(status: ProductionFlowStatus) {
  if (status === 'complete') {
    return (
      <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
        {getStatusLabel(status)}
      </Badge>
    );
  }
  if (status === 'not_started') {
    return (
      <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
        {getStatusLabel(status)}
      </Badge>
    );
  }
  if (status === 'fg_pending') {
    return (
      <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">
        {getStatusLabel(status)}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
      {getStatusLabel(status)}
    </Badge>
  );
}

function joinWarehouses(values: string[]): string {
  if (!values.length) return '--';
  if (values.length <= 3) return values.join(', ');
  return `${values.slice(0, 3).join(', ')} +${values.length - 3}`;
}

function ProductionFlowFiltersPanel({
  filters,
  isFetching,
  onChange,
  onReset,
}: {
  filters: ProductionFlowFilters;
  isFetching?: boolean;
  onChange: (filters: ProductionFlowFilters) => void;
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
      status: debouncedFilters.status ?? 'all',
    });
  }, [debouncedFilters, onChange]);

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="production-flow-from" className="text-xs">
          From
        </Label>
        <Input
          id="production-flow-from"
          type="date"
          value={draftFilters.date_from}
          onChange={(event) =>
            setDraftFilters((current) => ({ ...current, date_from: event.target.value }))
          }
          className="w-40"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="production-flow-to" className="text-xs">
          To
        </Label>
        <Input
          id="production-flow-to"
          type="date"
          value={draftFilters.date_to}
          onChange={(event) =>
            setDraftFilters((current) => ({ ...current, date_to: event.target.value }))
          }
          className="w-40"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="production-flow-warehouse" className="text-xs">
          Warehouse
        </Label>
        <Input
          id="production-flow-warehouse"
          value={draftFilters.warehouse ?? ''}
          onChange={(event) =>
            setDraftFilters((current) => ({ ...current, warehouse: event.target.value }))
          }
          placeholder="All"
          className="w-36"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="production-flow-search" className="text-xs">
          Search
        </Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="production-flow-search"
            value={draftFilters.search ?? ''}
            onChange={(event) =>
              setDraftFilters((current) => ({ ...current, search: event.target.value }))
            }
            placeholder="SKU, order, warehouse"
            className="w-64 pl-9"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="production-flow-status" className="text-xs">
          Status
        </Label>
        <NativeSelect
          id="production-flow-status"
          value={draftFilters.status ?? 'all'}
          onChange={(event) =>
            setDraftFilters((current) => ({
              ...current,
              status: event.target.value as StatusFilter,
            }))
          }
          className="w-44"
        >
          <SelectOption value="all">All</SelectOption>
          <SelectOption value="not_started">Not Started</SelectOption>
          <SelectOption value="material_pending">Material Pending</SelectOption>
          <SelectOption value="production_pending">Production Pending</SelectOption>
          <SelectOption value="fg_pending">FG Pending</SelectOption>
          <SelectOption value="complete">Complete</SelectOption>
        </NativeSelect>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="production-flow-limit" className="text-xs">
          Limit
        </Label>
        <NativeSelect
          id="production-flow-limit"
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

function SummaryCards({ summary }: { summary?: ProductionFlowRow[] }) {
  const totals = useMemo(() => {
    const rows = summary ?? [];
    return {
      orders: rows.length,
      planned: rows.reduce((sum, row) => sum + row.planned_qty, 0),
      produced: rows.reduce((sum, row) => sum + row.completed_qty, 0),
      materialGap: rows.reduce((sum, row) => sum + Math.max(row.material_gap_qty, 0), 0),
      productionGap: rows.reduce((sum, row) => sum + Math.max(row.production_gap_qty, 0), 0),
      fgGap: rows.reduce((sum, row) => sum + Math.max(row.fg_gap_qty, 0), 0),
      complete: rows.filter((row) => row.flow_status === 'complete').length,
    };
  }, [summary]);

  const cards = [
    { label: 'Orders', value: formatQuantity(totals.orders), icon: ClipboardList },
    { label: 'Planned Qty', value: formatQuantity(totals.planned), icon: PackageCheck },
    { label: 'Produced Qty', value: formatQuantity(totals.produced), icon: Factory },
    { label: 'Material Gap', value: formatQuantity(totals.materialGap), icon: Boxes },
    { label: 'Production Gap', value: formatQuantity(totals.productionGap), icon: TriangleAlert },
    { label: 'Complete', value: formatQuantity(totals.complete), icon: CheckCircle2 },
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

function StageMetric({
  label,
  primary,
  secondary,
  tone = 'default',
}: {
  label: string;
  primary: string;
  secondary?: string;
  tone?: 'default' | 'warning' | 'success';
}) {
  const toneClass =
    tone === 'warning'
      ? 'border-amber-200 bg-amber-50/80'
      : tone === 'success'
        ? 'border-emerald-200 bg-emerald-50/70'
        : 'border-border bg-background';

  return (
    <div className={`min-w-36 rounded-md border px-3 py-2 ${toneClass}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-semibold tabular-nums">{primary}</div>
      {secondary && <div className="text-xs text-muted-foreground">{secondary}</div>}
    </div>
  );
}

function ProductionFlowTable({
  expandedRow,
  isLoading,
  onExpandedRowChange,
  rows,
}: {
  expandedRow: string | null;
  isLoading?: boolean;
  onExpandedRowChange: (rowId: string) => void;
  rows: ProductionFlowRow[];
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
          <Route className="h-4 w-4 text-primary" />
          Full Production Flow
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-5 py-3 text-left font-medium">Order</th>
              <th className="px-5 py-3 text-left font-medium">Route</th>
              <th className="px-5 py-3 text-left font-medium">Planning</th>
              <th className="px-5 py-3 text-left font-medium">Warehouse Issue</th>
              <th className="px-5 py-3 text-left font-medium">Production</th>
              <th className="px-5 py-3 text-left font-medium">FG</th>
              <th className="px-5 py-3 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !isLoading ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">
                  No production flow rows found.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const isExpanded = expandedRow === row.doc_entry;
                const hasIssue = row.flow_status !== 'complete';

                return (
                  <Fragment key={row.doc_entry}>
                    <tr
                      role="button"
                      tabIndex={0}
                      aria-expanded={isExpanded}
                      className={`cursor-pointer border-t transition-colors focus:outline-none ${
                        isExpanded
                          ? 'bg-primary/5'
                          : hasIssue
                            ? 'bg-amber-50/40 hover:bg-amber-50'
                            : 'hover:bg-muted/40'
                      }`}
                      onClick={() => onExpandedRowChange(row.doc_entry)}
                      onKeyDown={(event) => handleRowKeyDown(event, row.doc_entry)}
                    >
                      <td className="min-w-72 px-5 py-4">
                        <div className="font-semibold">{row.item_name || row.item_code}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-mono">{row.item_code || '--'}</span>
                          <span>Order {row.document || '--'}</span>
                          <span>Due {formatDate(row.due_date)}</span>
                        </div>
                      </td>
                      <td className="min-w-64 px-5 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">
                            {joinWarehouses(row.material_warehouse_codes)}
                          </Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          <Badge variant="outline">{row.warehouse || '--'}</Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          <Badge variant="outline">{joinWarehouses(row.fg_warehouse_codes)}</Badge>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {row.warehouse_name || 'Production warehouse'}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <StageMetric
                          label="Planned"
                          primary={formatQuantity(row.planned_qty)}
                          secondary={`SAP ${row.sap_status || '--'}`}
                        />
                      </td>
                      <td className="px-5 py-4">
                        <StageMetric
                          label="Issued / Required"
                          primary={`${formatQuantity(row.component_issued_qty)} / ${formatQuantity(
                            row.component_planned_qty,
                          )}`}
                          secondary={`Gap ${formatQuantity(Math.max(row.material_gap_qty, 0))}`}
                          tone={row.material_gap_qty > 0 ? 'warning' : 'success'}
                        />
                      </td>
                      <td className="px-5 py-4">
                        <StageMetric
                          label="Produced / Planned"
                          primary={`${formatQuantity(row.completed_qty)} / ${formatQuantity(
                            row.planned_qty,
                          )}`}
                          secondary={`Remaining ${formatQuantity(
                            Math.max(row.production_gap_qty, 0),
                          )}`}
                          tone={row.production_gap_qty > 0 ? 'warning' : 'success'}
                        />
                      </td>
                      <td className="px-5 py-4">
                        <StageMetric
                          label="FG Receipt"
                          primary={formatQuantity(row.fg_received_qty)}
                          secondary={`Gap ${formatQuantity(Math.max(row.fg_gap_qty, 0))}`}
                          tone={row.fg_gap_qty > 0 ? 'warning' : 'success'}
                        />
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(row.flow_status)}
                          <ChevronRight
                            className={`h-4 w-4 text-muted-foreground transition-transform ${
                              isExpanded ? 'rotate-90' : ''
                            }`}
                          />
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-b bg-muted/30">
                        <td colSpan={7} className="px-5 py-4">
                          <ProductionFlowDetail row={row} />
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

function ProductionFlowDetail({ row }: { row: ProductionFlowRow }) {
  return (
    <div className="space-y-4 rounded-md border bg-background p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <DetailFact label="Post Date" value={formatDate(row.post_date)} />
        <DetailFact label="Start Date" value={formatDate(row.start_date)} />
        <DetailFact label="Due Date" value={formatDate(row.due_date)} />
        <DetailFact label="Rejected Qty" value={formatQuantity(row.rejected_qty)} />
      </div>

      <DetailSection title="BOM and Warehouse Issue" icon={<Boxes className="h-4 w-4" />}>
        <ComponentTable row={row} />
      </DetailSection>

      <DetailSection title="Material Movements" icon={<Warehouse className="h-4 w-4" />}>
        <MovementTable entries={row.material_movements} emptyText="No material movements found." />
      </DetailSection>

      <DetailSection title="Finished Good Movements" icon={<Factory className="h-4 w-4" />}>
        <MovementTable
          entries={row.finished_good_movements}
          emptyText="No finished good movements found."
        />
      </DetailSection>
    </div>
  );
}

function DetailFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/20 px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}

function DetailSection({
  children,
  icon,
  title,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <section className="overflow-hidden rounded-md border">
      <div className="flex items-center gap-2 bg-muted/40 px-4 py-3 font-medium">
        {icon}
        {title}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

function ComponentTable({ row }: { row: ProductionFlowRow }) {
  const [expandedComponent, setExpandedComponent] = useState<string | null>(null);

  if (row.components.length === 0) {
    return <div className="px-4 py-6 text-sm text-muted-foreground">No BOM rows found.</div>;
  }

  function getComponentKey(component: ProductionFlowRow['components'][number]): string {
    return `${component.doc_entry}-${component.line_num}`;
  }

  function handleComponentKeyDown(event: KeyboardEvent<HTMLTableRowElement>, componentKey: string) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    setExpandedComponent((current) => (current === componentKey ? null : componentKey));
  }

  return (
    <table className="w-full text-sm">
      <thead className="bg-muted/20 text-muted-foreground">
        <tr>
          <th className="px-4 py-3 text-left font-medium">Component</th>
          <th className="px-4 py-3 text-left font-medium">Warehouse</th>
          <th className="px-4 py-3 text-right font-medium">Required</th>
          <th className="px-4 py-3 text-right font-medium">Issued</th>
          <th className="px-4 py-3 text-right font-medium">Gap</th>
        </tr>
      </thead>
      <tbody>
        {row.components.map((component) => {
          const componentKey = getComponentKey(component);
          const isExpanded = expandedComponent === componentKey;
          const entries = row.material_movements.filter(
            (entry) => entry.item_code === component.item_code,
          );

          return (
            <Fragment key={componentKey}>
              <tr
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                className={`cursor-pointer border-t transition-colors focus:outline-none ${
                  isExpanded ? 'bg-primary/5' : 'hover:bg-muted/30'
                }`}
                onClick={() =>
                  setExpandedComponent((current) =>
                    current === componentKey ? null : componentKey,
                  )
                }
                onKeyDown={(event) => handleComponentKeyDown(event, componentKey)}
              >
                <td className="min-w-72 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <ChevronRight
                      className={`h-4 w-4 text-muted-foreground transition-transform ${
                        isExpanded ? 'rotate-90' : ''
                      }`}
                    />
                    <div>
                      <div className="font-medium">
                        {component.item_name || component.item_code}
                      </div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {component.item_code || '--'}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="min-w-52 px-4 py-3">
                  <div className="font-medium">{component.warehouse || '--'}</div>
                  <div className="text-xs text-muted-foreground">{component.warehouse_name}</div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                  {formatQuantity(component.planned_qty)} {component.uom}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                  {formatQuantity(component.issued_qty)} {component.uom}
                </td>
                <td
                  className={`whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums ${
                    component.gap_qty > 0 ? 'text-amber-700' : ''
                  }`}
                >
                  {formatQuantity(component.gap_qty)}
                </td>
              </tr>
              {isExpanded && (
                <tr className="border-t bg-muted/20">
                  <td colSpan={5} className="p-4">
                    <div className="mb-2 text-sm font-medium">
                      Entries for {component.item_code || component.item_name || 'component'}
                    </div>
                    <MovementTable
                      entries={entries}
                      emptyText="No SAP movement entries found for this component."
                    />
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}

function MovementTable({
  emptyText,
  entries,
}: {
  emptyText: string;
  entries: ProductionFlowRow['movement_entries'];
}) {
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  if (entries.length === 0) {
    return <div className="px-4 py-6 text-sm text-muted-foreground">{emptyText}</div>;
  }

  function getEntryKey(
    entry: ProductionFlowRow['movement_entries'][number],
    index: number,
  ): string {
    return [
      entry.date,
      entry.doc_num,
      entry.created_by,
      entry.item_code,
      entry.warehouse,
      entry.direction,
      index,
    ].join('|');
  }

  function handleEntryKeyDown(event: KeyboardEvent<HTMLTableRowElement>, entryKey: string) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    setExpandedEntry((current) => (current === entryKey ? null : entryKey));
  }

  return (
    <table className="w-full text-sm">
      <thead className="bg-muted/20 text-muted-foreground">
        <tr>
          <th className="px-4 py-3 text-left font-medium">Date</th>
          <th className="px-4 py-3 text-left font-medium">Item</th>
          <th className="px-4 py-3 text-left font-medium">Warehouse / Route</th>
          <th className="px-4 py-3 text-left font-medium">Direction</th>
          <th className="px-4 py-3 text-right font-medium">In Qty</th>
          <th className="px-4 py-3 text-right font-medium">Out Qty</th>
          <th className="px-4 py-3 text-left font-medium">Reference</th>
          <th className="px-4 py-3 text-right font-medium">Value</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry, index) => {
          const entryKey = getEntryKey(entry, index);
          const isExpanded = expandedEntry === entryKey;

          return (
            <Fragment key={entryKey}>
              <tr
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                className={`cursor-pointer border-t transition-colors focus:outline-none ${
                  isExpanded ? 'bg-primary/5' : 'hover:bg-muted/30'
                }`}
                onClick={() =>
                  setExpandedEntry((current) => (current === entryKey ? null : entryKey))
                }
                onKeyDown={(event) => handleEntryKeyDown(event, entryKey)}
              >
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="flex items-center gap-2">
                    <ChevronRight
                      className={`h-4 w-4 text-muted-foreground transition-transform ${
                        isExpanded ? 'rotate-90' : ''
                      }`}
                    />
                    {formatDate(entry.date)}
                  </div>
                </td>
                <td className="min-w-64 px-4 py-3">
                  <div className="font-medium">{entry.item_name || entry.item_code}</div>
                  <div className="font-mono text-xs text-muted-foreground">{entry.item_code}</div>
                </td>
                <td className="min-w-56 px-4 py-3">
                  <div className="font-medium">{getMovementRoute(entry)}</div>
                  <div className="text-xs text-muted-foreground">{entry.warehouse_name}</div>
                </td>
                <td className="px-4 py-3">
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
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                  {entry.in_qty ? formatQuantity(entry.in_qty) : '-'}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                  {entry.out_qty ? formatQuantity(entry.out_qty) : '-'}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <div>{entry.reference || entry.doc_num || '--'}</div>
                  {entry.doc_num && entry.reference !== entry.doc_num && (
                    <div className="text-xs text-muted-foreground">Doc {entry.doc_num}</div>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                  {formatCurrency(entry.transaction_value)}
                </td>
              </tr>
              {isExpanded && (
                <tr className="border-t bg-muted/20">
                  <td colSpan={8} className="p-4">
                    <MovementEntryDetail entry={entry} />
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}

function MovementEntryDetail({ entry }: { entry: ProductionFlowRow['movement_entries'][number] }) {
  const facts = [
    ['SAP Type', `${entry.transaction_label} (${entry.transaction_type})`],
    ['Reference', entry.reference || '--'],
    ['SAP Doc', entry.doc_num || '--'],
    ['Created By', entry.created_by || '--'],
    ['Warehouse', `${entry.warehouse || '--'} ${entry.warehouse_name || ''}`.trim()],
    ['From Warehouse', `${entry.from_warehouse || '--'} ${entry.from_warehouse_name || ''}`.trim()],
    ['To Warehouse', `${entry.to_warehouse || '--'} ${entry.to_warehouse_name || ''}`.trim()],
    ['Value', formatCurrency(entry.transaction_value)],
  ];

  return (
    <div className="rounded-md border bg-background p-4 shadow-sm">
      <div className="mb-3 text-sm font-medium">SAP movement entry</div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {facts.map(([label, value]) => (
          <DetailFact key={label} label={label} value={value} />
        ))}
      </div>
    </div>
  );
}

function getMovementRoute(entry: ProductionFlowRow['movement_entries'][number]): string {
  if (entry.transaction_type === 67 && (entry.from_warehouse || entry.to_warehouse)) {
    return `${entry.from_warehouse || '--'} -> ${entry.to_warehouse || '--'}`;
  }
  if (entry.direction === 'IN') return `Into ${entry.warehouse || '--'}`;
  return `Out from ${entry.warehouse || '--'}`;
}

export default function ProductionFlowDashboardPage() {
  const defaults = useMemo(() => getDefaultFilters(), []);
  const [filters, setFilters] = useState<ProductionFlowFilters>(defaults);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const reportQuery = useProductionFlowReport(filters);
  const sapError = isSAPError(reportQuery.error) ? reportQuery.error : null;
  const rows = reportQuery.data?.data ?? [];

  const handleFilterChange = useCallback((nextFilters: ProductionFlowFilters) => {
    setFilters(nextFilters);
    setExpandedRow(null);
  }, []);

  const handleReset = useCallback(() => {
    setFilters(defaults);
    setExpandedRow(null);
  }, [defaults]);

  const handleExpandedRowChange = useCallback((rowId: string) => {
    setExpandedRow((current) => (current === rowId ? null : rowId));
  }, []);

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Production Flow"
        description="Planning, warehouse issue, production, and finished good movement in one order row"
      />

      <ProductionFlowFiltersPanel
        key={`${filters.date_from}-${filters.date_to}-${filters.warehouse ?? ''}-${filters.search ?? ''}-${filters.status ?? 'all'}-${filters.limit ?? 500}`}
        filters={filters}
        isFetching={reportQuery.isFetching}
        onChange={handleFilterChange}
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
          <SummaryCards summary={rows} />
          <ProductionFlowTable
            rows={rows}
            isLoading={reportQuery.isLoading}
            expandedRow={expandedRow}
            onExpandedRowChange={handleExpandedRowChange}
          />
        </>
      )}
    </div>
  );
}
