import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  ProductionMovementFilterOptions,
  ProductionMovementFilters,
  ProductionMovementReportResponse,
} from '../types';

const EP = API_ENDPOINTS.PRODUCTION_EXECUTION;

export const productionMovementApi = {
  async getFilterOptions(): Promise<ProductionMovementFilterOptions> {
    const response = await apiClient.get<ProductionMovementFilterOptions>(
      EP.REPORTS_PRODUCTION_MOVEMENT_FILTER_OPTIONS,
    );
    return response.data;
  },

  async getReport(
    filters: ProductionMovementFilters,
  ): Promise<ProductionMovementReportResponse> {
    const params: Record<string, string | number | boolean> = {
      date_from: filters.date_from,
      date_to: filters.date_to,
      direction: filters.direction ?? 'all',
      production_only: filters.production_only ?? true,
      limit: filters.limit ?? 500,
    };

    if (filters.warehouse) params.warehouse = filters.warehouse;
    if (filters.transaction_type) params.transaction_type = filters.transaction_type;
    if (filters.search) params.search = filters.search;

    const response = await apiClient.get<ProductionMovementReportResponse>(
      EP.REPORTS_PRODUCTION_MOVEMENT,
      { params },
    );
    return response.data;
  },
};
