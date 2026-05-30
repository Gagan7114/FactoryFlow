import { useCallback, useMemo, useState } from 'react';

import type { ApiError } from '@/core/api';
import { useTransferOverview } from '@/modules/warehouse/api';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';

import { SAPUnavailableBanner } from '../../sap-plan/components/SAPUnavailableBanner';
import {
  useProductionMovementFilterOptions,
  useProductionMovementWarehouseBalanceReports,
} from '../api';
import {
  ProductionMovementFilters,
  ProductionMovementMetaCards,
  ProductionMovementRouteFlow,
  ProductionMovementTable,
} from '../components';
import { getDefaultProductionMovementFilters, PRODUCTION_FLOW_ROUTES } from '../constants';
import type { ProductionMovementFilters as ProductionMovementFiltersType } from '../types';

function isSAPError(err: unknown): err is ApiError {
  const status = (err as ApiError)?.status;
  return status === 502 || status === 503;
}

export default function ProductionMovementDashboardPage() {
  const [filters, setFilters] = useState<ProductionMovementFiltersType>(() =>
    getDefaultProductionMovementFilters(),
  );

  const optionsQuery = useProductionMovementFilterOptions();
  const routeMovementFilters = useMemo<ProductionMovementFiltersType>(
    () => ({
      date_from: filters.date_from,
      date_to: filters.date_to,
      direction: 'all',
      production_only: false,
      limit: 1000,
    }),
    [filters.date_from, filters.date_to],
  );
  const routeBalanceWarehouses = useMemo(
    () => Array.from(new Set(PRODUCTION_FLOW_ROUTES.flatMap((route) => route.toCodes))),
    [],
  );
  const routeBalanceQueries = useProductionMovementWarehouseBalanceReports(
    routeMovementFilters,
    routeBalanceWarehouses,
  );
  const transferOverviewQuery = useTransferOverview({
    from_date: filters.date_from,
    to_date: filters.date_to,
    from_warehouse: filters.from_warehouse,
    to_warehouse: filters.to_warehouse,
    limit: filters.limit ?? 500,
  });

  const sapError = optionsQuery.error ?? transferOverviewQuery.error;

  const routeWarehouseBalances = useMemo(() => {
    return routeBalanceQueries.reduce<Record<string, { openingQty: number; closingQty: number }>>(
      (balances, query, index) => {
        const warehouse = routeBalanceWarehouses[index];
        const summary = query.data?.summary;
        if (warehouse && summary) {
          balances[warehouse] = {
            openingQty: summary.opening_qty,
            closingQty: summary.closing_qty,
          };
        }
        return balances;
      },
      {},
    );
  }, [routeBalanceQueries, routeBalanceWarehouses]);

  const routeBalanceLoading = routeBalanceQueries.some(
    (query) => query.isLoading || query.isFetching,
  );

  const handleSearchSelect = useCallback((term: string) => {
    const search = term.trim().toUpperCase();
    if (!search) return;
    setFilters((current) => ({ ...current, search }));
  }, []);

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Production Movement"
        description="Inventory entries moving in and out of production warehouses"
      />

      <ProductionMovementFilters
        filters={filters}
        filterOptions={optionsQuery.data}
        isFetching={optionsQuery.isFetching || transferOverviewQuery.isFetching}
        onFiltersChange={setFilters}
      />

      {sapError && isSAPError(sapError) && (
        <SAPUnavailableBanner
          error={sapError as ApiError}
          onRetry={transferOverviewQuery.refetch}
        />
      )}

      {!(sapError && isSAPError(sapError)) && (
        <>
          <ProductionMovementMetaCards
            direction={filters.direction ?? 'all'}
            search={filters.search}
            transferLines={transferOverviewQuery.data?.transfers ?? []}
          />
          <ProductionMovementRouteFlow
            balanceFilters={routeMovementFilters}
            transferLines={transferOverviewQuery.data?.transfers}
            transferRoutes={transferOverviewQuery.data?.routes}
            warehouseBalances={routeWarehouseBalances}
            isLoading={
              routeBalanceLoading ||
              transferOverviewQuery.isLoading ||
              transferOverviewQuery.isFetching
            }
          />
          <ProductionMovementTable
            direction={filters.direction ?? 'all'}
            search={filters.search}
            transferLines={transferOverviewQuery.data?.transfers ?? []}
            isLoading={transferOverviewQuery.isLoading || transferOverviewQuery.isFetching}
            onSearchSelect={handleSearchSelect}
          />
        </>
      )}
    </div>
  );
}
