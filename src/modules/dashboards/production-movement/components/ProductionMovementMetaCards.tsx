import {
  ArrowDownToLine,
  ArrowUpFromLine,
  IndianRupee,
  ListChecks,
  PackageCheck,
  PackageOpen,
  Scale,
} from 'lucide-react';

import { Card, CardContent } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { ProductionMovementSummary } from '../types';

interface ProductionMovementMetaCardsProps {
  isNetQtyDrilldownActive?: boolean;
  onNetQtyClick?: () => void;
  summary?: ProductionMovementSummary;
}

const numberFormatter = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 3,
});

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  currency: 'INR',
  maximumFractionDigits: 0,
  style: 'currency',
});

export function ProductionMovementMetaCards({
  isNetQtyDrilldownActive,
  onNetQtyClick,
  summary,
}: ProductionMovementMetaCardsProps) {
  const cards = [
    {
      label: 'Total Entries',
      value: numberFormatter.format(summary?.total_entries ?? 0),
      icon: ListChecks,
    },
    {
      label: 'Opening Qty',
      value: numberFormatter.format(summary?.opening_qty ?? 0),
      icon: PackageOpen,
    },
    {
      label: 'In Qty',
      value: numberFormatter.format(summary?.total_in_qty ?? 0),
      icon: ArrowDownToLine,
    },
    {
      label: 'Out Qty',
      value: numberFormatter.format(summary?.total_out_qty ?? 0),
      icon: ArrowUpFromLine,
    },
    {
      key: 'net_qty',
      label: 'Net Qty',
      value: numberFormatter.format(summary?.net_qty ?? 0),
      icon: Scale,
    },
    {
      label: 'Closing Qty',
      value: numberFormatter.format(summary?.closing_qty ?? 0),
      icon: PackageCheck,
    },
    {
      label: 'Movement Value',
      value: currencyFormatter.format(summary?.total_value ?? 0),
      icon: IndianRupee,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const isNetQty = card.key === 'net_qty';
        const isClickable = isNetQty && Boolean(onNetQtyClick);

        return (
          <Card
            key={card.label}
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : undefined}
            onClick={isClickable ? onNetQtyClick : undefined}
            onKeyDown={
              isClickable
                ? (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onNetQtyClick?.();
                    }
                  }
                : undefined
            }
            className={cn(
              isClickable &&
                'cursor-pointer transition-colors hover:border-primary/40 hover:bg-muted/20 focus:outline-none focus:ring-2 focus:ring-primary/30',
              isNetQty && isNetQtyDrilldownActive && 'border-primary/60 bg-muted/30',
            )}
          >
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
