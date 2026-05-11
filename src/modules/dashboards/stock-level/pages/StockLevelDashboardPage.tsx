import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import type { ApiError } from '@/core/api';
import { useWMSItemGroups } from '@/modules/warehouse/api';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';

import { SAPUnavailableBanner } from '../../sap-plan/components/SAPUnavailableBanner';
import {
  DEFAULT_MATERIAL_TYPE_NAME,
  findDefaultMaterialGroup,
} from '../../utils/itemGroupDefaults';
import { useStockLevels } from '../api';
import { StockLevelFilters, StockLevelMetaCards, StockLevelTable } from '../components';
import {
  DEFAULT_STOCK_MOVEMENT_FILTER,
  DEFAULT_STOCK_STATUS_FILTER,
  DEFAULT_STOCK_WAREHOUSE_FILTER,
  STOCK_BENCHMARK_STATS_STATUS_FILTER,
} from '../constants';
import type { StockDashboardFilters, StockSortCol } from '../types';

function isSAPError(err: unknown): err is ApiError {
  const status = (err as ApiError)?.status;
  return status === 502 || status === 503;
}

function normalizeSearchParam(value: string | null): string | undefined {
  const search = value?.trim();
  return search ? search.toUpperCase() : undefined;
}

export default function StockLevelDashboardPage() {
  const [searchParams] = useSearchParams();

  const [initialFilters] = useState<StockDashboardFilters>(() => {
    const search = normalizeSearchParam(searchParams.get('search'));
    const itemGroup = searchParams.get('item_group')?.trim();
    return {
      ...(search ? { search } : {}),
      ...(itemGroup ? { item_group: itemGroup } : {}),
      warehouse: [...DEFAULT_STOCK_WAREHOUSE_FILTER],
      status: [...DEFAULT_STOCK_STATUS_FILTER],
      movement_status: [...DEFAULT_STOCK_MOVEMENT_FILTER],
    };
  }); // Only read URL params on mount

  const [filters, setFilters] = useState<StockDashboardFilters>(initialFilters);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ col: StockSortCol; dir: 'asc' | 'desc' }>({
    col: 'health_ratio',
    dir: 'asc',
  });
  const itemGroupsQuery = useWMSItemGroups();

  const itemGroups = useMemo(
    () => itemGroupsQuery.data?.item_groups.map((group) => group.name).filter(Boolean) ?? [],
    [itemGroupsQuery.data],
  );

  const defaultItemGroup = useMemo(
    () => findDefaultMaterialGroup(itemGroups, (group) => group) ?? DEFAULT_MATERIAL_TYPE_NAME,
    [itemGroups],
  );

  const materialTypesResolved = Boolean(itemGroupsQuery.data) || itemGroupsQuery.isError;

  const effectiveFilters = useMemo<StockDashboardFilters>(
    () => ({
      ...filters,
      item_group: filters.item_group ?? defaultItemGroup,
    }),
    [defaultItemGroup, filters],
  );

  const handleFiltersChange = useCallback((f: StockDashboardFilters) => {
    setFilters(f);
    setPage(1);
  }, []);

  const handleSortChange = useCallback((col: StockSortCol, dir: 'asc' | 'desc') => {
    setSort({ col, dir });
    setPage(1);
  }, []);

  const query = useStockLevels(
    { ...effectiveFilters, sort_by: sort.col, sort_dir: sort.dir, page },
    materialTypesResolved,
  );
  const statsQuery = useStockLevels(
    {
      item_group: defaultItemGroup,
      warehouse: [...DEFAULT_STOCK_WAREHOUSE_FILTER],
      status: [...STOCK_BENCHMARK_STATS_STATUS_FILTER],
      page: 1,
      page_size: 1,
    },
    materialTypesResolved,
  );
  const meta = query.data?.meta;
  const statsMeta = statsQuery.data?.meta;
  const sapError = query.error ?? statsQuery.error;
  const hasSAPError = sapError && isSAPError(sapError);

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Stock Benchmark"
        description="Inventory items with benchmark levels — monitor on-hand vs. benchmark requirements"
      />

      <StockLevelFilters
        onFiltersChange={handleFiltersChange}
        isFetching={itemGroupsQuery.isFetching || query.isFetching || statsQuery.isFetching}
        defaultValues={effectiveFilters}
        warehouses={meta?.warehouses ?? []}
        itemGroups={itemGroups}
        defaultItemGroup={defaultItemGroup}
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
          <StockLevelMetaCards meta={statsMeta} />
          <StockLevelTable
            items={query.data?.data ?? []}
            isLoading={query.isLoading || query.isFetching}
            page={page}
            totalPages={meta?.total_pages ?? 1}
            totalItems={meta?.total_items ?? 0}
            onPageChange={setPage}
            selectedWarehouses={filters.warehouse}
            sortCol={sort.col}
            sortDir={sort.dir}
            onSortChange={handleSortChange}
          />
        </>
      )}
    </div>
  );
}
