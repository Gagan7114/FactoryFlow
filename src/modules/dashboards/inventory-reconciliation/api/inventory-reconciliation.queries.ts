import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/core/auth';

import type { InventoryReconciliationFilters } from '../types';
import { inventoryReconciliationApi } from './inventory-reconciliation.api';

const INVENTORY_RECONCILIATION_STALE_TIME = 5 * 60 * 1000;

export const INVENTORY_RECONCILIATION_QUERY_KEYS = {
  all: ['inventory-reconciliation-dashboard'] as const,

  report: (filters: InventoryReconciliationFilters, companyId?: number | string) =>
    [
      ...INVENTORY_RECONCILIATION_QUERY_KEYS.all,
      'report',
      companyId,
      {
        date_from: filters.date_from,
        date_to: filters.date_to,
        warehouse: filters.warehouse,
        search: filters.search,
        limit: filters.limit,
      },
    ] as const,
};

function sapRetry(failureCount: number, error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  if (status === 401 || status === 403 || status === 404) return false;
  return failureCount < 2;
}

export function useInventoryReconciliationReport(filters: InventoryReconciliationFilters) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: INVENTORY_RECONCILIATION_QUERY_KEYS.report(filters, currentCompany?.company_id),
    queryFn: () => inventoryReconciliationApi.getReport(filters),
    staleTime: INVENTORY_RECONCILIATION_STALE_TIME,
    retry: sapRetry,
  });
}
