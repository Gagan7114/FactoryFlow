import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/core/auth';

import type { ProductionFlowFilters } from '../types';
import { productionFlowApi } from './production-flow.api';

const PRODUCTION_FLOW_STALE_TIME = 5 * 60 * 1000;

export const PRODUCTION_FLOW_QUERY_KEYS = {
  all: ['production-flow-dashboard'] as const,

  report: (filters: ProductionFlowFilters, companyId?: number | string) =>
    [
      ...PRODUCTION_FLOW_QUERY_KEYS.all,
      'report',
      companyId,
      {
        date_from: filters.date_from,
        date_to: filters.date_to,
        warehouse: filters.warehouse,
        search: filters.search,
        status: filters.status,
        limit: filters.limit,
      },
    ] as const,
};

function sapRetry(failureCount: number, error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  if (status === 401 || status === 403 || status === 404) return false;
  return failureCount < 2;
}

export function useProductionFlowReport(filters: ProductionFlowFilters) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: PRODUCTION_FLOW_QUERY_KEYS.report(filters, currentCompany?.company_id),
    queryFn: () => productionFlowApi.getReport(filters),
    staleTime: PRODUCTION_FLOW_STALE_TIME,
    retry: sapRetry,
  });
}
