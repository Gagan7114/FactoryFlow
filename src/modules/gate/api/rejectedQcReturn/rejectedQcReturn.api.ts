import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

export interface RejectedQCReturnCreateRequest {
  vehicle_id: number;
  driver_id: number;
  gate_out_date: string;
  out_time?: string | null;
  challan_no?: string;
  eway_bill_no?: string;
  manual_sap_reference?: string;
  security_name?: string;
  gross_weight: number;
  tare_weight: number;
  weighbridge_slip_no?: string;
  first_weighment_time?: string;
  second_weighment_time?: string;
  gatepass_documents: string[];
  remarks?: string;
  inspection_ids: number[];
}

export interface RejectedQCReturnParams {
  from_date?: string;
  to_date?: string;
}

export interface RejectedQCReturnEntryResponse {
  id: number;
  entry_no: string;
  vehicle: number;
  vehicle_number: string;
  driver: number;
  driver_name: string;
  gate_out_date: string;
  out_time?: string | null;
  gross_weight?: string | null;
  tare_weight?: string | null;
  net_weight?: string | null;
  weighbridge_slip_no?: string;
  first_weighment_time?: string | null;
  second_weighment_time?: string | null;
  gatepass_documents?: string[];
  remarks?: string;
  status: 'DRAFT' | 'COMPLETED' | 'CANCELLED';
  items?: Array<{
    id: number;
    inspection_id: number;
    gate_entry_no: string;
    report_no: string;
    internal_lot_no: string;
    item_name: string;
    supplier_name: string;
    quantity: string;
    uom: string;
  }>;
  created_at: string;
  updated_at: string;
}

function buildQuery(params?: RejectedQCReturnParams) {
  const queryParams = new URLSearchParams();
  if (params?.from_date) queryParams.append('from_date', params.from_date);
  if (params?.to_date) queryParams.append('to_date', params.to_date);
  return queryParams.toString();
}

export const rejectedQCReturnApi = {
  async list(params?: RejectedQCReturnParams): Promise<RejectedQCReturnEntryResponse[]> {
    const query = buildQuery(params);
    const url = query
      ? `${API_ENDPOINTS.GATE_CORE.REJECTED_QC_RETURNS}?${query}`
      : API_ENDPOINTS.GATE_CORE.REJECTED_QC_RETURNS;
    const response = await apiClient.get<RejectedQCReturnEntryResponse[]>(url);
    return response.data;
  },

  async create(data: RejectedQCReturnCreateRequest): Promise<RejectedQCReturnEntryResponse> {
    const response = await apiClient.post<RejectedQCReturnEntryResponse>(
      API_ENDPOINTS.GATE_CORE.REJECTED_QC_RETURNS,
      data,
    );
    return response.data;
  },
};
