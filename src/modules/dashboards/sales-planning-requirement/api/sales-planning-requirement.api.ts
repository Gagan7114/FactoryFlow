import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  SalesPlanningRefreshEnvelope,
  SalesPlanningRefreshResponse,
  SalesPlanningRequirementAnalysisResponse,
  SalesPlanningRequirementFilters,
  SalesPlanningRequirementReportResponse,
} from '../types';

const EP = API_ENDPOINTS.SALES_PLANNING_REQUIREMENT;

export const salesPlanningRequirementApi = {
  async getReport(
    filters: SalesPlanningRequirementFilters,
  ): Promise<SalesPlanningRequirementReportResponse> {
    const response = await apiClient.get<SalesPlanningRequirementReportResponse>(EP.REPORT, {
      params: filters,
    });
    return response.data;
  },

  async getStatus(): Promise<SalesPlanningRefreshEnvelope> {
    const response = await apiClient.get<SalesPlanningRefreshEnvelope>(EP.STATUS);
    return response.data;
  },

  async getAnalysis(): Promise<SalesPlanningRequirementAnalysisResponse> {
    const response = await apiClient.get<SalesPlanningRequirementAnalysisResponse>(EP.ANALYSIS);
    return response.data;
  },

  async refresh(): Promise<SalesPlanningRefreshResponse> {
    const response = await apiClient.post<SalesPlanningRefreshResponse>(EP.REFRESH, {});
    return response.data;
  },
};
