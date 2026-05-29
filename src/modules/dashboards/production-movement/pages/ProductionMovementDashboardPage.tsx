import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronRight,
  Loader2,
  Package,
  RefreshCw,
  Search,
  Warehouse,
} from 'lucide-react';
import { Fragment, type KeyboardEvent, useEffect, useMemo, useState } from 'react';

import type { ApiError } from '@/core/api';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Badge, Button, Card, CardContent, Input, Label } from '@/shared/components/ui';
import { useDebounce } from '@/shared/hooks';

import { SAPUnavailableBanner } from '../../sap-plan/components/SAPUnavailableBanner';
import {
  useProductionMovementFilterOptions,
  useProductionMovementWarehouseBalanceReports,
} from '../api';
import { getDefaultProductionMovementFilters } from '../constants';
import type {
  ProductionMovementFilters,
  ProductionMovementItem,
  ProductionMovementOption,
  ProductionMovementReportResponse,
} from '../types';

interface WarehouseOverviewRow {
  closingQty: number;
  entryCount: number;
  inQty: number;
  isFetching: boolean;
  isLoading: boolean;
  name: string;
  openingQty: number;
  outQty: number;
  warehouse: string;
}

interface SkuMovementDifferenceRow {
  difference: number;
  entryCount: number;
  inQty: number;
  inWarehouses: string[];
  itemCode: string;
  itemName: string;
  outQty: number;
  outWarehouses: string[];
}

const numberFormatter = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 3,
});

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  currency: 'INR',
  maximumFractionDigits: 0,
  style: 'currency',
});

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

function getEntryKey(item: ProductionMovementItem, index: number): string {
  return [item.date, item.doc_num, item.item_code, item.warehouse, item.direction, index].join('-');
}

function roundQuantity(value: number): number {
  const rounded = Number(value.toFixed(3));
  return Math.abs(rounded) < 0.001 ? 0 : rounded;
}

function hasDifference(value: number): boolean {
  return Math.abs(value) >= 0.001;
}

function getSearchText(value: string): string {
  return value.trim().toLowerCase();
}

function getCounterpartyWarehouse(item: ProductionMovementItem): {
  label: 'From' | 'To';
  name: string;
  warehouse: string;
} {
  if (item.direction === 'IN') {
    return {
      label: 'From',
      name: item.from_warehouse_name,
      warehouse: item.from_warehouse,
    };
  }

  return {
    label: 'To',
    name: item.to_warehouse_name,
    warehouse: item.to_warehouse,
  };
}

function buildSkuMovementRows(
  reports: Array<ProductionMovementReportResponse | undefined>,
): SkuMovementDifferenceRow[] {
  const buckets = new Map<
    string,
    {
      entryCount: number;
      inQty: number;
      inWarehouses: Set<string>;
      itemCode: string;
      itemName: string;
      outQty: number;
      outWarehouses: Set<string>;
    }
  >();

  reports.forEach((report) => {
    report?.data.forEach((item) => {
      const bucket = buckets.get(item.item_code) ?? {
        entryCount: 0,
        inQty: 0,
        inWarehouses: new Set<string>(),
        itemCode: item.item_code,
        itemName: item.item_name,
        outQty: 0,
        outWarehouses: new Set<string>(),
      };

      bucket.entryCount += 1;
      bucket.inQty += item.in_qty;
      bucket.outQty += item.out_qty;
      if (item.in_qty > 0) bucket.inWarehouses.add(item.warehouse);
      if (item.out_qty > 0) bucket.outWarehouses.add(item.warehouse);
      if (!bucket.itemName && item.item_name) bucket.itemName = item.item_name;
      buckets.set(item.item_code, bucket);
    });
  });

  return Array.from(buckets.values())
    .map((bucket) => ({
      difference: roundQuantity(bucket.inQty - bucket.outQty),
      entryCount: bucket.entryCount,
      inQty: roundQuantity(bucket.inQty),
      inWarehouses: Array.from(bucket.inWarehouses).sort(),
      itemCode: bucket.itemCode,
      itemName: bucket.itemName,
      outQty: roundQuantity(bucket.outQty),
      outWarehouses: Array.from(bucket.outWarehouses).sort(),
    }))
    .sort((a, b) => {
      const aHasDifference = hasDifference(a.difference);
      const bHasDifference = hasDifference(b.difference);
      if (aHasDifference !== bHasDifference) return aHasDifference ? -1 : 1;

      const diffCompare = Math.abs(b.difference) - Math.abs(a.difference);
      if (diffCompare !== 0) return diffCompare;

      return a.itemCode.localeCompare(b.itemCode);
    });
}

