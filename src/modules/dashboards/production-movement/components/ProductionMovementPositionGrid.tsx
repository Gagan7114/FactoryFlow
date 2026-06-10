import { AlertCircle, Loader2 } from 'lucide-react';

import { cn } from '@/shared/utils/cn';

import { POSITION_UNIT } from '../constants';

export interface WarehousePosition {
  code: string;
  name: string;
  opening: number;
  received: number;
  issued: number;
  closing: number;
  isLoading: boolean;
  isError: boolean;
}

interface ProductionMovementPositionGridProps {
  positions: WarehousePosition[];
}

const numberFormatter = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 3,
});

function formatQty(value: number): string {
  return `${numberFormatter.format(value)} ${POSITION_UNIT}`;
}

function PositionRow({
  label,
  value,
  sign,
  valueClassName,
}: {
  label: string;
  value: string;
  sign?: '+' | '-';
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className={cn('text-sm font-semibold tabular-nums', valueClassName)}>
        {sign ? `${sign} ` : ''}
        {value}
      </span>
    </div>
  );
}

function PositionCard({ position }: { position: WarehousePosition }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
      <div className="border-b bg-muted/30 px-5 py-4">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {position.name}
        </div>
        <div className="text-lg font-bold">{position.code}</div>
      </div>

      {position.isLoading ? (
        <div className="flex items-center justify-center gap-2 px-5 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading...
        </div>
      ) : position.isError ? (
        <div className="flex items-center justify-center gap-2 px-5 py-10 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          Failed to load
        </div>
      ) : (
        <>
          <div className="divide-y">
            <PositionRow label="Opening" value={formatQty(position.opening)} />
            <PositionRow
              label="Received"
              value={formatQty(position.received)}
              sign="+"
              valueClassName="text-emerald-600"
            />
            <PositionRow
              label="Issued"
              value={formatQty(position.issued)}
              sign="-"
              valueClassName="text-red-600"
            />
          </div>
          <div className="flex items-center justify-between border-t bg-muted/30 px-5 py-3">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Closing Position
            </span>
            <span className="text-lg font-bold tabular-nums text-primary">
              {formatQty(position.closing)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export function ProductionMovementPositionGrid({
  positions,
}: ProductionMovementPositionGridProps) {
  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Position Calculation
        </p>
        <h2 className="text-xl font-bold">
          All warehouses: opening + received - issued = closing
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {positions.map((position) => (
          <PositionCard key={position.code} position={position} />
        ))}
      </div>
    </section>
  );
}
