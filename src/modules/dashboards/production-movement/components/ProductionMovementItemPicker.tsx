import { Loader2, PackageSearch } from 'lucide-react';
import type { FormEvent } from 'react';

import { Button, Input, Label } from '@/shared/components/ui';

import { POSITION_UNIT } from '../constants';
import type { ProductionMovementRecentItem } from '../types';

interface ProductionMovementItemPickerProps {
  itemCode: string;
  warehouse: string;
  recentItems: ProductionMovementRecentItem[];
  isLoading: boolean;
  onItemCodeChange: (value: string) => void;
  onWarehouseChange: (value: string) => void;
  onLoadItem: () => void;
  onClear: () => void;
  onSelectItem: (item: ProductionMovementRecentItem) => void;
}

const numberFormatter = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 3,
});

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background px-3 py-2">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 font-bold tabular-nums">{value}</div>
    </div>
  );
}

function RecentItemCard({
  item,
  onSelect,
}: {
  item: ProductionMovementRecentItem;
  onSelect: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-5 shadow-sm">
      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {item.date}
        </div>
        <div className="mt-1 text-lg font-bold">{item.item_code}</div>
        <div className="text-sm text-muted-foreground">{item.item_name}</div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatBox
          label="Last Issue"
          value={`${numberFormatter.format(item.last_issue_qty)} ${POSITION_UNIT}`}
        />
        <StatBox label="Warehouse" value={item.warehouse || '-'} />
        <StatBox label="Document" value={item.doc_num || '-'} />
      </div>

      <Button className="self-start" onClick={onSelect}>
        Open item
      </Button>
    </div>
  );
}

export function ProductionMovementItemPicker({
  itemCode,
  warehouse,
  recentItems,
  isLoading,
  onItemCodeChange,
  onWarehouseChange,
  onLoadItem,
  onClear,
  onSelectItem,
}: ProductionMovementItemPickerProps) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onLoadItem();
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4"
      >
        <div className="flex min-w-64 flex-1 flex-col gap-1.5">
          <Label htmlFor="position-item-code" className="text-xs">
            Item code
          </Label>
          <Input
            id="position-item-code"
            type="text"
            value={itemCode}
            onChange={(event) => onItemCodeChange(event.target.value)}
            placeholder="Clear to view all recent items"
          />
        </div>

        <div className="flex min-w-64 flex-1 flex-col gap-1.5">
          <Label htmlFor="position-item-warehouse" className="text-xs">
            Warehouse
          </Label>
          <Input
            id="position-item-warehouse"
            type="text"
            value={warehouse}
            onChange={(event) => onWarehouseChange(event.target.value)}
            placeholder="Optional override, e.g. BH-PM"
          />
        </div>

        <Button type="submit" disabled={!itemCode.trim()} className="mb-0.5">
          Load item
        </Button>
        <Button type="button" variant="outline" onClick={onClear} className="mb-0.5">
          Clear
        </Button>
      </form>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            All Recent Items
          </p>
          <h2 className="text-xl font-bold">Choose an item first</h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 rounded-lg border bg-card py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading recent items...
          </div>
        ) : recentItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border bg-card py-16 text-sm text-muted-foreground">
            <PackageSearch className="h-6 w-6" />
            No recent items for the selected period.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {recentItems.map((item) => (
              <RecentItemCard
                key={item.item_code}
                item={item}
                onSelect={() => onSelectItem(item)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