function buildWarehouseRow(
  option: ProductionMovementOption,
  data?: ProductionMovementReportResponse,
  isLoading = false,
  isFetching = false,
): WarehouseOverviewRow {
  const summary = data?.summary;
  const openingQty = summary?.opening_qty ?? 0;
  const inQty = summary?.total_in_qty ?? 0;
  const outQty = summary?.total_out_qty ?? 0;
  const closingQty = summary?.closing_qty ?? 0;

  return {
    closingQty,
    entryCount: summary?.total_entries ?? 0,
    inQty,
    isFetching,
    isLoading,
    name: option.name || option.label || '',
    openingQty,
    outQty,
    warehouse: option.code,
  };
}

function WarehouseOverviewFilters({
  dateFrom,
  dateTo,
  isFetching,
  onChange,
  onReset,
}: {
  dateFrom: string;
  dateTo: string;
  isFetching?: boolean;
  onChange: (dates: { date_from: string; date_to: string }) => void;
  onReset: () => void;
}) {
  const [draftDates, setDraftDates] = useState({ date_from: dateFrom, date_to: dateTo });
  const debouncedDates = useDebounce(draftDates, 500);

  useEffect(() => {
    if (!isCompleteDate(debouncedDates.date_from) || !isCompleteDate(debouncedDates.date_to)) {
      return;
    }
    if (debouncedDates.date_from === dateFrom && debouncedDates.date_to === dateTo) return;
    onChange(debouncedDates);
  }, [dateFrom, dateTo, debouncedDates, onChange]);

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="warehouse-overview-from" className="text-xs">
          From
        </Label>
        <Input
          id="warehouse-overview-from"
          type="date"
          value={draftDates.date_from}
          onChange={(event) =>
            setDraftDates((current) => ({ ...current, date_from: event.target.value }))
          }
          className="w-40"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="warehouse-overview-to" className="text-xs">
          To
        </Label>
        <Input
          id="warehouse-overview-to"
          type="date"
          value={draftDates.date_to}
          onChange={(event) =>
            setDraftDates((current) => ({ ...current, date_to: event.target.value }))
          }
          className="w-40"
        />
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

function WarehouseOverviewCards({ rows }: { rows: WarehouseOverviewRow[] }) {
  const totals = rows.reduce(
    (total, row) => ({
      closingQty: total.closingQty + row.closingQty,
      entryCount: total.entryCount + row.entryCount,
      inQty: total.inQty + row.inQty,
      openingQty: total.openingQty + row.openingQty,
      outQty: total.outQty + row.outQty,
      warehouseCount: total.warehouseCount + 1,
    }),
    {
      closingQty: 0,
      entryCount: 0,
      inQty: 0,
      openingQty: 0,
      outQty: 0,
      warehouseCount: 0,
    },
  );

  const cards = [
    { label: 'Warehouses', value: numberFormatter.format(totals.warehouseCount), icon: Warehouse },
    { label: 'Opening Qty', value: formatQuantity(totals.openingQty), icon: Package },
    { label: 'In Qty', value: formatQuantity(totals.inQty), icon: Package },
    { label: 'Out Qty', value: formatQuantity(totals.outQty), icon: Package },
    { label: 'Closing Qty', value: formatQuantity(totals.closingQty), icon: Package },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <Card key={card.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Icon className="h-5 w-5 text-foreground" />
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

function WarehouseCodeList({ codes }: { codes: string[] }) {
  if (codes.length === 0) {
    return <span className="text-muted-foreground">--</span>;
  }

  return (
    <div className="flex min-w-48 flex-wrap gap-1.5">
      {codes.map((code) => (
        <Badge key={code} variant="outline" className="bg-background font-mono text-[11px]">
          {code}
        </Badge>
      ))}
    </div>
  );
}

function SkuMovementDifferenceTable({
  isLoading,
  onSkuSelect,
  rows,
  searchValue,
  selectedItemCode,
  onSearchChange,
}: {
  isLoading?: boolean;
  onSkuSelect: (row: SkuMovementDifferenceRow) => void;
  rows: SkuMovementDifferenceRow[];
  searchValue: string;
  selectedItemCode?: string | null;
  onSearchChange: (value: string) => void;
}) {
  const differenceCount = rows.filter((row) => hasDifference(row.difference)).length;

  function handleRowKeyDown(
    event: KeyboardEvent<HTMLTableRowElement>,
    row: SkuMovementDifferenceRow,
  ) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onSkuSelect(row);
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <h3 className="flex items-center gap-2 font-semibold">
          <Package className="h-4 w-4 text-primary" />
          SKU Movement Differences
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search SKU"
              placeholder="Search SKU"
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              className="h-9 w-64 pl-9"
            />
          </div>
          <Badge
            variant={differenceCount > 0 ? 'warning' : 'success'}
            className={differenceCount > 0 ? 'bg-amber-500 text-white hover:bg-amber-500/80' : ''}
          >
            {numberFormatter.format(differenceCount)} differences
          </Badge>
        </div>
      </div>

      <div className="max-h-[440px] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-muted/60 text-muted-foreground backdrop-blur">
            <tr>
              <th className="px-5 py-3 text-left font-medium">SKU</th>
              <th className="px-5 py-3 text-right font-medium">In Qty</th>
              <th className="px-5 py-3 text-left font-medium">In Warehouses</th>
              <th className="px-5 py-3 text-right font-medium">Out Qty</th>
              <th className="px-5 py-3 text-left font-medium">Out Warehouses</th>
              <th className="px-5 py-3 text-right font-medium">Difference</th>
              <th className="px-5 py-3 text-right font-medium">Entries</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !isLoading ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">
                  {searchValue ? 'No SKU rows match the search.' : 'No SKU movement entries found.'}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const rowHasDifference = hasDifference(row.difference);
                const isSelected = selectedItemCode === row.itemCode;

                return (
                  <tr
                    key={row.itemCode}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    className={`cursor-pointer border-t transition-colors focus:outline-none ${
                      isSelected
                        ? 'bg-primary/10 shadow-[inset_4px_0_0_hsl(var(--primary))]'
                        : rowHasDifference
                          ? 'bg-amber-50/70 hover:bg-amber-100/70 focus:bg-amber-100/70'
                          : 'hover:bg-muted/40 focus:bg-muted/40'
                    }`}
                    onClick={() => onSkuSelect(row)}
                    onKeyDown={(event) => handleRowKeyDown(event, row)}
                  >
                    <td className="min-w-72 px-5 py-3">
                      <div className="font-semibold">{row.itemName || row.itemCode}</div>
                      <div className="font-mono text-xs text-muted-foreground">{row.itemCode}</div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">
                      {formatQuantity(row.inQty)}
                    </td>
                    <td className="px-5 py-3">
                      <WarehouseCodeList codes={row.inWarehouses} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">
                      {formatQuantity(row.outQty)}
                    </td>
                    <td className="px-5 py-3">
                      <WarehouseCodeList codes={row.outWarehouses} />
                    </td>
                    <td
                      className={`whitespace-nowrap px-5 py-3 text-right font-semibold tabular-nums ${
                        rowHasDifference ? 'text-amber-700' : ''
                      }`}
                    >
                      {formatSignedQuantity(row.difference)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">
                      {numberFormatter.format(row.entryCount)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WarehouseOverviewTable({
  expandedWarehouses,
  isLoading,
  onClearSkuSelection,
  onSearchChange,
  onSkuCodeSelect,
  onWarehouseToggle,
  reportsByWarehouse,
  rows,
  searchValue,
  selectedSku,
  skuDifferenceByItemCode,
}: {
  expandedWarehouses: Set<string>;
  isLoading?: boolean;
  onClearSkuSelection: () => void;
  onSearchChange: (value: string) => void;
  onSkuCodeSelect: (itemCode: string) => void;
  onWarehouseToggle: (warehouse: string) => void;
  reportsByWarehouse: Map<string, ProductionMovementReportResponse | undefined>;
  rows: WarehouseOverviewRow[];
  searchValue: string;
  selectedSku?: SkuMovementDifferenceRow | null;
  skuDifferenceByItemCode: Map<string, SkuMovementDifferenceRow>;
}) {
  function handleRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, warehouse: string) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onWarehouseToggle(warehouse);
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <h3 className="flex items-center gap-2 font-semibold">
          <Warehouse className="h-4 w-4 text-primary" />
          Warehouse Stock Overview
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search warehouse"
              placeholder="Search warehouse"
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              className="h-9 w-64 pl-9"
            />
          </div>
          {selectedSku && (
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-1.5 text-sm">
              <span className="text-muted-foreground">Showing SKU</span>
              <span className="font-mono font-semibold">{selectedSku.itemCode}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={onClearSkuSelection}
              >
                Clear
              </Button>
            </div>
          )}
          {isLoading && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading...
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-5 py-3 text-left font-medium">Warehouse</th>
              <th className="px-5 py-3 text-right font-medium">Opening Qty</th>
              <th className="px-5 py-3 text-right font-medium">In Qty</th>
              <th className="px-5 py-3 text-right font-medium">Out Qty</th>
              <th className="px-5 py-3 text-right font-medium">Closing Qty</th>
              <th className="px-5 py-3 text-right font-medium">Entries</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !isLoading ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                  {searchValue
                    ? 'No warehouse rows match the search.'
                    : selectedSku
                      ? 'No warehouse entries found for the selected SKU.'
                      : 'No warehouses found.'}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const isExpanded = expandedWarehouses.has(row.warehouse);

                return (
                  <Fragment key={row.warehouse}>
                    <tr
                      role="button"
                      tabIndex={0}
                      aria-expanded={isExpanded}
                      className={`cursor-pointer border-t transition-colors focus:outline-none ${
                        isExpanded
                          ? 'bg-primary/5 hover:bg-primary/10 focus:bg-primary/10'
                          : 'hover:bg-muted/40 focus:bg-muted/40'
                      }`}
                      onClick={() => onWarehouseToggle(row.warehouse)}
                      onKeyDown={(event) => handleRowKeyDown(event, row.warehouse)}
                    >
                      <td
                        className={`min-w-64 border-l-4 px-5 py-3 ${
                          isExpanded ? 'border-l-primary' : 'border-l-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-semibold">
                          {row.isFetching && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                          <span>{row.warehouse}</span>
                        </div>
                        {row.name && (
                          <div className="text-xs text-muted-foreground">{row.name}</div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">
                        {row.isLoading ? '--' : formatQuantity(row.openingQty)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">
                        {row.isLoading ? '--' : formatQuantity(row.inQty)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">
                        {row.isLoading ? '--' : formatQuantity(row.outQty)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">
                        {row.isLoading ? '--' : formatQuantity(row.closingQty)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">
                        <span>{row.isLoading ? '--' : numberFormatter.format(row.entryCount)}</span>
                        <ChevronRight
                          className={`ml-2 inline h-4 w-4 text-muted-foreground transition-transform ${
                            isExpanded ? 'rotate-90' : ''
                          }`}
                        />
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="border-b border-t bg-muted/30">
                        <td colSpan={6} className="p-0 pb-4 pl-8 pr-4 pt-3">
                          <WarehouseEntriesDropdown
                            report={reportsByWarehouse.get(row.warehouse)}
                            isLoading={row.isLoading}
                            onSkuCodeSelect={onSkuCodeSelect}
                            selectedItemCode={selectedSku?.itemCode}
                            skuDifferenceByItemCode={skuDifferenceByItemCode}
                          />
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

function WarehouseEntriesDropdown({
  isLoading,
  onSkuCodeSelect,
  report,
  selectedItemCode,
  skuDifferenceByItemCode,
}: {
  isLoading?: boolean;
  onSkuCodeSelect: (itemCode: string) => void;
  report?: ProductionMovementReportResponse;
  selectedItemCode?: string;
  skuDifferenceByItemCode: Map<string, SkuMovementDifferenceRow>;
}) {
  const entries = useMemo(() => {
    const reportEntries = report?.data ?? [];
    if (!selectedItemCode) return reportEntries;
    return reportEntries.filter((entry) => entry.item_code === selectedItemCode);
  }, [report?.data, selectedItemCode]);

  return (
    <div className="rounded-md border border-border bg-background shadow-sm">
      <div className="max-h-[520px] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-muted/60 text-muted-foreground backdrop-blur">
            <tr>
              <th className="px-5 py-3 text-left font-medium">Date</th>
              <th className="px-5 py-3 text-left font-medium">Item</th>
              <th className="px-5 py-3 text-left font-medium">Direction</th>
              <th className="px-5 py-3 text-left font-medium">From / To</th>
              <th className="px-5 py-3 text-right font-medium">In Qty</th>
              <th className="px-5 py-3 text-right font-medium">Out Qty</th>
              <th className="px-5 py-3 text-left font-medium">Reference</th>
              <th className="px-5 py-3 text-left font-medium">Type</th>
              <th className="px-5 py-3 text-right font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} className="px-5 py-10 text-center text-muted-foreground">
                  <div className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading entries...
                  </div>
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-5 py-10 text-center text-muted-foreground">
                  {selectedItemCode
                    ? 'No movement entries found for this SKU in this warehouse.'
                    : 'No movement entries found for this warehouse.'}
                </td>
              </tr>
            ) : (
              entries.map((item, index) => {
                const counterparty = getCounterpartyWarehouse(item);
                const skuDifference = skuDifferenceByItemCode.get(item.item_code);
                const itemHasDifference = hasDifference(skuDifference?.difference ?? 0);

                return (
                  <tr
                    key={getEntryKey(item, index)}
                    className={`border-t ${itemHasDifference ? 'bg-amber-50/70' : ''}`}
                  >
                    <td className="whitespace-nowrap px-5 py-3">{formatDate(item.date)}</td>
                    <td className="min-w-72 px-5 py-3">
                      <div className="font-medium">{item.item_name || item.item_code}</div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className="rounded-sm font-mono text-xs text-primary underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                          onClick={() => onSkuCodeSelect(item.item_code)}
                        >
                          {item.item_code}
                        </button>
                        {skuDifference && itemHasDifference && (
                          <Badge
                            variant="outline"
                            className="border-amber-200 bg-amber-100 text-amber-800"
                          >
                            Diff {formatSignedQuantity(skuDifference.difference)}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <Badge
                        variant="outline"
                        className={
                          item.direction === 'IN'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-rose-200 bg-rose-50 text-rose-700'
                        }
                      >
                        {item.direction === 'IN' ? (
                          <ArrowDownToLine className="mr-1 h-3 w-3" />
                        ) : (
                          <ArrowUpFromLine className="mr-1 h-3 w-3" />
                        )}
                        {item.direction}
                      </Badge>
                    </td>
                    <td className="min-w-40 px-5 py-3">
                      {counterparty.warehouse ? (
                        <>
                          <div className="font-medium">
                            <span className="text-xs text-muted-foreground">
                              {counterparty.label}
                            </span>{' '}
                            {counterparty.warehouse}
                          </div>
                          {counterparty.name && counterparty.name !== counterparty.warehouse && (
                            <div className="text-xs text-muted-foreground">{counterparty.name}</div>
                          )}
                        </>
                      ) : (
                        <span className="text-muted-foreground">--</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">
                      {item.in_qty ? formatQuantity(item.in_qty) : '-'}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">
                      {item.out_qty ? formatQuantity(item.out_qty) : '-'}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3">
                      <div>{item.reference || item.doc_num || '--'}</div>
                      {item.doc_num && item.reference !== item.doc_num && (
                        <div className="text-xs text-muted-foreground">Doc {item.doc_num}</div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3">{item.transaction_label}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">
                      {formatCurrency(item.transaction_value)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ProductionMovementDashboardPage() {
  const defaults = useMemo(() => getDefaultProductionMovementFilters(), []);
  const [dates, setDates] = useState({
    date_from: defaults.date_from,
    date_to: defaults.date_to,
  });
  const [expandedWarehouses, setExpandedWarehouses] = useState<Set<string>>(() => new Set());
  const [skuSearch, setSkuSearch] = useState('');
  const [selectedSkuItemCode, setSelectedSkuItemCode] = useState<string | null>(null);
  const [warehouseSearch, setWarehouseSearch] = useState('');

  const optionsQuery = useProductionMovementFilterOptions();
  const warehouseOptions = useMemo(
    () => [...(optionsQuery.data?.warehouses ?? [])].sort((a, b) => a.code.localeCompare(b.code)),
    [optionsQuery.data?.warehouses],
  );
  const warehouseCodes = useMemo(
    () => warehouseOptions.map((warehouse) => warehouse.code),
    [warehouseOptions],
  );
  const reportFilters = useMemo<ProductionMovementFilters>(
    () => ({
      date_from: dates.date_from,
      date_to: dates.date_to,
      direction: 'all',
      limit: 1000,
      production_only: false,
    }),
    [dates.date_from, dates.date_to],
  );
  const warehouseQueries = useProductionMovementWarehouseBalanceReports(
    reportFilters,
    warehouseCodes,
  );

  const sapError =
    optionsQuery.error ?? warehouseQueries.find((query) => isSAPError(query.error))?.error;
  const isFetching = optionsQuery.isFetching || warehouseQueries.some((query) => query.isFetching);
  const isLoading = optionsQuery.isLoading || warehouseQueries.some((query) => query.isLoading);
  const rows = useMemo(
    () =>
      warehouseOptions.map((warehouse, index) =>
        buildWarehouseRow(
          warehouse,
          warehouseQueries[index]?.data,
          warehouseQueries[index]?.isLoading,
          warehouseQueries[index]?.isFetching,
        ),
      ),
    [warehouseOptions, warehouseQueries],
  );
  const skuMovementRows = useMemo(
    () => buildSkuMovementRows(warehouseQueries.map((query) => query.data)),
    [warehouseQueries],
  );
  const filteredSkuMovementRows = useMemo(() => {
    const search = getSearchText(skuSearch);
    if (!search) return skuMovementRows;

    return skuMovementRows.filter((row) =>
      [row.itemCode, row.itemName].some((value) => value.toLowerCase().includes(search)),
    );
  }, [skuMovementRows, skuSearch]);
  const skuDifferenceByItemCode = useMemo(
    () => new Map(skuMovementRows.map((row) => [row.itemCode, row])),
    [skuMovementRows],
  );
  const selectedSku = useMemo(
    () => skuMovementRows.find((row) => row.itemCode === selectedSkuItemCode) ?? null,
    [selectedSkuItemCode, skuMovementRows],
  );
  const selectedSkuWarehouseCodes = useMemo(() => {
    if (!selectedSku) return null;
    return new Set([...selectedSku.inWarehouses, ...selectedSku.outWarehouses]);
  }, [selectedSku]);
  const visibleRows = useMemo(() => {
    const baseRows = selectedSkuWarehouseCodes
      ? rows.filter((row) => selectedSkuWarehouseCodes.has(row.warehouse))
      : rows;
    const search = getSearchText(warehouseSearch);
    if (!search) return baseRows;

    return baseRows.filter((row) =>
      [row.warehouse, row.name].some((value) => value.toLowerCase().includes(search)),
    );
  }, [rows, selectedSkuWarehouseCodes, warehouseSearch]);
  const reportsByWarehouse = useMemo(
    () =>
      new Map(
        warehouseOptions.map((warehouse, index) => [warehouse.code, warehouseQueries[index]?.data]),
      ),
    [warehouseOptions, warehouseQueries],
  );

  function clearSkuSelection() {
    setSelectedSkuItemCode(null);
    setExpandedWarehouses(new Set());
  }

  function handleReset() {
    setDates({ date_from: defaults.date_from, date_to: defaults.date_to });
    clearSkuSelection();
  }

  function handleDateChange(nextDates: { date_from: string; date_to: string }) {
    setDates(nextDates);
    clearSkuSelection();
  }

  function handleWarehouseToggle(warehouse: string) {
    setExpandedWarehouses((current) => {
      const next = new Set(current);
      if (next.has(warehouse)) {
        next.delete(warehouse);
      } else {
        next.add(warehouse);
      }
      return next;
    });
  }

  function applySkuSelection(row: SkuMovementDifferenceRow, shouldToggle: boolean) {
    const shouldClearSelection = shouldToggle && selectedSkuItemCode === row.itemCode;
    setSelectedSkuItemCode(shouldClearSelection ? null : row.itemCode);
    setExpandedWarehouses(() => {
      if (shouldClearSelection) return new Set();
      return new Set([...row.inWarehouses, ...row.outWarehouses]);
    });
  }

  function handleSkuSelect(row: SkuMovementDifferenceRow) {
    applySkuSelection(row, true);
  }

  function handleEntrySkuSelect(itemCode: string) {
    const skuRow = skuMovementRows.find((row) => row.itemCode === itemCode);
    if (!skuRow) return;
    applySkuSelection(skuRow, false);
  }

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Warehouse Stock Overview"
        description="Opening, inward, outward, and closing quantity by warehouse"
      />

      <WarehouseOverviewFilters
        key={`${dates.date_from}-${dates.date_to}`}
        dateFrom={dates.date_from}
        dateTo={dates.date_to}
        isFetching={isFetching}
        onChange={handleDateChange}
        onReset={handleReset}
      />

      {sapError && isSAPError(sapError) && (
        <SAPUnavailableBanner
          error={sapError as ApiError}
          onRetry={() => {
            void optionsQuery.refetch();
            warehouseQueries.forEach((query) => {
              void query.refetch();
            });
          }}
        />
      )}

      {!(sapError && isSAPError(sapError)) && (
        <>
          <WarehouseOverviewCards rows={rows} />
          <SkuMovementDifferenceTable
            rows={filteredSkuMovementRows}
            isLoading={isLoading}
            searchValue={skuSearch}
            selectedItemCode={selectedSkuItemCode}
            onSearchChange={setSkuSearch}
            onSkuSelect={handleSkuSelect}
          />
          <WarehouseOverviewTable
            rows={visibleRows}
            isLoading={isLoading}
            expandedWarehouses={expandedWarehouses}
            searchValue={warehouseSearch}
            reportsByWarehouse={reportsByWarehouse}
            selectedSku={selectedSku}
            skuDifferenceByItemCode={skuDifferenceByItemCode}
            onClearSkuSelection={clearSkuSelection}
            onSearchChange={setWarehouseSearch}
            onSkuCodeSelect={handleEntrySkuSelect}
            onWarehouseToggle={handleWarehouseToggle}
          />
        </>
      )}
    </div>
  );
}
