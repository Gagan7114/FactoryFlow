import { Search, X } from 'lucide-react';
import { useState } from 'react';

import {
  Button,
  Input,
  Label,
  NativeSelect as Select,
  SelectOption,
} from '@/shared/components/ui';

import { SALES_PLANNING_STATUS_OPTIONS } from '../constants';
import type { SalesPlanningRequirementFilters as SalesPlanningRequirementFiltersType } from '../types';

interface SalesPlanningRequirementFiltersProps {
  filters: SalesPlanningRequirementFiltersType;
  isFetching: boolean;
  onFiltersChange: (filters: SalesPlanningRequirementFiltersType) => void;
}

export function SalesPlanningRequirementFilters({
  filters,
  isFetching,
  onFiltersChange,
}: SalesPlanningRequirementFiltersProps) {
  const [search, setSearch] = useState(filters.search ?? '');

  function applySearch() {
    onFiltersChange({ ...filters, search: search.trim() || undefined, page: 1 });
  }

  function reset() {
    setSearch('');
    onFiltersChange({
      search: undefined,
      status: 'all',
      page: 1,
      page_size: filters.page_size,
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
      <div className="min-w-64 flex-1">
        <Label htmlFor="sales-planning-search">Search</Label>
        <div className="mt-1 flex gap-2">
          <Input
            id="sales-planning-search"
            value={search}
            placeholder="Item code, item name, forecast"
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') applySearch();
            }}
          />
          <Button type="button" variant="outline" size="icon" onClick={applySearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div>
        <Label htmlFor="sales-planning-status">Status</Label>
        <Select
          id="sales-planning-status"
          className="mt-1 w-40"
          value={filters.status ?? 'all'}
          onChange={(event) =>
            onFiltersChange({
              ...filters,
              status: event.target.value as SalesPlanningRequirementFiltersType['status'],
              page: 1,
            })
          }
        >
          {SALES_PLANNING_STATUS_OPTIONS.map((option) => (
            <SelectOption key={option.value} value={option.value}>
              {option.label}
            </SelectOption>
          ))}
        </Select>
      </div>

      <Button variant="outline" size="sm" onClick={reset} disabled={isFetching}>
        <X className="h-4 w-4" />
        Reset
      </Button>
    </div>
  );
}
