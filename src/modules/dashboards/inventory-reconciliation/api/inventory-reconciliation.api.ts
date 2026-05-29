import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  InventoryReconciliationFilters,
  InventoryReconciliationReportResponse,
} from '../types';

const EP = API_ENDPOINTS.PRODUCTION_EXECUTION;

export const inventoryReconciliationApi = {
  async getReport(
    filters: InventoryReconciliationFilters,
  ): Promise<InventoryReconciliationReportResponse> {
    const params: Record<string, string | number> = {
      date_from: filters.date_from,
      date_to: filters.date_to,
      limit: filters.limit ?? 500,
    };

    if (filters.warehouse) params.warehouse = filters.warehouse;
    if (filters.search) params.search = filters.search;

    const response = await apiClient.get<InventoryReconciliationReportResponse>(
      EP.REPORTS_INVENTORY_RECONCILIATION,
      { params },
    );
    return response.data;
  },
};
