import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';

import type { WarehouseSummary } from '../types';

interface NonMovingWarehouseSummaryProps {
  warehouses: WarehouseSummary[];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function NonMovingWarehouseSummary({ warehouses }: NonMovingWarehouseSummaryProps) {
  if (warehouses.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Warehouse Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                  Warehouse
                </th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">Items</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                  Quantity
                </th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">Value</th>
              </tr>
            </thead>
            <tbody>
              {warehouses.map((warehouse) => (
                <tr
                  key={warehouse.warehouse}
                  className="border-b transition-colors hover:bg-muted/30"
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
    </Card>
  );
}
