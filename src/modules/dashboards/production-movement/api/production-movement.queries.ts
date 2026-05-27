import { useQueries, useQuery } from '@tanstack/react-query';

import { useAuth } from '@/core/auth';

import { PRODUCTION_MOVEMENT_STALE_TIME } from '../constants';
import type { ProductionMovementFilters } from '../types';
import { productionMovementApi } from './production-movement.api';

export const PRODUCTION_MOVEMENT_QUERY_KEYS = {
  all: ['production-movement-dashboard'] as const,

  filterOptions: (companyId?: number | string) =>
    [...PRODUCTION_MOVEMENT_QUERY_KEYS.all, 'filter-options', companyId] as const,

  report: (filters: ProductionMovementFilters, companyId?: number | string) =>
    [
      ...PRODUCTION_MOVEMENT_QUERY_KEYS.all,
      'report',
      companyId,
      {
        date_from: filters.date_from,
        date_to: filters.date_to,
        warehouse: filters.warehouse,
        from_warehouse: filters.from_warehouse,
        to_warehouse: filters.to_warehouse,
        direction: filters.direction,
        transaction_type: filters.transaction_type,
        search: filters.search,
        production_only: filters.production_only,
        limit: filters.limit,
      },
    ] as const,
};

function sapRetry(failureCount: number, error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  if (status === 401 || status === 403 || status === 404) return false;
  return failureCount < 2;
}

export function useProductionMovementFilterOptions() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: PRODUCTION_MOVEMENT_QUERY_KEYS.filterOptions(currentCompany?.company_id),
    queryFn: () => productionMovementApi.getFilterOptions(),
    staleTime: PRODUCTION_MOVEMENT_STALE_TIME,
    retry: sapRetry,
  });
}

export function useProductionMovementReport(filters: ProductionMovementFilters) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: PRODUCTION_MOVEMENT_QUERY_KEYS.report(filters, currentCompany?.company_id),
    queryFn: () => productionMovementApi.getReport(filters),
    staleTime: PRODUCTION_MOVEMENT_STALE_TIME,
    retry: sapRetry,
  });
}

export function useProductionMovementWarehouseBalanceReports(
  filters: ProductionMovementFilters,
  warehouses: string[],
) {
  const { currentCompany } = useAuth();

  return useQueries({
    queries: warehouses.map((warehouse) => {
      const warehouseFilters = { ...filters, warehouse };

      return {
        queryKey: PRODUCTION_MOVEMENT_QUERY_KEYS.report(
          warehouseFilters,
          currentCompany?.company_id,
        ),
        queryFn: () => productionMovementApi.getReport(warehouseFilters),
        staleTime: PRODUCTION_MOVEMENT_STALE_TIME,
        retry: sapRetry,
      };
    }),
  });
}

interface ProductionMovementSkuBalanceRequest {
  key: string;
  skuKey: string;
  warehouse: string;
  search: string;
}

export function useProductionMovementSkuBalanceReports(
  filters: ProductionMovementFilters,
  requests: ProductionMovementSkuBalanceRequest[],
  enabled = true,
) {
  const { currentCompany } = useAuth();

  return useQueries({
    queries: requests.map((request) => {
      const skuFilters = {
        ...filters,
        warehouse: request.warehouse,
        search: request.search,
        direction: 'all' as const,
        production_only: false,
        limit: 1,
      };

      return {
        queryKey: [
          ...PRODUCTION_MOVEMENT_QUERY_KEYS.report(skuFilters, currentCompany?.company_id),
          request.key,
        ],
        queryFn: () => productionMovementApi.getReport(skuFilters),
        enabled,
        staleTime: PRODUCTION_MOVEMENT_STALE_TIME,
        retry: sapRetry,
      };
    }),
  });
}
