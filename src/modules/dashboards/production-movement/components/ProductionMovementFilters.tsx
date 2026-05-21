import { Loader2 } from 'lucide-react';

import {
  Button,
  Checkbox,
  Input,
  Label,
  NativeSelect as Select,
  SelectOption,
} from '@/shared/components/ui';

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
        <Label htmlFor="prod-movement-warehouse" className="text-xs">
          Warehouse
        </Label>
        <Select
          id="prod-movement-warehouse"
          className="w-48"
          value={filters.warehouse ?? ''}
          onChange={(event) =>
            updateFilters({ warehouse: event.target.value || undefined })
          }
        >
          <SelectOption value="">All</SelectOption>
          {(filterOptions?.warehouses ?? []).map((warehouse) => (
            <SelectOption key={warehouse.code} value={warehouse.code}>
              {warehouse.code}
            </SelectOption>
          ))}
        </Select>
      </div>

      <div className="order-3 flex flex-col gap-1.5">
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

      <div className="order-4 flex flex-col gap-1.5">
        <Label htmlFor="prod-movement-type" className="text-xs">
          Movement Type
        </Label>
        <Select
          id="prod-movement-type"
          className="w-44"
          value={filters.transaction_type ?? ''}
          onChange={(event) =>
            updateFilters({ transaction_type: event.target.value || undefined })
          }
        >
          <SelectOption value="">All</SelectOption>
          {(filterOptions?.transaction_types ?? []).map((type) => (
            <SelectOption key={type.code} value={type.code}>
              {type.label ?? type.code}
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

      <div className="order-8 mb-2 flex items-center gap-2">
        <Checkbox
          id="prod-movement-production-only"
          checked={filters.production_only ?? true}
          onCheckedChange={(checked) => updateFilters({ production_only: checked })}
        />
        <Label htmlFor="prod-movement-production-only" className="text-xs">
          Production warehouses
        </Label>
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
