import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type { BSTGateOutEntry, BSTGateOutItem } from '../bstOut/bstOut.api';

export interface BSTGateReturnEntry {
  id: number;
  entry_no: string;
  company: number;
  vehicle_entry: number;
  vehicle_entry_no: string;
  vehicle_entry_status: string;
  bst_gate_out: number;
  bst_gate_out_entry_no: string;
  bst_gate_out_vehicle_entry: number;
  bst_gate_out_date?: string | null;
  bst_gate_out_time?: string | null;
  vehicle: number;
  vehicle_number: string;
  vehicle_type?: string | null;
  transporter_name?: string | null;
  driver: number;
  driver_name: string;
  driver_mobile: string;
  sap_doc_entry: number;
  sap_doc_num: string;
  sap_doc_date?: string | null;
  sap_from_warehouse: string;
  sap_to_warehouse: string;
  sap_reference: string;
  sap_comments: string;
  gate_in_date: string;
  in_time: string;
  sap_return_doc_num?: string;
  sap_return_doc_date?: string | null;
  sap_return_reference?: string;
  security_name?: string;
  remarks?: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | string;
  items: BSTGateOutItem[];
  created_at: string;
  updated_at: string;
}

export interface BSTGateReturnParams {
  from_date?: string;
  to_date?: string;
  status?: string;
}

export interface BSTGateReturnCreateRequest {
  bst_gate_out_id: number;
  gate_in_date: string;
  in_time: string;
  sap_return_doc_num?: string;
  sap_return_doc_date?: string | null;
  sap_return_reference?: string;
  security_name?: string;
  remarks?: string;
}

export type BSTGateReturnUpdateRequest = BSTGateReturnCreateRequest;

export interface BSTGateReturnEligibleOutParams {
  search?: string;
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

export const bstReturnApi = {
  async list(params?: BSTGateReturnParams): Promise<BSTGateReturnEntry[]> {
    const query = buildQuery(params);
    const url = query
      ? `${API_ENDPOINTS.GATE_CORE.BST_RETURNS}?${query}`
      : API_ENDPOINTS.GATE_CORE.BST_RETURNS;
    const response = await apiClient.get<BSTGateReturnEntry[]>(url);
    return response.data;
  },

  async get(id: number): Promise<BSTGateReturnEntry> {
    const response = await apiClient.get<BSTGateReturnEntry>(
      API_ENDPOINTS.GATE_CORE.BST_RETURN_BY_ID(id),
    );
    return response.data;
  },

  async getByVehicleEntry(vehicleEntryId: number): Promise<BSTGateReturnEntry> {
    const response = await apiClient.get<BSTGateReturnEntry>(
      API_ENDPOINTS.GATE_CORE.BST_RETURN_BY_VEHICLE_ENTRY(vehicleEntryId),
    );
    return response.data;
  },

  async create(data: BSTGateReturnCreateRequest): Promise<BSTGateReturnEntry> {
    const response = await apiClient.post<BSTGateReturnEntry>(
      API_ENDPOINTS.GATE_CORE.BST_RETURNS,
      data,
    );
    return response.data;
  },

  async update(id: number, data: BSTGateReturnUpdateRequest): Promise<BSTGateReturnEntry> {
    const response = await apiClient.put<BSTGateReturnEntry>(
      API_ENDPOINTS.GATE_CORE.BST_RETURN_BY_ID(id),
      data,
    );
    return response.data;
  },

  async complete(vehicleEntryId: number): Promise<BSTGateReturnEntry> {
    const response = await apiClient.post<BSTGateReturnEntry>(
      API_ENDPOINTS.GATE_CORE.BST_RETURN_COMPLETE_BY_VEHICLE_ENTRY(vehicleEntryId),
    );
    return response.data;
  },

  async eligibleOuts(params?: BSTGateReturnEligibleOutParams): Promise<BSTGateOutEntry[]> {
    const query = buildQuery(params);
    const url = query
      ? `${API_ENDPOINTS.GATE_CORE.BST_RETURN_ELIGIBLE_OUTS}?${query}`
      : API_ENDPOINTS.GATE_CORE.BST_RETURN_ELIGIBLE_OUTS;
    const response = await apiClient.get<BSTGateOutEntry[]>(url);
    return response.data;
  },
};
