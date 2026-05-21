import { ArrowDownToLine, ArrowUpFromLine, Loader2 } from 'lucide-react';

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

export function ProductionMovementTable({
  items,
  isLoading,
  onSearchSelect,
}: ProductionMovementTableProps) {
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
              <th className="px-5 py-3 text-left font-medium">Date</th>
              <th className="px-5 py-3 text-left font-medium">Item Code</th>
              <th className="px-5 py-3 text-left font-medium">Item Name</th>
              <th className="px-5 py-3 text-left font-medium">Warehouse</th>
              <th className="px-5 py-3 text-left font-medium">Direction</th>
              <th className="px-5 py-3 text-right font-medium">Quantity</th>
              <th className="px-5 py-3 text-right font-medium">Value</th>
              <th className="px-5 py-3 text-left font-medium">Type</th>
              <th className="px-5 py-3 text-left font-medium">Reference</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && !isLoading ? (
              <tr>
                <td colSpan={9} className="px-5 py-10 text-center text-muted-foreground">
                  No production movement entries found.
                </td>
              </tr>
            ) : (
              items.map((item, index) => (
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
