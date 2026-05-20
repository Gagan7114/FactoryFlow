import { ChevronDown, ChevronsUpDown, ChevronUp } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { WarehouseSummary } from '../types';

interface NonMovingWarehouseSummaryProps {
  warehouses: WarehouseSummary[];
  onWarehouseSelect?: (warehouse: string) => void;
}

type SortCol = 'warehouse' | 'item_count' | 'total_quantity' | 'total_value';

interface SortState {
  col: SortCol;
  dir: 'asc' | 'desc';
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function SortIcon({ col, sort }: { col: SortCol; sort: SortState }) {
  if (sort.col !== col) {
    return <ChevronsUpDown className="ml-1 inline h-3 w-3 text-muted-foreground/50" />;
  }

  return sort.dir === 'asc' ? (
    <ChevronUp className="ml-1 inline h-3 w-3" />
  ) : (
    <ChevronDown className="ml-1 inline h-3 w-3" />
  );
}

export function NonMovingWarehouseSummary({
  warehouses,
  onWarehouseSelect,
}: NonMovingWarehouseSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [sort, setSort] = useState<SortState>({
    col: 'total_value',
    dir: 'desc',
  });

  const sortedWarehouses = useMemo(() => {
    return [...warehouses].sort((a, b) => {
      const aValue = a[sort.col];
      const bValue = b[sort.col];
      const comparison =
        typeof aValue === 'string'
          ? aValue.localeCompare(String(bValue))
          : Number(aValue) - Number(bValue);

      return sort.dir === 'asc' ? comparison : -comparison;
    });
  }, [sort, warehouses]);

  function toggleSort(col: SortCol) {
    setSort((current) =>
      current.col === col
        ? { col, dir: current.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: col === 'warehouse' ? 'asc' : 'desc' },
    );
  }

  if (warehouses.length === 0) return null;

  return (
    <Card>
      <CardHeader
        className="cursor-pointer pb-3 transition-colors hover:bg-muted/20"
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setIsExpanded((current) => !current);
          }
        }}
      >
        <CardTitle className="flex items-center justify-between text-sm font-medium">
          Warehouse Breakdown
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform',
              isExpanded && 'rotate-180',
            )}
          />
        </CardTitle>
      </CardHeader>
      {isExpanded && (
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th
                    className="cursor-pointer px-4 py-2 text-left font-medium text-muted-foreground hover:text-foreground"
                    onClick={() => toggleSort('warehouse')}
                  >
                    Warehouse <SortIcon col="warehouse" sort={sort} />
                  </th>
                  <th
                    className="cursor-pointer px-4 py-2 text-right font-medium text-muted-foreground hover:text-foreground"
                    onClick={() => toggleSort('item_count')}
                  >
                    Items <SortIcon col="item_count" sort={sort} />
                  </th>
                  <th
                    className="cursor-pointer px-4 py-2 text-right font-medium text-muted-foreground hover:text-foreground"
                    onClick={() => toggleSort('total_quantity')}
                  >
                    Quantity <SortIcon col="total_quantity" sort={sort} />
                  </th>
                  <th
                    className="cursor-pointer px-4 py-2 text-right font-medium text-muted-foreground hover:text-foreground"
                    onClick={() => toggleSort('total_value')}
                  >
                    Value <SortIcon col="total_value" sort={sort} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedWarehouses.map((warehouse) => (
                  <tr
                    key={warehouse.warehouse}
                    className="cursor-pointer border-b transition-colors hover:bg-muted/30"
                    role="button"
                    tabIndex={0}
                    onClick={() => onWarehouseSelect?.(warehouse.warehouse)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onWarehouseSelect?.(warehouse.warehouse);
                      }
                    }}
                  >
                    <td className="px-4 py-2 font-medium">{warehouse.warehouse}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {warehouse.item_count.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {warehouse.total_quantity.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {formatCurrency(warehouse.total_value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
