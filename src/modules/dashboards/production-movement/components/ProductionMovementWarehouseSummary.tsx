import { ChevronDown, ChevronsUpDown, ChevronUp } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { ProductionMovementWarehouseSummary as WarehouseSummary } from '../types';

type SortCol = 'warehouse' | 'entry_count' | 'in_qty' | 'out_qty' | 'net_qty' | 'total_value';
type SortState = { col: SortCol; dir: 'asc' | 'desc' };

interface ProductionMovementWarehouseSummaryProps {
  warehouses: WarehouseSummary[];
  onWarehouseSelect?: (warehouse: string) => void;
}

const numberFormatter = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 3,
});

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  currency: 'INR',
  maximumFractionDigits: 0,
  style: 'currency',
});

function SortIcon({ active, direction }: { active: boolean; direction: 'asc' | 'desc' }) {
  if (!active) return <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />;
  return direction === 'asc' ? (
    <ChevronUp className="h-3.5 w-3.5" />
  ) : (
    <ChevronDown className="h-3.5 w-3.5" />
  );
}

export function ProductionMovementWarehouseSummary({
  warehouses,
  onWarehouseSelect,
}: ProductionMovementWarehouseSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [sort, setSort] = useState<SortState>({ col: 'total_value', dir: 'desc' });

  const sortedWarehouses = useMemo(() => {
    const multiplier = sort.dir === 'asc' ? 1 : -1;
    return [...warehouses].sort((a, b) => {
      if (sort.col === 'warehouse') {
        return a.warehouse.localeCompare(b.warehouse) * multiplier;
      }
      return (a[sort.col] - b[sort.col]) * multiplier;
    });
  }, [warehouses, sort]);

  function toggleSort(col: SortCol) {
    setSort((current) =>
      current.col === col
        ? { col, dir: current.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: 'desc' },
    );
  }

  const headerCells: Array<{ col: SortCol; label: string; className?: string }> = [
    { col: 'warehouse', label: 'Warehouse' },
    { col: 'entry_count', label: 'Entries', className: 'text-right' },
    { col: 'in_qty', label: 'In Qty', className: 'text-right' },
    { col: 'out_qty', label: 'Out Qty', className: 'text-right' },
    { col: 'net_qty', label: 'Net Qty', className: 'text-right' },
    { col: 'total_value', label: 'Value', className: 'text-right' },
  ];

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <button
        type="button"
        className="flex w-full items-center justify-between px-5 py-4 text-left"
        onClick={() => setIsExpanded((value) => !value)}
      >
        <h3 className="font-semibold">Warehouse Breakdown</h3>
        <ChevronUp
          className={`h-4 w-4 text-muted-foreground transition-transform ${
            isExpanded ? '' : 'rotate-180'
          }`}
        />
      </button>

      {isExpanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                {headerCells.map((cell) => (
                  <th
                    key={cell.col}
                    className={`px-5 py-3 font-medium ${cell.className ?? 'text-left'}`}
                  >
                    <button
                      type="button"
                      className={`inline-flex items-center gap-1.5 ${
                        cell.className ?? ''
                      }`}
                      onClick={() => toggleSort(cell.col)}
                    >
                      {cell.label}
                      <SortIcon active={sort.col === cell.col} direction={sort.dir} />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedWarehouses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">
                    No warehouse movement found.
                  </td>
                </tr>
              ) : (
                sortedWarehouses.map((warehouse) => (
                  <tr
                    key={warehouse.warehouse}
                    className="cursor-pointer border-t transition-colors hover:bg-muted/40"
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
                    <td className="px-5 py-3 font-medium">
                      <div>{warehouse.warehouse}</div>
                      <div className="text-xs font-normal text-muted-foreground">
                        {warehouse.warehouse_name}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {numberFormatter.format(warehouse.entry_count)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {numberFormatter.format(warehouse.in_qty)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {numberFormatter.format(warehouse.out_qty)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {numberFormatter.format(warehouse.net_qty)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {currencyFormatter.format(warehouse.total_value)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
