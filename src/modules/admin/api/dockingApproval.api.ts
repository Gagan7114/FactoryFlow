import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

export type DockingScanSkipStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface DockingScanSkipRequest {
  id: number;
  sales_dispatch: number;
  entry_no: string;
  vehicle_no: string;
  customer_name: string;
  sap_doc_num: string;
  document_type: string;
  dispatch_status: string;
  reason: string;
  status: DockingScanSkipStatus;
  requested_by: number | null;
  requested_by_name: string;
  requested_at: string;
  reviewed_by: number | null;
  reviewed_by_name: string;
  reviewed_at: string | null;
  review_notes: string;
  created_at: string;
  updated_at: string;
}

export type DockingScanSkipListParams = {
  status?: DockingScanSkipStatus;
  sales_dispatch?: number;
};

export interface DockingScanSkipCreateRequest {
  sales_dispatch: number;
  reason: string;
}

export interface DockingScanSkipReviewRequest {
  notes?: string;
}

function buildQuery(params?: Record<string, string | number | undefined>) {
  const queryParams = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      queryParams.append(key, String(value));
    }
  });
  return queryParams.toString();
}

export const dockingApprovalApi = {
  async list(params?: DockingScanSkipListParams): Promise<DockingScanSkipRequest[]> {
    const query = buildQuery(params);
    const url = query
      ? `${API_ENDPOINTS.DOCKING_ADMIN.SCAN_SKIP_REQUESTS}?${query}`
      : API_ENDPOINTS.DOCKING_ADMIN.SCAN_SKIP_REQUESTS;
    const response = await apiClient.get<DockingScanSkipRequest[]>(url);
    return response.data;
  },

  async byDispatch(entryId: number): Promise<DockingScanSkipRequest | null> {
    const response = await apiClient.get<DockingScanSkipRequest | null>(
      API_ENDPOINTS.DOCKING_ADMIN.SCAN_SKIP_REQUEST_BY_DISPATCH(entryId),
    );
    return response.data ?? null;
  },

  async create(data: DockingScanSkipCreateRequest): Promise<DockingScanSkipRequest> {
    const response = await apiClient.post<DockingScanSkipRequest>(
      API_ENDPOINTS.DOCKING_ADMIN.SCAN_SKIP_REQUESTS,
      data,
    );
    return response.data;
  },

  async approve(
    id: number,
    data: DockingScanSkipReviewRequest = {},
  ): Promise<DockingScanSkipRequest> {
    const response = await apiClient.post<DockingScanSkipRequest>(
      API_ENDPOINTS.DOCKING_ADMIN.SCAN_SKIP_REQUEST_APPROVE(id),
      data,
    );
    return response.data;
  },

  async reject(id: number, data: DockingScanSkipReviewRequest): Promise<DockingScanSkipRequest> {
    const response = await apiClient.post<DockingScanSkipRequest>(
      API_ENDPOINTS.DOCKING_ADMIN.SCAN_SKIP_REQUEST_REJECT(id),
      data,
    );
    return response.data;
  },
};
