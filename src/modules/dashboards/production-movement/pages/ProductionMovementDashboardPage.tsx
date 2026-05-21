import { useCallback, useMemo, useState } from 'react';

import type { ApiError } from '@/core/api';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';

import { SAPUnavailableBanner } from '../../sap-plan/components/SAPUnavailableBanner';
import { useProductionMovementFilterOptions, useProductionMovementReport } from '../api';
import {
  ProductionMovementFilters,
  ProductionMovementMetaCards,
  ProductionMovementTable,
  ProductionMovementWarehouseSummary,
} from '../components';
import { getDefaultProductionMovementFilters } from '../constants';
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
  const reportQuery = useProductionMovementReport(filters);

  const sapError = reportQuery.error ?? optionsQuery.error;

  const sortedWarehouseSummary = useMemo(
    () => reportQuery.data?.warehouse_summary ?? [],
    [reportQuery.data],
  );

  const handleWarehouseSelect = useCallback((warehouse: string) => {
    setFilters((current) => ({ ...current, warehouse }));
  }, []);

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
        isFetching={optionsQuery.isFetching || reportQuery.isFetching}
        onFiltersChange={setFilters}
      />

      {sapError && isSAPError(sapError) && (
        <SAPUnavailableBanner error={sapError as ApiError} onRetry={reportQuery.refetch} />
      )}

      {!(sapError && isSAPError(sapError)) && (
        <>
          <ProductionMovementMetaCards summary={reportQuery.data?.summary} />
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
