import { ChevronDown, ChevronsUpDown, ChevronUp, Pencil } from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  Button,
  Card,
  CardContent,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { DispatchBill } from '../types';
import { StatusBadge } from './StatusBadge';

interface DispatchPlanTableProps {
  bills: DispatchBill[];
  isLoading: boolean;
  canEdit: boolean;
  onEdit: (bill: DispatchBill) => void;
}

type SortCol = 'create_date' | 'doc_num' | 'card_name' | 'doc_total' | 'booking_status';

interface SortState {
  col: SortCol;
  dir: 'asc' | 'desc';
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

function formatDate(value: string | null): string {
  if (!value) return '-';
  return value;
}

function formatNumber(value: number, fractionDigits = 2): string {
  return value.toLocaleString('en-IN', {
    maximumFractionDigits: fractionDigits,
  });
}

function compactText(value: string, fallback = '-'): string {
  return value.trim() || fallback;
}

export function DispatchPlanTable({
  bills,
  isLoading,
  canEdit,
  onEdit,
}: DispatchPlanTableProps) {
  const [sort, setSort] = useState<SortState>({
    col: 'create_date',
    dir: 'desc',
  });

  const sorted = useMemo(() => {
    return [...bills].sort((a, b) => {
      const aVal = sort.col === 'booking_status' ? a.plan.booking_status : a[sort.col];
      const bVal = sort.col === 'booking_status' ? b.plan.booking_status : b[sort.col];
      const cmp = (aVal ?? '') < (bVal ?? '') ? -1 : (aVal ?? '') > (bVal ?? '') ? 1 : 0;
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [bills, sort]);

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
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="flex gap-4 border-b p-4">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
              <div className="h-4 w-28 animate-pulse rounded bg-muted" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
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
          <p className="text-sm text-muted-foreground">No dispatch bills found.</p>
        </CardContent>
      </Card>
    );
  }

  const thClass =
    'cursor-pointer whitespace-nowrap px-4 py-3 text-left font-medium text-muted-foreground hover:text-foreground';
  const thRightClass =
    'cursor-pointer whitespace-nowrap px-4 py-3 text-right font-medium text-muted-foreground hover:text-foreground';

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1480px] text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className={thClass} onClick={() => toggleSort('create_date')}>
                  Created <SortIcon col="create_date" sort={sort} />
                </th>
                <th className={thClass} onClick={() => toggleSort('doc_num')}>
                  Bill <SortIcon col="doc_num" sort={sort} />
                </th>
                <th className={thClass} onClick={() => toggleSort('card_name')}>
                  Party <SortIcon col="card_name" sort={sort} />
                </th>
                <th className={thClass}>Location</th>
                <th className={thRightClass} onClick={() => toggleSort('doc_total')}>
                  Value <SortIcon col="doc_total" sort={sort} />
                </th>
                <th className={thRightClass}>Load</th>
                <th className={thClass}>SAP Transport</th>
                <th className={thClass} onClick={() => toggleSort('booking_status')}>
                  Status <SortIcon col="booking_status" sort={sort} />
                </th>
                <th className={thClass}>Booked Vehicle</th>
                <th className={thRightClass}>Freight</th>
                <th className="w-14 px-4 py-3 text-right font-medium text-muted-foreground" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((bill) => (
                <tr key={bill.doc_entry} className="border-b transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium">{formatDate(bill.create_date)}</div>
                    <div className="text-xs text-muted-foreground">{bill.create_time}</div>
                    <div className="text-xs text-muted-foreground">
                      Inv {formatDate(bill.doc_date)}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="font-mono text-xs font-semibold">{bill.doc_num}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{bill.branch_name}</div>
                    <div className="mt-1 max-w-[170px] truncate text-xs text-muted-foreground" title={bill.base_refs}>
                      Ref {compactText(bill.base_refs)}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="max-w-[240px] truncate font-medium" title={bill.card_name}>
                      {compactText(bill.card_name)}
                    </div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {compactText(bill.card_code)}
                    </div>
                    <div className="mt-1 max-w-[240px] truncate text-xs text-muted-foreground" title={bill.item_summary}>
                      {compactText(bill.item_summary)}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div>{compactText(bill.city)}</div>
                    <div className="text-xs text-muted-foreground">{compactText(bill.state)}</div>
                    <div className="mt-1 max-w-[210px] truncate text-xs text-muted-foreground" title={bill.ship_to_address}>
                      {compactText(bill.ship_to_address)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right align-top tabular-nums">
                    <div className="font-medium">{formatNumber(bill.doc_total)}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatNumber(bill.total_gross_amount)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right align-top tabular-nums">
                    <div>{formatNumber(bill.total_litres, 2)} L</div>
                    <div className="text-xs text-muted-foreground">
                      {formatNumber(bill.total_boxes, 2)} boxes
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatNumber(bill.total_weight, 3)} kg
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="max-w-[190px] truncate font-medium" title={bill.sap_transporter_name}>
                      {compactText(bill.sap_transporter_name)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Vehicle {compactText(bill.sap_vehicle_no || bill.gst_vehicle_no)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Bilty {compactText(bill.sap_bilty_no || bill.sap_lr_number)}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <StatusBadge status={bill.plan.booking_status} />
                    {bill.plan.dispatch_date && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        {bill.plan.dispatch_date}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium">
                      Vehicle {compactText(bill.plan.vehicle_no)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Driver {compactText(bill.plan.driver_name)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Bilty {compactText(bill.plan.bilty_no)}
                    </div>
                    {bill.plan.priority && (
                      <div className="text-xs text-muted-foreground">
                        Priority {compactText(bill.plan.priority)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right align-top tabular-nums">
                    <div>{compactText(bill.plan.freight ?? '')}</div>
                    <div className="text-xs text-muted-foreground">
                      Total {compactText(bill.plan.total_freight ?? '')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Kanta {compactText(bill.plan.kanta_weight ?? '')}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right align-top">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className={cn('h-8 w-8 p-0', !canEdit && 'opacity-50')}
                            disabled={!canEdit}
                            onClick={() => onEdit(bill)}
                            aria-label="Edit dispatch plan"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {canEdit ? 'Edit dispatch plan' : 'No edit permission'}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
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
