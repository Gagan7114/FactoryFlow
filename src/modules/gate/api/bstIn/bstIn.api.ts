import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type { BSTGateOutEntry } from '../bstOut/bstOut.api';

export interface BSTGateInItem {
  id: number;
  line_num: number;
  item_code: string;
  item_name: string;
  quantity: string;
  actual_quantity: string;
  receiving_quantity: string;
  uom: string;
  from_warehouse: string;
  to_warehouse: string;
}

export interface BSTGateInItemRequest {
  line_num: number;
  receiving_quantity: number;
}

export interface BSTGateInEntry {
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
  security_name?: string;
  remarks?: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | string;
  items: BSTGateInItem[];
  created_at: string;
  updated_at: string;
}

export interface BSTGateInParams {
  from_date?: string;
  to_date?: string;
  status?: string;
}

export interface BSTGateInCreateRequest {
  bst_gate_out_id: number;
  gate_in_date: string;
  in_time: string;
  items?: BSTGateInItemRequest[];
  security_name?: string;
  remarks?: string;
}

export type BSTGateInUpdateRequest = BSTGateInCreateRequest;

export interface BSTGateInEligibleOutParams {
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

export const bstInApi = {
  async list(params?: BSTGateInParams): Promise<BSTGateInEntry[]> {
    const query = buildQuery(params);
    const url = query
      ? `${API_ENDPOINTS.GATE_CORE.BST_INS}?${query}`
      : API_ENDPOINTS.GATE_CORE.BST_INS;
    const response = await apiClient.get<BSTGateInEntry[]>(url);
    return response.data;
  },

  async get(id: number): Promise<BSTGateInEntry> {
    const response = await apiClient.get<BSTGateInEntry>(
      API_ENDPOINTS.GATE_CORE.BST_IN_BY_ID(id),
    );
    return response.data;
  },

  async getByVehicleEntry(vehicleEntryId: number): Promise<BSTGateInEntry> {
    const response = await apiClient.get<BSTGateInEntry>(
      API_ENDPOINTS.GATE_CORE.BST_IN_BY_VEHICLE_ENTRY(vehicleEntryId),
    );
    return response.data;
  },

  async create(data: BSTGateInCreateRequest): Promise<BSTGateInEntry> {
    const response = await apiClient.post<BSTGateInEntry>(
      API_ENDPOINTS.GATE_CORE.BST_INS,
      data,
    );
    return response.data;
  },

  async update(id: number, data: BSTGateInUpdateRequest): Promise<BSTGateInEntry> {
    const response = await apiClient.put<BSTGateInEntry>(
      API_ENDPOINTS.GATE_CORE.BST_IN_BY_ID(id),
      data,
    );
    return response.data;
  },

  async complete(vehicleEntryId: number): Promise<BSTGateInEntry> {
    const response = await apiClient.post<BSTGateInEntry>(
      API_ENDPOINTS.GATE_CORE.BST_IN_COMPLETE_BY_VEHICLE_ENTRY(vehicleEntryId),
    );
    return response.data;
  },

  async eligibleOuts(params?: BSTGateInEligibleOutParams): Promise<BSTGateOutEntry[]> {
    const query = buildQuery(params);
    const url = query
      ? `${API_ENDPOINTS.GATE_CORE.BST_IN_ELIGIBLE_OUTS}?${query}`
      : API_ENDPOINTS.GATE_CORE.BST_IN_ELIGIBLE_OUTS;
    const response = await apiClient.get<BSTGateOutEntry[]>(url);
    return response.data;
  },
};
