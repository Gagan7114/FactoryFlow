import { useCallback, useMemo, useState } from 'react';

import type { ApiError } from '@/core/api';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { ExcelExportButton } from '@/shared/components/dashboard/ExcelExportButton';

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
import { exportProductionMovementDashboard } from '../utils/exportProductionMovement';

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
  const sapApiError = isSAPError(sapError) ? sapError : null;

  const sortedWarehouseSummary = useMemo(
    () => reportQuery.data?.warehouse_summary ?? [],
    [reportQuery.data],
  );
  const movementItems = useMemo(() => reportQuery.data?.data ?? [], [reportQuery.data]);

  const handleWarehouseSelect = useCallback((warehouse: string) => {
    setFilters((current) => ({ ...current, warehouse }));
  }, []);

  const handleSearchSelect = useCallback((term: string) => {
    const search = term.trim().toUpperCase();
    if (!search) return;
    setFilters((current) => ({ ...current, search }));
  }, []);

  const handleExport = useCallback(() => {
    if (movementItems.length === 0) return;

    exportProductionMovementDashboard({
      items: movementItems,
      filters,
      summary: reportQuery.data?.summary,
      warehouseSummary: sortedWarehouseSummary,
    });
  }, [filters, movementItems, reportQuery.data?.summary, sortedWarehouseSummary]);

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Production Movement"
        description="Inventory entries moving in and out of production warehouses"
      >
        <ExcelExportButton
          onExport={handleExport}
          disabled={movementItems.length === 0 || reportQuery.isLoading || reportQuery.isFetching}
          disabledReason="No production movement rows to export"
        />
      </DashboardHeader>

      <ProductionMovementFilters
        filters={filters}
        filterOptions={optionsQuery.data}
        isFetching={optionsQuery.isFetching || reportQuery.isFetching}
        onFiltersChange={setFilters}
      />

      {sapApiError && (
        <SAPUnavailableBanner error={sapApiError} onRetry={reportQuery.refetch} />
      )}

      {!sapApiError && (
        <>
          <ProductionMovementMetaCards summary={reportQuery.data?.summary} />
          <ProductionMovementWarehouseSummary
            warehouses={sortedWarehouseSummary}
            onWarehouseSelect={handleWarehouseSelect}
          />
          <ProductionMovementTable
            items={movementItems}
            isLoading={reportQuery.isLoading || reportQuery.isFetching}
            onSearchSelect={handleSearchSelect}
          />
        </>
      )}
    </div>
  );
}
