import { AlertTriangle, CheckCircle, Package, ShieldAlert } from 'lucide-react';

import { Card, CardContent } from '@/shared/components/ui';

import type { StockDashboardMeta } from '../types';

interface StockLevelMetaCardsProps {
  meta?: StockDashboardMeta;
}

export function StockLevelMetaCards({ meta }: StockLevelMetaCardsProps) {
  const statusTotal =
    meta === undefined
      ? undefined
      : meta.healthy_count + meta.low_stock_count + meta.critical_stock_count;

  const cards = [
    {
      label: 'Total Items',
      value: statusTotal ?? '—',
      icon: Package,
    },
    {
      label: 'Healthy',
      value: meta?.healthy_count ?? '—',
      icon: CheckCircle,
    },
    {
      label: 'Low Stock',
      value: meta?.low_stock_count ?? '—',
      icon: AlertTriangle,
      highlight: meta?.low_stock_count ? meta.low_stock_count > 0 : false,
    },
    {
      label: 'Critical Stock',
      value: meta?.critical_stock_count ?? '—',
      icon: ShieldAlert,
      critical: meta?.critical_stock_count ? meta.critical_stock_count > 0 : false,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
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
      ))}
    </div>
  );
}
