import { Loader2 } from 'lucide-react';

import { Button, Input, Label, NativeSelect as Select, SelectOption } from '@/shared/components/ui';

import {
  DIRECTION_OPTIONS,
  getDefaultProductionMovementFilters,
  LIMIT_OPTIONS,
} from '../constants';
import type {
  ProductionMovementFilterOptions,
  ProductionMovementFilters as FiltersType,
} from '../types';

interface ProductionMovementFiltersProps {
  filters: FiltersType;
  filterOptions?: ProductionMovementFilterOptions;
  isFetching?: boolean;
  onFiltersChange: (filters: FiltersType) => void;
}

function normalizeSearch(value: string): string | undefined {
  const search = value.trim();
  return search ? search.toUpperCase() : undefined;
}

export function ProductionMovementFilters({
  filters,
  filterOptions,
  isFetching,
  onFiltersChange,
}: ProductionMovementFiltersProps) {
  const warehouseOptions = filterOptions?.warehouses ?? [];
  const selectedFromWarehouseMissing =
    Boolean(filters.from_warehouse) &&
    !warehouseOptions.some((warehouse) => warehouse.code === filters.from_warehouse);
  const selectedToWarehouseMissing =
    Boolean(filters.to_warehouse) &&
    !warehouseOptions.some((warehouse) => warehouse.code === filters.to_warehouse);

  function updateFilters(patch: Partial<FiltersType>) {
    onFiltersChange({ ...filters, ...patch });
  }

  function handleReset() {
    const defaults = getDefaultProductionMovementFilters();
    onFiltersChange(defaults);
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
      <div className="order-1 flex flex-col gap-1.5">
        <Label htmlFor="prod-movement-search" className="text-xs">
          Search
        </Label>
        <Input
          id="prod-movement-search"
          type="text"
          value={filters.search ?? ''}
          onChange={(event) => updateFilters({ search: normalizeSearch(event.target.value) })}
          placeholder="Item code, name, reference"
          className="w-64"
        />
      </div>

      <div className="order-2 flex flex-col gap-1.5">
        <Label htmlFor="prod-movement-from-warehouse" className="text-xs">
          From Warehouse
        </Label>
        <Select
          id="prod-movement-from-warehouse"
          className="w-48"
          value={filters.from_warehouse ?? ''}
          onChange={(event) => updateFilters({ from_warehouse: event.target.value || undefined })}
        >
          <SelectOption value="">All</SelectOption>
          {selectedFromWarehouseMissing && (
            <SelectOption value={filters.from_warehouse!}>{filters.from_warehouse}</SelectOption>
          )}
          {warehouseOptions.map((warehouse) => (
            <SelectOption key={warehouse.code} value={warehouse.code}>
              {warehouse.code}
            </SelectOption>
          ))}
        </Select>
      </div>

      <div className="order-3 flex flex-col gap-1.5">
        <Label htmlFor="prod-movement-to-warehouse" className="text-xs">
          To Warehouse
        </Label>
        <Select
          id="prod-movement-to-warehouse"
          className="w-48"
          value={filters.to_warehouse ?? ''}
          onChange={(event) => updateFilters({ to_warehouse: event.target.value || undefined })}
        >
          <SelectOption value="">All</SelectOption>
          {selectedToWarehouseMissing && (
            <SelectOption value={filters.to_warehouse!}>{filters.to_warehouse}</SelectOption>
          )}
          {warehouseOptions.map((warehouse) => (
            <SelectOption key={warehouse.code} value={warehouse.code}>
              {warehouse.code}
            </SelectOption>
          ))}
        </Select>
      </div>

      <div className="order-4 flex flex-col gap-1.5">
        <Label htmlFor="prod-movement-direction" className="text-xs">
          Direction
        </Label>
        <Select
          id="prod-movement-direction"
          className="w-36"
          value={filters.direction ?? 'all'}
          onChange={(event) =>
            updateFilters({ direction: event.target.value as FiltersType['direction'] })
          }
        >
          {DIRECTION_OPTIONS.map((option) => (
            <SelectOption key={option.value} value={option.value}>
              {option.label}
            </SelectOption>
          ))}
        </Select>
      </div>

      <div className="order-5 flex flex-col gap-1.5">
        <Label htmlFor="prod-movement-from" className="text-xs">
          From
        </Label>
        <Input
          id="prod-movement-from"
          type="date"
          value={filters.date_from}
          onChange={(event) => updateFilters({ date_from: event.target.value })}
          className="w-40"
        />
      </div>

      <div className="order-6 flex flex-col gap-1.5">
        <Label htmlFor="prod-movement-to" className="text-xs">
          To
        </Label>
        <Input
          id="prod-movement-to"
          type="date"
          value={filters.date_to}
          onChange={(event) => updateFilters({ date_to: event.target.value })}
          className="w-40"
        />
      </div>

      <div className="order-7 flex flex-col gap-1.5">
        <Label htmlFor="prod-movement-limit" className="text-xs">
          Limit
        </Label>
        <Select
          id="prod-movement-limit"
          className="w-32"
          value={String(filters.limit ?? 500)}
          onChange={(event) => updateFilters({ limit: Number(event.target.value) })}
        >
          {LIMIT_OPTIONS.map((option) => (
            <SelectOption key={option.value} value={String(option.value)}>
              {option.label}
            </SelectOption>
          ))}
        </Select>
      </div>

      <Button variant="outline" size="sm" onClick={handleReset} className="order-9 mb-0.5">
        Reset
      </Button>

      {isFetching && (
        <div className="order-10 mb-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading...
        </div>
      )}
    </div>
  );
}
