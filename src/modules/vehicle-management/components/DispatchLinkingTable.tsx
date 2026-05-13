import { Link2, Loader2 } from 'lucide-react';

import { StatusBadge } from '@/modules/dashboards/dispatch-plans/components';
import type { DispatchBill } from '@/modules/dashboards/dispatch-plans/types';
import { Button } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

interface DispatchLinkingTableProps {
  bills: DispatchBill[];
  isLoading: boolean;
  canEdit: boolean;
  onLink: (bill: DispatchBill) => void;
}

function compactText(value: string | null | undefined, fallback = '-') {
  return value?.trim() || fallback;
}

function formatNumber(value: number, fractionDigits = 2): string {
  return value.toLocaleString('en-IN', {
    maximumFractionDigits: fractionDigits,
  });
}

export function DispatchLinkingTable({
  bills,
  isLoading,
  canEdit,
  onLink,
}: DispatchLinkingTableProps) {
  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center rounded-md border text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading dispatch plans...
      </div>
    );
  }

  if (bills.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-md border text-sm text-muted-foreground">
        No dispatch plans found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Dispatch</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Bill</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Load</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">SAP Hints</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Linked Vehicle
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Action</th>
            </tr>
          </thead>
          <tbody>
            {bills.map((bill) => (
              <tr
                key={bill.doc_entry}
                className={cn('border-b transition-colors', canEdit && 'hover:bg-muted/30')}
              >
                <td className="px-4 py-3 align-top">
                  <div className="font-medium">{compactText(bill.plan.dispatch_date)}</div>
                  <div className="text-xs text-muted-foreground">
                    Priority {compactText(bill.plan.priority)}
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="font-mono text-xs font-semibold">{bill.doc_num}</div>
                  <div className="text-xs text-muted-foreground">
                    Inv {compactText(bill.doc_date)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {compactText(bill.branch_name)}
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="max-w-[230px] truncate font-medium" title={bill.card_name}>
                    {compactText(bill.card_name)}
                  </div>
                  <div className="font-mono text-xs text-muted-foreground">{bill.card_code}</div>
                  <div
                    className="max-w-[230px] truncate text-xs text-muted-foreground"
                    title={bill.ship_to_address}
                  >
                    {compactText(bill.city)} {compactText(bill.state)}
                  </div>
                </td>
                <td className="px-4 py-3 align-top tabular-nums">
                  <div>{formatNumber(bill.total_litres)} L</div>
                  <div className="text-xs text-muted-foreground">
                    {formatNumber(bill.total_boxes)} boxes
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatNumber(bill.total_weight, 3)} kg
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  <div
                    className="max-w-[190px] truncate font-medium"
                    title={bill.sap_transporter_name}
                  >
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
                  <div className="font-medium">Vehicle {compactText(bill.plan.vehicle_no)}</div>
                  <div className="text-xs text-muted-foreground">
                    Driver {compactText(bill.plan.driver_name)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Bilty {compactText(bill.plan.bilty_no)}
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  <StatusBadge status={bill.plan.booking_status} />
                </td>
                <td className="px-4 py-3 text-right align-top">
                  <Button
                    type="button"
                    variant={bill.plan.vehicle_id ? 'outline' : 'default'}
                    size="sm"
                    disabled={!canEdit}
                    onClick={() => onLink(bill)}
                  >
                    <Link2 className="mr-2 h-4 w-4" />
                    {bill.plan.vehicle_id ? 'Edit Link' : 'Link'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
