import { Loader2, Search, SlidersHorizontal } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

import { Button, Input } from '@/shared/components/ui';

import type { StockDashboardFilters } from '../types';

const TEXT_DEBOUNCE_MS = 450;

function normalizeSearch(value: string): string | undefined {
  const search = value.trim();
  return search ? search.toUpperCase() : undefined;
}

interface StockLevelFiltersProps {
  filters: StockDashboardFilters;
  filtersHref: string;
  activeFilterCount: number;
  onSearchChange: (search?: string) => void;
  isFetching?: boolean;
}

export function StockLevelFilters({
  filters,
  filtersHref,
  activeFilterCount,
  onSearchChange,
  isFetching,
}: StockLevelFiltersProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleSearchChange(value: string) {
    const normalized = normalizeSearch(value);
    if ((normalized ?? '') === (filters.search ?? '')) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearchChange(normalized);
    }, TEXT_DEBOUNCE_MS);
  }

  return (
    <div className="rounded-lg border bg-card/95 p-3 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            key={filters.search ?? 'empty-search'}
            defaultValue={filters.search ?? ''}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder="Search item code, name, or warehouse"
            className="h-11 pl-9"
            aria-label="Search stock benchmark"
          />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button asChild className="h-11">
            <Link to={filtersHref}>
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-foreground px-1.5 text-xs font-semibold text-primary">
                  {activeFilterCount}
                </span>
              )}
            </Link>
          </Button>

          {isFetching && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
