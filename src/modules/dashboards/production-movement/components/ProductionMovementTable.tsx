import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { Badge } from '@/shared/components/ui';

import type { ProductionMovementItem } from '../types';

interface ProductionMovementTableProps {
  items: ProductionMovementItem[];
  isLoading?: boolean;
  onSearchSelect?: (term: string) => void;
}

const numberFormatter = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 3,
});

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  currency: 'INR',
  maximumFractionDigits: 0,
  style: 'currency',
});

type SortColumn =
  | 'date'
  | 'item_code'
  | 'item_name'
  | 'warehouse'
  | 'direction'
  | 'quantity'
  | 'abs_value'
  | 'transaction_label'
  | 'reference';

interface SortState {
  col: SortColumn;
  dir: 'asc' | 'desc';
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

function firstSearchWord(value: string): string {
  return value.trim().split(/\s+/)[0] ?? value;
}

function sortValue(item: ProductionMovementItem, col: SortColumn): string | number {
  switch (col) {
    case 'date': {
      const time = new Date(item.date).getTime();
      return Number.isNaN(time) ? item.date : time;
    }
    case 'warehouse':
      return `${item.warehouse} ${item.warehouse_name}`.toUpperCase();
    case 'reference':
      return `${item.reference} ${item.doc_num}`.toUpperCase();
    case 'item_code':
    case 'item_name':
    case 'direction':
    case 'transaction_label':
      return String(item[col] ?? '').toUpperCase();
    case 'quantity':
    case 'abs_value':
      return item[col] ?? 0;
    default:
      return '';
  }
}

function SortIcon({ col, sort }: { col: SortColumn; sort: SortState }) {
  if (sort.col !== col) {
    return <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />;
  }
  return sort.dir === 'asc' ? (
    <ChevronUp className="h-3.5 w-3.5" />
  ) : (
    <ChevronDown className="h-3.5 w-3.5" />
  );
}

function HeaderSortButton({
  col,
  label,
  sort,
  align = 'left',
  onSort,
}: {
  col: SortColumn;
  label: string;
  sort: SortState;
  align?: 'left' | 'right';
  onSort: (col: SortColumn) => void;
}) {
  return (
    <button
      type="button"
      className={`flex w-full items-center gap-1 hover:text-foreground ${
        align === 'right' ? 'justify-end text-right' : 'justify-start text-left'
      }`}
      onClick={() => onSort(col)}
    >
      <span>{label}</span>
      <SortIcon col={col} sort={sort} />
    </button>
  );
}

export function ProductionMovementTable({
  items,
  isLoading,
  onSearchSelect,
}: ProductionMovementTableProps) {
  const [sort, setSort] = useState<SortState>({ col: 'date', dir: 'desc' });

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const aVal = sortValue(a, sort.col);
      const bVal = sortValue(b, sort.col);
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [items, sort]);

  function toggleSort(col: SortColumn) {
    setSort((current) =>
      current.col === col
        ? { col, dir: current.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: 'asc' },
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="flex items-center justify-between px-5 py-4">
        <h3 className="font-semibold">Movement Entries</h3>
        {isLoading && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading...
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-medium">
                <HeaderSortButton col="date" label="Date" sort={sort} onSort={toggleSort} />
              </th>
              <th className="px-5 py-3 font-medium">
                <HeaderSortButton
                  col="item_code"
                  label="Item Code"
                  sort={sort}
                  onSort={toggleSort}
                />
              </th>
              <th className="px-5 py-3 font-medium">
                <HeaderSortButton
                  col="item_name"
                  label="Item Name"
                  sort={sort}
                  onSort={toggleSort}
                />
              </th>
              <th className="px-5 py-3 font-medium">
                <HeaderSortButton
                  col="warehouse"
                  label="Warehouse"
                  sort={sort}
                  onSort={toggleSort}
                />
              </th>
              <th className="px-5 py-3 font-medium">
                <HeaderSortButton
                  col="direction"
                  label="Direction"
                  sort={sort}
                  onSort={toggleSort}
                />
              </th>
              <th className="px-5 py-3 font-medium">
                <HeaderSortButton
                  col="quantity"
                  label="Quantity"
                  sort={sort}
                  align="right"
                  onSort={toggleSort}
                />
              </th>
              <th className="px-5 py-3 font-medium">
                <HeaderSortButton
                  col="abs_value"
                  label="Value"
                  sort={sort}
                  align="right"
                  onSort={toggleSort}
                />
              </th>
              <th className="px-5 py-3 font-medium">
                <HeaderSortButton
                  col="transaction_label"
                  label="Type"
                  sort={sort}
                  onSort={toggleSort}
                />
              </th>
              <th className="px-5 py-3 font-medium">
                <HeaderSortButton
                  col="reference"
                  label="Reference"
                  sort={sort}
                  onSort={toggleSort}
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.length === 0 && !isLoading ? (
              <tr>
                <td colSpan={9} className="px-5 py-10 text-center text-muted-foreground">
                  No production movement entries found.
                </td>
              </tr>
            ) : (
              sortedItems.map((item, index) => (
                <tr
                  key={`${item.date}-${item.item_code}-${item.warehouse}-${item.doc_num}-${index}`}
                  className="border-t"
                >
                  <td className="whitespace-nowrap px-5 py-3">{formatDate(item.date)}</td>
                  <td
                    className="cursor-pointer whitespace-nowrap px-5 py-3 font-mono text-xs text-primary hover:bg-muted/40"
                    onClick={() => onSearchSelect?.(item.item_code)}
                  >
                    {item.item_code}
                  </td>
                  <td
                    className="min-w-64 cursor-pointer px-5 py-3 font-medium hover:bg-muted/40"
                    onClick={() => onSearchSelect?.(firstSearchWord(item.item_name))}
                  >
                    {item.item_name}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3">
                    <div className="font-medium">{item.warehouse}</div>
                    <div className="text-xs text-muted-foreground">{item.warehouse_name}</div>
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
                  <td className="whitespace-nowrap px-5 py-3 text-right">
                    {numberFormatter.format(item.quantity)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-right">
                    {currencyFormatter.format(item.abs_value)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3">{item.transaction_label}</td>
                  <td className="whitespace-nowrap px-5 py-3">
                    <div>{item.reference || '--'}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.doc_num ? `Doc ${item.doc_num}` : ''}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
