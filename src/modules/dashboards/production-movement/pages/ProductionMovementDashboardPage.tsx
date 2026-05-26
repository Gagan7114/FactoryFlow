import { useCallback, useMemo, useState } from 'react';

import type { ApiError } from '@/core/api';
import { useTransferOverview } from '@/modules/warehouse/api';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';

import { SAPUnavailableBanner } from '../../sap-plan/components/SAPUnavailableBanner';
import {
  useProductionMovementFilterOptions,
  useProductionMovementReport,
  useProductionMovementWarehouseBalanceReports,
} from '../api';
import {
  ProductionMovementFilters,
  ProductionMovementMetaCards,
  ProductionMovementNegativeEntries,
  ProductionMovementRouteFlow,
  ProductionMovementTable,
  ProductionMovementWarehouseSummary,
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
  const [showNegativeEntries, setShowNegativeEntries] = useState(false);

  const optionsQuery = useProductionMovementFilterOptions();
  const reportQuery = useProductionMovementReport(filters);
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
  const routeMovementQuery = useProductionMovementReport(routeMovementFilters);
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
    limit: 1000,
  });

  const sapError =
    reportQuery.error ??
    optionsQuery.error ??
    routeMovementQuery.error ??
    transferOverviewQuery.error;

  const sortedWarehouseSummary = useMemo(
    () => reportQuery.data?.warehouse_summary ?? [],
    [reportQuery.data],
  );

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

  const handleWarehouseSelect = useCallback((warehouse: string) => {
    setFilters((current) => ({ ...current, warehouse }));
  }, []);

  const handleSearchSelect = useCallback((term: string) => {
    const search = term.trim().toUpperCase();
    if (!search) return;
    setFilters((current) => ({ ...current, search }));
  }, []);

  const handleNetQtyClick = useCallback(() => {
    setShowNegativeEntries((current) => !current);
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
        isFetching={optionsQuery.isFetching || reportQuery.isFetching}
        onFiltersChange={setFilters}
      />

      {sapError && isSAPError(sapError) && (
        <SAPUnavailableBanner error={sapError as ApiError} onRetry={reportQuery.refetch} />
      )}

      {!(sapError && isSAPError(sapError)) && (
        <>
          <ProductionMovementMetaCards
            summary={reportQuery.data?.summary}
            isNetQtyDrilldownActive={showNegativeEntries}
            onNetQtyClick={handleNetQtyClick}
          />
          {showNegativeEntries && (
            <ProductionMovementNegativeEntries
              items={reportQuery.data?.data ?? []}
              isLoading={reportQuery.isLoading || reportQuery.isFetching}
              onClose={() => setShowNegativeEntries(false)}
            />
          )}
          <ProductionMovementRouteFlow
            balanceFilters={routeMovementFilters}
            movementItems={routeMovementQuery.data?.data}
            transferLines={transferOverviewQuery.data?.transfers}
            transferRoutes={transferOverviewQuery.data?.routes}
            warehouseBalances={routeWarehouseBalances}
            warehouseSummary={routeMovementQuery.data?.warehouse_summary}
            isLoading={
              routeMovementQuery.isLoading ||
              routeMovementQuery.isFetching ||
              routeBalanceLoading ||
              transferOverviewQuery.isLoading ||
              transferOverviewQuery.isFetching
            }
          />
          <ProductionMovementWarehouseSummary
            warehouses={sortedWarehouseSummary}
            onWarehouseSelect={handleWarehouseSelect}
          />
          <ProductionMovementTable
            items={reportQuery.data?.data ?? []}
            isLoading={reportQuery.isLoading || reportQuery.isFetching}
            onSearchSelect={handleSearchSelect}
          />
        </>
      )}
    </div>
  );
}
