import { ArrowDownToLine, ArrowRightLeft, ArrowUpFromLine, ListChecks, Route } from 'lucide-react';
import { useMemo } from 'react';

import type { WMSTransferLine } from '@/modules/warehouse/types';
import { Card, CardContent } from '@/shared/components/ui';

interface ProductionMovementMetaCardsProps {
  direction?: 'all' | 'in' | 'out';
  search?: string;
  transferLines: WMSTransferLine[];
}

const numberFormatter = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 3,
});

function normalizeSearch(value?: string): string {
  return value?.trim().toUpperCase() ?? '';
}

function matchesSearch(line: WMSTransferLine, search: string): boolean {
  if (!search) return true;
  return [
    line.item_code,
    line.item_name,
    line.from_warehouse,
    line.to_warehouse,
    String(line.doc_num),
    line.comments ?? '',
  ].some((value) => value.toUpperCase().includes(search));
}

export function ProductionMovementMetaCards({
  direction = 'all',
  search,
  transferLines,
}: ProductionMovementMetaCardsProps) {
  const summary = useMemo(() => {
    const matchingLines = transferLines.filter((line) =>
      matchesSearch(line, normalizeSearch(search)),
    );
    const totalQuantity = matchingLines.reduce((total, line) => total + line.quantity, 0);
    const transferDocs = new Set(matchingLines.map((line) => line.doc_entry));
    const routes = new Set(
      matchingLines.map((line) => `${line.from_warehouse}->${line.to_warehouse}`),
    );

    return {
      entries: direction === 'all' ? matchingLines.length * 2 : matchingLines.length,
      inQty: direction === 'out' ? 0 : totalQuantity,
      lineCount: matchingLines.length,
      outQty: direction === 'in' ? 0 : totalQuantity,
      routeCount: routes.size,
      transferCount: transferDocs.size,
    };
  }, [direction, search, transferLines]);

  const cards = [
    {
      label: 'Movement Entries',
      value: numberFormatter.format(summary.entries),
      icon: ListChecks,
    },
    {
      label: 'Transfer Docs',
      value: numberFormatter.format(summary.transferCount),
      icon: ArrowRightLeft,
    },
    {
      label: 'Line Items',
      value: numberFormatter.format(summary.lineCount),
      icon: ListChecks,
    },
    {
      label: 'In Qty',
      value: numberFormatter.format(summary.inQty),
      icon: ArrowDownToLine,
    },
    {
      label: 'Out Qty',
      value: numberFormatter.format(summary.outQty),
      icon: ArrowUpFromLine,
    },
    {
      label: 'Routes',
      value: numberFormatter.format(summary.routeCount),
      icon: Route,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <Card key={card.label}>
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
