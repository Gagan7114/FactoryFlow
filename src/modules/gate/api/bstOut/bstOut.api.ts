import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

export interface SAPStockTransferLine {
  line_num: number;
  item_code: string;
  item_name: string;
  quantity: number;
  uom: string;
  from_warehouse: string;
  to_warehouse: string;
}

export interface SAPStockTransfer {
  doc_entry: number;
  doc_num: string;
  doc_date?: string | null;
  tax_date?: string | null;
  doc_status: string;
  from_warehouse: string;
  to_warehouse: string;
  comments: string;
  reference: string;
  branch_id?: number | null;
  line_count: number;
  total_quantity: number;
  lines?: SAPStockTransferLine[];
}

export interface BSTGateOutItem {
  id: number;
  line_num: number;
  item_code: string;
  item_name: string;
  quantity: string;
  actual_quantity: string;
  uom: string;
  from_warehouse: string;
  to_warehouse: string;
}

export interface BSTGateOutEntry {
  id: number;
  entry_no: string;
  vehicle_entry: number;
  vehicle_entry_no: string;
  vehicle_entry_status: string;
  empty_vehicle_gate_in: number;
  empty_vehicle_gate_in_entry_no: string;
  empty_vehicle_gate_in_date?: string | null;
  empty_vehicle_in_time?: string | null;
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
  gate_out_date: string;
  out_time: string;
  security_name?: string;
  remarks?: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | string;
  cancel_reason?: string;
  cancelled_at?: string | null;
  cancelled_by?: number | null;
  items: BSTGateOutItem[];
  created_at: string;
  updated_at: string;
}

export interface BSTGateOutParams {
  from_date?: string;
  to_date?: string;
  status?: string;
}

export interface SAPStockTransferParams {
  search?: string;
  from_date?: string;
  to_date?: string;
  limit?: number;
}

export interface BSTGateOutCreateRequest {
  empty_vehicle_gate_in_id: number;
  sap_doc_entry: number;
  gate_out_date: string;
  out_time: string;
  security_name?: string;
  remarks?: string;
}

export type BSTGateOutUpdateRequest = BSTGateOutCreateRequest;

export interface BSTGateOutCancelRequest {
  cancel_reason: string;
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

export const bstOutApi = {
  async list(params?: BSTGateOutParams): Promise<BSTGateOutEntry[]> {
    const query = buildQuery(params);
    const url = query
      ? `${API_ENDPOINTS.GATE_CORE.BST_OUTS}?${query}`
      : API_ENDPOINTS.GATE_CORE.BST_OUTS;
    const response = await apiClient.get<BSTGateOutEntry[]>(url);
    return response.data;
  },

  async get(id: number): Promise<BSTGateOutEntry> {
    const response = await apiClient.get<BSTGateOutEntry>(
      API_ENDPOINTS.GATE_CORE.BST_OUT_BY_ID(id),
    );
    return response.data;
  },

  async getByVehicleEntry(vehicleEntryId: number): Promise<BSTGateOutEntry> {
    const response = await apiClient.get<BSTGateOutEntry>(
      API_ENDPOINTS.GATE_CORE.BST_OUT_BY_VEHICLE_ENTRY(vehicleEntryId),
    );
    return response.data;
  },

  async create(data: BSTGateOutCreateRequest): Promise<BSTGateOutEntry> {
    const response = await apiClient.post<BSTGateOutEntry>(
      API_ENDPOINTS.GATE_CORE.BST_OUTS,
      data,
    );
    return response.data;
  },

  async update(id: number, data: BSTGateOutUpdateRequest): Promise<BSTGateOutEntry> {
    const response = await apiClient.put<BSTGateOutEntry>(
      API_ENDPOINTS.GATE_CORE.BST_OUT_BY_ID(id),
      data,
    );
    return response.data;
  },

  async cancel(id: number, data: BSTGateOutCancelRequest): Promise<BSTGateOutEntry> {
    const response = await apiClient.post<BSTGateOutEntry>(
      API_ENDPOINTS.GATE_CORE.BST_OUT_CANCEL_BY_ID(id),
      data,
    );
    return response.data;
  },

  async complete(vehicleEntryId: number): Promise<BSTGateOutEntry> {
    const response = await apiClient.post<BSTGateOutEntry>(
      API_ENDPOINTS.GATE_CORE.BST_OUT_COMPLETE_BY_VEHICLE_ENTRY(vehicleEntryId),
    );
    return response.data;
  },

  async sapTransfers(params?: SAPStockTransferParams): Promise<SAPStockTransfer[]> {
    const query = buildQuery(params);
    const url = query
      ? `${API_ENDPOINTS.GATE_CORE.BST_OUT_SAP_TRANSFERS}?${query}`
      : API_ENDPOINTS.GATE_CORE.BST_OUT_SAP_TRANSFERS;
    const response = await apiClient.get<SAPStockTransfer[]>(url);
    return response.data;
  },

  async sapTransfer(docEntry: number): Promise<SAPStockTransfer> {
    const response = await apiClient.get<SAPStockTransfer>(
      API_ENDPOINTS.GATE_CORE.BST_OUT_SAP_TRANSFER_BY_DOC_ENTRY(docEntry),
    );
    return response.data;
  },
};
