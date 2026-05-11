import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  InventoryAgeFilterOptions,
  InventoryAgeFilters,
  InventoryAgeResponse,
} from '../types';

const EP = API_ENDPOINTS.INVENTORY_AGE_DASHBOARD;

function normalizeSearchParam(value?: string): string | undefined {
  const search = value?.trim();
  return search ? search.toUpperCase() : undefined;
}

export const inventoryAgeApi = {
  async getFilterOptions(): Promise<InventoryAgeFilterOptions> {
    const response = await apiClient.get<InventoryAgeFilterOptions>(EP.FILTER_OPTIONS);
    return response.data;
  },

  async getReport(filters: InventoryAgeFilters): Promise<InventoryAgeResponse> {
    const response = await apiClient.get<InventoryAgeResponse>(EP.REPORT, {
      params: buildParams(filters),
    });
    return response.data;
  },
};

function buildParams(filters: InventoryAgeFilters): Record<string, string> {
  const p: Record<string, string> = {};
  if (filters.item_group) p.item_group = filters.item_group;
  const search = normalizeSearchParam(filters.search);
  if (search) p.search = search;
  if (filters.min_age !== undefined && filters.min_age > 0)
    p.min_age = String(filters.min_age);
  return p;
}
