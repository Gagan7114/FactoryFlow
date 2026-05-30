import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type { ProductionFlowFilters, ProductionFlowReportResponse } from '../types';

const EP = API_ENDPOINTS.PRODUCTION_EXECUTION;

export const productionFlowApi = {
  async getReport(filters: ProductionFlowFilters): Promise<ProductionFlowReportResponse> {
    const params: Record<string, string | number> = {
      date_from: filters.date_from,
      date_to: filters.date_to,
      limit: filters.limit ?? 500,
      status: filters.status ?? 'all',
    };

    if (filters.warehouse) params.warehouse = filters.warehouse;
    if (filters.search) params.search = filters.search;

    const response = await apiClient.get<ProductionFlowReportResponse>(EP.REPORTS_PRODUCTION_FLOW, {
      params,
    });
    return response.data;
  },
};
