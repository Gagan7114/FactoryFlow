import { ChevronLeft } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';

import type { ApiError } from '@/core/api';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';

import { SAPUnavailableBanner } from '../../sap-plan/components/SAPUnavailableBanner';
import {
  DEFAULT_MATERIAL_TYPE_NAME,
  findDefaultMaterialGroup,
} from '../../utils/itemGroupDefaults';
import { useStockLevelFilterOptions, useStockLevels } from '../api';
import { StockLevelFilters, StockLevelMetaCards, StockLevelTable } from '../components';
import { DEFAULT_STOCK_MOVEMENT_FILTER } from '../constants';
import type { StockDashboardFilters, StockHealthStatus, StockSortCol } from '../types';
import {
  countActiveStockFilters,
  filtersFromSearchParams,
  filtersToSearchParams,
} from '../utils/stockLevelFilterParams';

function isSAPError(err: unknown): err is ApiError {
  const status = (err as ApiError)?.status;
  return status === 502 || status === 503;
}

export default function StockLevelDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const showResults = searchParams.get('show_results') === '1';

  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ col: StockSortCol; dir: 'asc' | 'desc' }>({
    col: 'health_ratio',
    dir: 'asc',
  });
  const filterOptionsQuery = useStockLevelFilterOptions();

  const itemGroups = useMemo(
    () => filterOptionsQuery.data?.item_groups.map((group) => group.value).filter(Boolean) ?? [],
    [filterOptionsQuery.data],
  );

  const defaultItemGroup = useMemo(
    () => findDefaultMaterialGroup(itemGroups, (group) => group) ?? DEFAULT_MATERIAL_TYPE_NAME,
    [itemGroups],
  );

  const materialTypesResolved = Boolean(filterOptionsQuery.data) || filterOptionsQuery.isError;

  const effectiveFilters = useMemo(
    () =>
      filtersFromSearchParams(searchParams, defaultItemGroup, {
        defaultWarehouse: false,
        defaultStatus: false,
        defaultMovement: false,
      }),
    [defaultItemGroup, searchParams],
  );

  const commitFilters = useCallback((nextFilters: StockDashboardFilters) => {
    const params = filtersToSearchParams(nextFilters);
    if (showResults) params.set('show_results', '1');
    setSearchParams(params);
    setPage(1);
  }, [setSearchParams, showResults]);

  const handleSortChange = useCallback((col: StockSortCol, dir: 'asc' | 'desc') => {
    setSort({ col, dir });
    setPage(1);
  }, []);

  const handleStatusCardSelect = useCallback((statuses: StockHealthStatus[]) => {
    commitFilters({
      ...effectiveFilters,
      status: [...statuses],
      movement_status: statuses.length ? [...DEFAULT_STOCK_MOVEMENT_FILTER] : [],
    });
  }, [commitFilters, effectiveFilters]);

  const handleItemSearchSelect = useCallback((term: string) => {
    const search = term.trim().toUpperCase();
    if (!search) return;
    commitFilters({ ...effectiveFilters, search });
  }, [commitFilters, effectiveFilters]);

  const handleSearchChange = useCallback((search?: string) => {
    commitFilters({ ...effectiveFilters, search });
  }, [commitFilters, effectiveFilters]);

  const query = useStockLevels(
    { ...effectiveFilters, sort_by: sort.col, sort_dir: sort.dir, page },
    materialTypesResolved && showResults,
  );
  const statsQuery = useStockLevels(
    {
      ...effectiveFilters,
      ...(effectiveFilters.as_of_date ? { as_of_date: effectiveFilters.as_of_date } : {}),
      page: 1,
      page_size: 1,
    },
    materialTypesResolved && showResults,
  );
  const meta = query.data?.meta;
  const statsMeta = statsQuery.data?.meta;
  const sapError = query.error ?? statsQuery.error;
  const hasSAPError = sapError && isSAPError(sapError);
  const filtersParams = filtersToSearchParams(effectiveFilters);
  const filtersSearch = filtersParams.toString();
  const filtersHref = `/dashboards/stock-levels/filters${filtersSearch ? `?${filtersSearch}` : ''}`;
  const warehouseStepParams = new URLSearchParams(filtersParams);
  warehouseStepParams.set('step', 'warehouse');
  warehouseStepParams.set('from_results', '1');
  const warehouseStepSearch = warehouseStepParams.toString();
  const warehouseStepHref = `/dashboards/stock-levels/filters${warehouseStepSearch ? `?${warehouseStepSearch}` : ''}`;
  const activeFilterCount = countActiveStockFilters(effectiveFilters, defaultItemGroup);

  if (!showResults) {
    const flowSearch = filtersSearch ? `?${filtersSearch}` : '';
    return <Navigate to={`/dashboards/stock-levels/filters${flowSearch}`} replace />;
  }

  return (
    <div className="relative min-h-[760px] space-y-6 p-6 xl:pl-52">
      <Link
        to={warehouseStepHref}
        className="absolute inset-y-10 left-6 z-10 hidden w-40 flex-col items-start justify-center rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-left text-emerald-950 shadow-lg shadow-emerald-100/80 transition-transform duration-300 hover:-translate-x-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-100 xl:flex"
        aria-label="Back to Warehouse filter step"
      >
        <ChevronLeft className="mb-3 h-5 w-5 text-emerald-700 dark:text-emerald-300" />
        <span className="text-xs font-semibold uppercase text-emerald-700/75 dark:text-emerald-300/75">
          Previous
        </span>
        <span className="mt-1 text-sm font-semibold">Warehouse</span>
      </Link>

      <DashboardHeader
        title="Stock Benchmark"
        description="Inventory items with benchmark levels - monitor on-hand vs. benchmark requirements"
      />

      <Link
        to={warehouseStepHref}
        className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 shadow-sm transition-colors hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-100 dark:hover:bg-emerald-950 xl:hidden"
        aria-label="Back to Warehouse filter step"
      >
        <span>
          <span className="block text-xs font-semibold uppercase text-emerald-700/75 dark:text-emerald-300/75">
            Previous
          </span>
          <span className="text-sm font-semibold">Warehouse</span>
        </span>
        <ChevronLeft className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
      </Link>

      <StockLevelFilters
        filters={effectiveFilters}
        filtersHref={filtersHref}
        activeFilterCount={activeFilterCount}
        onSearchChange={handleSearchChange}
        isFetching={filterOptionsQuery.isFetching || query.isFetching || statsQuery.isFetching}
      />

      {hasSAPError && (
        <SAPUnavailableBanner
          error={sapError as ApiError}
          onRetry={() => {
            void query.refetch();
            void statsQuery.refetch();
          }}
        />
      )}

      {!hasSAPError && (
        <>
          <StockLevelMetaCards
            meta={statsMeta}
            activeStatuses={effectiveFilters.status}
            onStatusSelect={handleStatusCardSelect}
          />
          <StockLevelTable
            items={query.data?.data ?? []}
            isLoading={query.isLoading || query.isFetching}
            page={page}
            totalPages={meta?.total_pages ?? 1}
            totalItems={meta?.total_items ?? 0}
            onPageChange={setPage}
            selectedWarehouses={effectiveFilters.warehouse}
            sortCol={sort.col}
            sortDir={sort.dir}
            onSortChange={handleSortChange}
            onSearchSelect={handleItemSearchSelect}
          />
        </>
      )}
    </div>
  );
}
