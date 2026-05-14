import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api/client';

export interface SAPGRPOLine {
  line_num: number;
  item_code: string;
  item_name: string;
  quantity: number;
  uom: string;
  warehouse_code: string;
  base_type?: number | null;
  base_entry?: number | null;
  base_line?: number | null;
}

export interface SAPGRPO {
  doc_entry: number;
  doc_num: string;
  doc_date?: string | null;
  doc_time?: string | null;
  tax_date?: string | null;
  doc_status: string;
  supplier_code: string;
  supplier_name: string;
  reference: string;
  comments: string;
  branch_id?: number | null;
  line_count: number;
  total_quantity: number;
  lines?: SAPGRPOLine[];
}

export interface SAPProductionOrderComponent {
  line_num: number;
  item_code: string;
  item_name: string;
  planned_qty: number;
  issued_qty: number;
  warehouse?: string | null;
  uom?: string | null;
}

export interface SAPProductionOrder {
  doc_entry: number;
  doc_num: string;
  item_code: string;
  item_name: string;
  planned_qty: number;
  completed_qty: number;
  rejected_qty: number;
  remaining_qty: number;
  start_date?: string | null;
  due_date?: string | null;
  warehouse?: string | null;
  status: string;
  components?: SAPProductionOrderComponent[];
}

export interface JobWorkGateInItem {
  id: number;
  line_num: number;
  item_code: string;
  item_name: string;
  quantity: string;
  uom: string;
  warehouse_code: string;
  base_type?: number | null;
  base_entry?: number | null;
  base_line?: number | null;
}

export interface JobWorkGateInEntry {
  id: number;
  entry_no: string;
  vehicle_entry: number;
  vehicle_entry_no: string;
  vehicle_entry_status: string;
  vehicle: number;
  vehicle_number: string;
  vehicle_type?: string | null;
  transporter_name?: string | null;
  driver: number;
  driver_name: string;
  driver_mobile: string;
  sap_doc_entry?: number | null;
  sap_doc_num: string;
  sap_doc_date?: string | null;
  sap_doc_time?: string | null;
  sap_supplier_code: string;
  sap_supplier_name: string;
  sap_reference: string;
  sap_comments: string;
  sap_branch_id?: number | null;
  production_order_doc_entry?: number | null;
  production_order_doc_num?: string;
  production_item_code?: string;
  production_item_name?: string;
  production_planned_qty?: string | number | null;
  production_completed_qty?: string | number | null;
  production_rejected_qty?: string | number | null;
  production_remaining_qty?: string | number | null;
  production_start_date?: string | null;
  production_due_date?: string | null;
  production_warehouse?: string;
  production_status?: string;
  gate_in_date: string;
  in_time: string;
  security_name?: string;
  remarks?: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | string;
  items: JobWorkGateInItem[];
  created_at: string;
  updated_at: string;
}

export interface JobWorkGateInParams {
  from_date?: string;
  to_date?: string;
  status?: string;
}

export interface SAPGRPOParams {
  search?: string;
  from_date?: string;
  to_date?: string;
  limit?: number;
}

export interface SAPProductionOrderParams {
  search?: string;
  limit?: number;
}

export interface JobWorkGateInCreateRequest {
  vehicle_id: number;
  driver_id: number;
  sap_doc_entry?: number | null;
  production_order_doc_entry?: number | null;
  gate_in_date: string;
  in_time: string;
  security_name?: string;
  remarks?: string;
}

export type JobWorkGateInUpdateRequest = JobWorkGateInCreateRequest;

function buildQuery(params?: Record<string, string | number | undefined>) {
  const queryParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      queryParams.append(key, String(value));
    }
  });

  return queryParams.toString();
}

export const jobWorkApi = {
  async list(params?: JobWorkGateInParams): Promise<JobWorkGateInEntry[]> {
    const query = buildQuery(params);
    const url = query
      ? `${API_ENDPOINTS.GATE_CORE.JOB_WORKS}?${query}`
      : API_ENDPOINTS.GATE_CORE.JOB_WORKS;
    const response = await apiClient.get<JobWorkGateInEntry[]>(url);
    return response.data;
  },

  async get(id: number): Promise<JobWorkGateInEntry> {
    const response = await apiClient.get<JobWorkGateInEntry>(
      API_ENDPOINTS.GATE_CORE.JOB_WORK_BY_ID(id),
    );
    return response.data;
  },

  async getByVehicleEntry(vehicleEntryId: number): Promise<JobWorkGateInEntry> {
    const response = await apiClient.get<JobWorkGateInEntry>(
      API_ENDPOINTS.GATE_CORE.JOB_WORK_BY_VEHICLE_ENTRY(vehicleEntryId),
    );
    return response.data;
  },

  async create(data: JobWorkGateInCreateRequest): Promise<JobWorkGateInEntry> {
    const response = await apiClient.post<JobWorkGateInEntry>(
      API_ENDPOINTS.GATE_CORE.JOB_WORKS,
      data,
    );
    return response.data;
  },

  async update(id: number, data: JobWorkGateInUpdateRequest): Promise<JobWorkGateInEntry> {
    const response = await apiClient.put<JobWorkGateInEntry>(
      API_ENDPOINTS.GATE_CORE.JOB_WORK_BY_ID(id),
      data,
    );
    return response.data;
  },

  async complete(vehicleEntryId: number): Promise<JobWorkGateInEntry> {
    const response = await apiClient.post<JobWorkGateInEntry>(
      API_ENDPOINTS.GATE_CORE.JOB_WORK_COMPLETE_BY_VEHICLE_ENTRY(vehicleEntryId),
    );
    return response.data;
  },

  async sapGrpos(params?: SAPGRPOParams): Promise<SAPGRPO[]> {
    const query = buildQuery(params);
    const url = query
      ? `${API_ENDPOINTS.GATE_CORE.JOB_WORK_SAP_GRPOS}?${query}`
      : API_ENDPOINTS.GATE_CORE.JOB_WORK_SAP_GRPOS;
    const response = await apiClient.get<SAPGRPO[]>(url);
    return response.data;
  },

  async sapGrpo(docEntry: number): Promise<SAPGRPO> {
    const response = await apiClient.get<SAPGRPO>(
      API_ENDPOINTS.GATE_CORE.JOB_WORK_SAP_GRPO_BY_DOC_ENTRY(docEntry),
    );
    return response.data;
  },

  async sapProductionOrders(params?: SAPProductionOrderParams): Promise<SAPProductionOrder[]> {
    const query = buildQuery(params);
    const url = query
      ? `${API_ENDPOINTS.GATE_CORE.JOB_WORK_SAP_PRODUCTION_ORDERS}?${query}`
      : API_ENDPOINTS.GATE_CORE.JOB_WORK_SAP_PRODUCTION_ORDERS;
    const response = await apiClient.get<SAPProductionOrder[]>(url);
    return response.data;
  },

  async sapProductionOrder(docEntry: number): Promise<SAPProductionOrder> {
    const response = await apiClient.get<SAPProductionOrder>(
      API_ENDPOINTS.GATE_CORE.JOB_WORK_SAP_PRODUCTION_ORDER_BY_DOC_ENTRY(docEntry),
    );
    return response.data;
  },
};
