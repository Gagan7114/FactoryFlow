import { AlertTriangle, CheckCircle, Package, ShieldAlert } from 'lucide-react';

import { Card, CardContent } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { StockDashboardMeta, StockHealthStatus } from '../types';

interface StockLevelMetaCardsProps {
  meta?: StockDashboardMeta;
  activeStatuses?: StockHealthStatus[];
  onStatusSelect?: (statuses: StockHealthStatus[]) => void;
}

function sameStatusSet(a: StockHealthStatus[] = [], b: StockHealthStatus[] = []): boolean {
  return a.length === b.length && a.every((value) => b.includes(value));
}

export function StockLevelMetaCards({
  meta,
  activeStatuses = [],
  onStatusSelect,
}: StockLevelMetaCardsProps) {
  const cards = [
    {
      label: 'Total Items',
      value: meta?.total_items ?? '-',
      icon: Package,
      statuses: [],
    },
    {
      label: 'Healthy',
      value: meta?.healthy_count ?? '-',
      icon: CheckCircle,
      statuses: ['healthy'],
    },
    {
      label: 'Low Stock',
      value: meta?.low_stock_count ?? '-',
      icon: AlertTriangle,
      statuses: ['low'],
    },
    {
      label: 'Critical Stock',
      value: meta?.critical_stock_count ?? '-',
      icon: ShieldAlert,
      statuses: ['critical'],
    },
  ] satisfies Array<{
    label: string;
    value: number | string;
    icon: typeof Package;
    statuses: StockHealthStatus[];
  }>;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const isActive = sameStatusSet(activeStatuses, card.statuses);

        return (
          <Card
            key={card.label}
            role="button"
            tabIndex={0}
            className={cn(
              'cursor-pointer transition-colors hover:border-primary/40 hover:bg-muted/20',
              isActive && 'border-primary/60 bg-primary/5',
            )}
            onClick={() => onStatusSelect?.([...card.statuses])}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onStatusSelect?.([...card.statuses]);
              }
            }}
            aria-pressed={isActive}
          >
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-md bg-primary/5 p-2">
                <card.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="text-2xl font-bold">{card.value}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
