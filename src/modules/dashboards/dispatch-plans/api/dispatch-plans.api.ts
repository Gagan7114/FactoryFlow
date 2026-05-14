import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  DispatchPlan,
  DispatchPlanFilters,
  DispatchPlansResponse,
  DispatchPlanUpdatePayload,
} from '../types';

const EP = API_ENDPOINTS.DISPATCH_PLANS;

export const dispatchPlansApi = {
  async getBills(filters: DispatchPlanFilters): Promise<DispatchPlansResponse> {
    const response = await apiClient.get<DispatchPlansResponse>(EP.BILLS, {
      params: buildParams(filters),
    });
    return response.data;
  },

  async updatePlan(docEntry: number, payload: DispatchPlanUpdatePayload): Promise<DispatchPlan> {
    const requestBody = buildUpdateBody(payload);
    const response = await apiClient.patch<DispatchPlan>(EP.PLAN(docEntry), requestBody);
    return response.data;
  },
};

function buildUpdateBody(payload: DispatchPlanUpdatePayload): DispatchPlanUpdatePayload | FormData {
  if (!payload.bilty_attachment) return payload;

  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined) return;
    if (value === null) {
      formData.append(key, '');
      return;
    }
    formData.append(key, value instanceof File ? value : String(value));
  });
  return formData;
}

function buildParams(filters: DispatchPlanFilters): Record<string, string> {
  const params: Record<string, string> = {
    date_from: filters.date_from,
    date_to: filters.date_to,
  };
  if (filters.booking_status && filters.booking_status !== 'all') {
    params.booking_status = filters.booking_status;
  }
  if (filters.search) params.search = filters.search;
  if (filters.branch) params.branch = filters.branch;
  if (filters.limit) params.limit = String(filters.limit);
  return params;
}
