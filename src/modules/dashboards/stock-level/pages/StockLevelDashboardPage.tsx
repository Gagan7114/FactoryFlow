import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import type { ApiError } from '@/core/api';
import { useWMSItemGroups } from '@/modules/warehouse/api';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { ExcelExportButton } from '@/shared/components/dashboard/ExcelExportButton';

import { SAPUnavailableBanner } from '../../sap-plan/components/SAPUnavailableBanner';
import {
  DEFAULT_MATERIAL_TYPE_NAME,
  findDefaultMaterialGroup,
} from '../../utils/itemGroupDefaults';
import { stockLevelApi, useStockLevels } from '../api';
import { StockLevelFilters, StockLevelMetaCards, StockLevelTable } from '../components';
import {
  DEFAULT_STOCK_MOVEMENT_FILTER,
  DEFAULT_STOCK_STATUS_FILTER,
  DEFAULT_STOCK_WAREHOUSE_FILTER,
  STOCK_BENCHMARK_STATS_STATUS_FILTER,
} from '../constants';
import type { StockDashboardFilters, StockHealthStatus, StockSortCol } from '../types';
import { exportStockLevelDashboard } from '../utils/exportStockLevel';

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
  const [filterResetSignal, setFilterResetSignal] = useState(0);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ col: StockSortCol; dir: 'asc' | 'desc' }>({
    col: 'health_ratio',
    dir: 'asc',
  });
  const [isExporting, setIsExporting] = useState(false);
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

  const handleStatusCardSelect = useCallback((statuses: StockHealthStatus[]) => {
    setFilters((current) => ({
      ...current,
      status: [...statuses],
      movement_status: [...DEFAULT_STOCK_MOVEMENT_FILTER],
    }));
    setFilterResetSignal((current) => current + 1);
    setPage(1);
  }, []);

  const handleItemSearchSelect = useCallback((term: string) => {
    const search = term.trim().toUpperCase();
    if (!search) return;
    setFilters((current) => ({ ...current, search }));
    setFilterResetSignal((current) => current + 1);
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
      movement_status: [...DEFAULT_STOCK_MOVEMENT_FILTER],
      ...(effectiveFilters.as_of_date ? { as_of_date: effectiveFilters.as_of_date } : {}),
      page: 1,
      page_size: 1,
    },
    materialTypesResolved,
  );
  const meta = query.data?.meta;
  const statsMeta = statsQuery.data?.meta;
  const latestWarehouses =
    meta?.warehouses && meta.warehouses.length > 0
      ? meta.warehouses
      : statsMeta?.warehouses && statsMeta.warehouses.length > 0
        ? statsMeta.warehouses
        : undefined;
  const sapError = query.error ?? statsQuery.error;
  const sapApiError = isSAPError(sapError) ? sapError : null;
  const hasSAPError = Boolean(sapApiError);
  const stockItems = query.data?.data ?? [];

  const handleExport = useCallback(async () => {
    if (!query.data?.data.length) return;

    setIsExporting(true);
    try {
      const pageSize = Math.max(query.data.meta.total_items, query.data.data.length, 1);
      const exportFilters = {
        ...effectiveFilters,
        sort_by: sort.col,
        sort_dir: sort.dir,
        page: 1,
        page_size: pageSize,
      };
      const exportData = await stockLevelApi.getStockLevels(exportFilters);

      exportStockLevelDashboard({
        items: exportData.data,
        filters: exportFilters,
        meta: exportData.meta,
      });
    } catch {
      toast.error('Failed to export stock benchmark');
    } finally {
      setIsExporting(false);
    }
  }, [effectiveFilters, query.data, sort.col, sort.dir]);

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Stock Benchmark"
        description="Inventory items with benchmark levels — monitor on-hand vs. benchmark requirements"
      >
        <ExcelExportButton
          onExport={handleExport}
          isLoading={isExporting}
          disabled={Boolean(hasSAPError) || stockItems.length === 0 || !materialTypesResolved}
          disabledReason="No stock rows to export"
        />
      </DashboardHeader>

      <StockLevelFilters
        onFiltersChange={handleFiltersChange}
        isFetching={itemGroupsQuery.isFetching || query.isFetching || statsQuery.isFetching}
        defaultValues={effectiveFilters}
        warehouses={latestWarehouses ?? []}
        itemGroups={itemGroups}
        defaultItemGroup={defaultItemGroup}
        externalResetSignal={filterResetSignal}
      />

      {sapApiError && (
        <SAPUnavailableBanner
          error={sapApiError}
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
            items={stockItems}
            isLoading={query.isLoading || query.isFetching}
            page={page}
            totalPages={meta?.total_pages ?? 1}
            totalItems={meta?.total_items ?? 0}
            onPageChange={setPage}
            selectedWarehouses={filters.warehouse}
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
