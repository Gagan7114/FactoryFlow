import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useAuth } from '@/core/auth';

import { SALES_PLANNING_REQUIREMENT_STALE_TIME } from '../constants';
import type { SalesPlanningRequirementFilters } from '../types';
import { salesPlanningRequirementApi } from './sales-planning-requirement.api';

export const SALES_PLANNING_REQUIREMENT_QUERY_KEYS = {
  all: ['sales-planning-requirement'] as const,
  report: (filters: SalesPlanningRequirementFilters, companyId?: number | string) =>
    [...SALES_PLANNING_REQUIREMENT_QUERY_KEYS.all, 'report', companyId, filters] as const,
  status: (companyId?: number | string) =>
    [...SALES_PLANNING_REQUIREMENT_QUERY_KEYS.all, 'status', companyId] as const,
  analysis: (companyId?: number | string) =>
    [...SALES_PLANNING_REQUIREMENT_QUERY_KEYS.all, 'analysis', companyId] as const,
};

function sapRetry(failureCount: number, error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  if (status === 400 || status === 401 || status === 403 || status === 404 || status === 409) {
    return false;
  }
  return failureCount < 2;
}

export function useSalesPlanningRequirementReport(
  filters: SalesPlanningRequirementFilters,
  enabled = true,
) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: SALES_PLANNING_REQUIREMENT_QUERY_KEYS.report(
      filters,
      currentCompany?.company_id,
    ),
    queryFn: () => salesPlanningRequirementApi.getReport(filters),
    staleTime: SALES_PLANNING_REQUIREMENT_STALE_TIME,
    retry: sapRetry,
    enabled,
  });
}

export function useSalesPlanningRequirementStatus() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: SALES_PLANNING_REQUIREMENT_QUERY_KEYS.status(currentCompany?.company_id),
    queryFn: () => salesPlanningRequirementApi.getStatus(),
    staleTime: SALES_PLANNING_REQUIREMENT_STALE_TIME,
    retry: sapRetry,
  });
}

export function useSalesPlanningRequirementAnalysis() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: SALES_PLANNING_REQUIREMENT_QUERY_KEYS.analysis(currentCompany?.company_id),
    queryFn: () => salesPlanningRequirementApi.getAnalysis(),
    staleTime: SALES_PLANNING_REQUIREMENT_STALE_TIME,
    retry: sapRetry,
  });
}

export function useRefreshSalesPlanningRequirement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => salesPlanningRequirementApi.refresh(),
    onSuccess: async (result) => {
      toast.success(`Sales planning refreshed: ${result.refresh.rows_loaded} rows loaded`);
      await queryClient.invalidateQueries({
        queryKey: SALES_PLANNING_REQUIREMENT_QUERY_KEYS.all,
      });
    },
  });
}
