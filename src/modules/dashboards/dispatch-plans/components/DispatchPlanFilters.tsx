import { format, parseISO } from 'date-fns';
import { Loader2, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { DateRange } from 'react-day-picker';

import { DateRangePicker } from '@/modules/gate/components/DateRangePicker';
import {
  Button,
  Input,
  Label,
  NativeSelect as Select,
  SelectOption,
} from '@/shared/components/ui';

import {
  BOOKING_STATUS_OPTIONS,
  createDefaultDispatchPlanFilters,
} from '../constants';
import type { DispatchPlanFilters } from '../types';

const SEARCH_DEBOUNCE_MS = 450;

interface DispatchPlanFiltersProps {
  filters: DispatchPlanFilters;
  onFiltersChange: (filters: DispatchPlanFilters) => void;
  isFetching?: boolean;
}

export function DispatchPlanFilters({
  filters,
  onFiltersChange,
  isFetching,
}: DispatchPlanFiltersProps) {
  const [searchDraft, setSearchDraft] = useState(filters.search ?? '');

  const dateRange = useMemo<DateRange>(
    () => ({
      from: parseISO(filters.date_from),
      to: parseISO(filters.date_to),
    }),
    [filters.date_from, filters.date_to],
  );

  useEffect(() => {
    if ((filters.search ?? '') === searchDraft.trim()) return;
    const timer = setTimeout(() => {
      onFiltersChange({
        ...filters,
        search: searchDraft.trim() || undefined,
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [filters, onFiltersChange, searchDraft]);

  function handleDateChange(value: Date | DateRange | undefined) {
    if (!value || value instanceof Date || !value.from || !value.to) return;
    onFiltersChange({
      ...filters,
      date_from: format(value.from, 'yyyy-MM-dd'),
      date_to: format(value.to, 'yyyy-MM-dd'),
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs font-semibold">Created Date</Label>
        <DateRangePicker
          mode="range"
          date={dateRange}
          onDateChange={handleDateChange}
          className="w-[260px]"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="dispatch-plan-search" className="text-xs">
          Search
        </Label>
        <Input
          id="dispatch-plan-search"
          value={searchDraft}
          onChange={(event) => setSearchDraft(event.target.value)}
          placeholder="Bill, party, vehicle"
          className="w-60"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="dispatch-plan-status" className="text-xs">
          Status
        </Label>
        <Select
          id="dispatch-plan-status"
          value={filters.booking_status ?? 'all'}
          onChange={(event) =>
            onFiltersChange({
              ...filters,
              booking_status: event.target.value as DispatchPlanFilters['booking_status'],
            })
          }
          className="w-36"
        >
          {BOOKING_STATUS_OPTIONS.map((option) => (
            <SelectOption key={option.value} value={option.value}>
              {option.label}
            </SelectOption>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="dispatch-plan-limit" className="text-xs">
          Rows
        </Label>
        <Select
          id="dispatch-plan-limit"
          value={String(filters.limit ?? 500)}
          onChange={(event) =>
            onFiltersChange({
              ...filters,
              limit: Number(event.target.value),
            })
          }
          className="w-28"
        >
          <SelectOption value="200">200</SelectOption>
          <SelectOption value="500">500</SelectOption>
          <SelectOption value="1000">1000</SelectOption>
          <SelectOption value="2000">2000</SelectOption>
        </Select>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          setSearchDraft('');
          onFiltersChange(createDefaultDispatchPlanFilters());
        }}
        className="mb-0.5"
      >
        <RotateCcw className="mr-2 h-4 w-4" />
        Reset
      </Button>

      {isFetching && (
        <div className="mb-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading...
        </div>
      )}
    </div>
  );
}
