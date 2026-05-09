import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

export type SalesDispatchGateOutStatus = 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'REJECTED';
export type DispatchPhysicalUOM = 'PCS' | 'BOX';

export interface SalesDispatchGateOutLine {
  id: number;
  line_num: number;
  item_code: string;
  item_name: string;
  order_qty?: string | null;
  dispatched_qty?: string | null;
  uom: string;
  warehouse: string;
}

export interface SalesDispatchGateOut {
  id: number;
  entry_no: string;
  dispatch_plan?: number | null;
  dispatch_plan_id?: number | null;
  vehicle_entry?: number | null;
  vehicle_entry_no?: string | null;
  vehicle_entry_status?: string | null;
  vehicle: number;
  vehicle_number: string;
  vehicle_type?: string | null;
  transporter_name?: string | null;
  driver: number;
  driver_name: string;
  driver_mobile?: string;
  sap_invoice_doc_entry: number;
  sap_invoice_doc_num: string;
  customer_code?: string;
  customer_name?: string;
  ship_to_address?: string;
  invoice_amount?: string | null;
  sap_weight?: string | null;
  gate_out_date: string;
  out_time: string;
  security_name?: string;
  seal_no?: string;
  pgi_document_no?: string;
  goods_issue_posted: boolean;
  invoice_checked: boolean;
  delivery_note_checked: boolean;
  eway_bill_checked: boolean;
  lr_checked: boolean;
  physical_quantity?: string | null;
  physical_uom?: DispatchPhysicalUOM | '';
  gross_weight?: string | null;
  tare_weight?: string | null;
  net_weight?: string | null;
  weight_variance?: string | null;
  weighbridge_slip_no?: string;
  first_weighment_time?: string | null;
  second_weighment_time?: string | null;
  dock_photo?: string | null;
  gatepass_document?: string | null;
  attachment_notes?: string;
  remarks?: string;
  gatepass_no?: string;
  gatepass_code?: string;
  gate_printed: boolean;
  print_commit: boolean;
  printed_at?: string | null;
  committed_at?: string | null;
  qr_payload?: string;
  status: SalesDispatchGateOutStatus;
  cancel_reason?: string;
  cancelled_at?: string | null;
  rejected_reason?: string;
  rejected_at?: string | null;
  items: SalesDispatchGateOutLine[];
  created_at: string;
  updated_at: string;
}

export interface SalesDispatchGateOutParams {
  from_date?: string;
  to_date?: string;
  status?: string;
  search?: string;
}

export interface SalesDispatchGateOutCreateRequest {
  sap_invoice_doc_entry: number;
  sap_invoice_doc_num?: string;
  vehicle_id: number;
  driver_id: number;
  linked_vehicle_entry_id?: number | null;
  customer_code?: string;
  customer_name?: string;
  ship_to_address?: string;
  invoice_amount?: number | string | null;
  sap_weight?: number | string | null;
  gate_out_date: string;
  out_time: string;
  security_name?: string;
  seal_no?: string;
  pgi_document_no?: string;
  goods_issue_posted?: boolean;
  invoice_checked?: boolean;
  delivery_note_checked?: boolean;
  eway_bill_checked?: boolean;
  lr_checked?: boolean;
  physical_quantity: number | string;
  physical_uom: DispatchPhysicalUOM;
  remarks?: string;
  items?: Array<{
    line_num?: number;
    item_code?: string;
    item_name?: string;
    order_qty?: number | string | null;
    dispatched_qty?: number | string | null;
    uom?: string;
    warehouse?: string;
  }>;
}

export interface SalesDispatchGateOutUpdateRequest {
  gate_out_date?: string;
  out_time?: string;
  security_name?: string;
  seal_no?: string;
  pgi_document_no?: string;
  goods_issue_posted?: boolean;
  invoice_checked?: boolean;
  delivery_note_checked?: boolean;
  eway_bill_checked?: boolean;
  lr_checked?: boolean;
  physical_quantity?: number | string | null;
  physical_uom?: DispatchPhysicalUOM | '';
  gross_weight?: number | string | null;
  tare_weight?: number | string | null;
  weighbridge_slip_no?: string;
  first_weighment_time?: string | null;
  second_weighment_time?: string | null;
  attachment_notes?: string;
  remarks?: string;
}

export interface SalesDispatchAttachmentRequest {
  dock_photo?: File | null;
  gatepass_document?: File | null;
  attachment_notes?: string;
  remarks?: string;
}

export interface SalesDispatchGateLock {
  id: number;
  locked: boolean;
  reason: string;
  locked_at?: string | null;
  unlocked_at?: string | null;
  changed_by?: number | null;
  changed_by_name?: string;
}

export interface SalesDispatchActionRequest {
  reason?: string;
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

export const salesDispatchApi = {
  async list(params?: SalesDispatchGateOutParams): Promise<SalesDispatchGateOut[]> {
    const query = buildQuery(params);
    const url = query
      ? `${API_ENDPOINTS.GATE_CORE.SALES_DISPATCH_OUTS}?${query}`
      : API_ENDPOINTS.GATE_CORE.SALES_DISPATCH_OUTS;
    const response = await apiClient.get<SalesDispatchGateOut[]>(url);
    return response.data;
  },

  async get(id: number): Promise<SalesDispatchGateOut> {
    const response = await apiClient.get<SalesDispatchGateOut>(
      API_ENDPOINTS.GATE_CORE.SALES_DISPATCH_OUT_BY_ID(id),
    );
    return response.data;
  },

  async create(data: SalesDispatchGateOutCreateRequest): Promise<SalesDispatchGateOut> {
    const response = await apiClient.post<SalesDispatchGateOut>(
      API_ENDPOINTS.GATE_CORE.SALES_DISPATCH_OUTS,
      data,
    );
    return response.data;
  },

  async update(id: number, data: SalesDispatchGateOutUpdateRequest): Promise<SalesDispatchGateOut> {
    const response = await apiClient.patch<SalesDispatchGateOut>(
      API_ENDPOINTS.GATE_CORE.SALES_DISPATCH_OUT_BY_ID(id),
      data,
    );
    return response.data;
  },

  async uploadAttachments(id: number, data: SalesDispatchAttachmentRequest): Promise<SalesDispatchGateOut> {
    const formData = new FormData();
    if (data.dock_photo) formData.append('dock_photo', data.dock_photo);
    if (data.gatepass_document) formData.append('gatepass_document', data.gatepass_document);
    if (data.attachment_notes !== undefined) formData.append('attachment_notes', data.attachment_notes);
    if (data.remarks !== undefined) formData.append('remarks', data.remarks);

    const response = await apiClient.patch<SalesDispatchGateOut>(
      API_ENDPOINTS.GATE_CORE.SALES_DISPATCH_OUT_ATTACHMENTS_BY_ID(id),
      formData,
    );
    return response.data;
  },

  async complete(id: number): Promise<SalesDispatchGateOut> {
    const response = await apiClient.post<SalesDispatchGateOut>(
      API_ENDPOINTS.GATE_CORE.SALES_DISPATCH_OUT_COMPLETE_BY_ID(id),
    );
    return response.data;
  },

  async commitPrint(id: number): Promise<SalesDispatchGateOut> {
    const response = await apiClient.post<SalesDispatchGateOut>(
      API_ENDPOINTS.GATE_CORE.SALES_DISPATCH_OUT_COMMIT_PRINT_BY_ID(id),
    );
    return response.data;
  },

  async cancel(id: number, data: SalesDispatchActionRequest): Promise<SalesDispatchGateOut> {
    const response = await apiClient.post<SalesDispatchGateOut>(
      API_ENDPOINTS.GATE_CORE.SALES_DISPATCH_OUT_CANCEL_BY_ID(id),
      data,
    );
    return response.data;
  },

  async reject(id: number, data: SalesDispatchActionRequest): Promise<SalesDispatchGateOut> {
    const response = await apiClient.post<SalesDispatchGateOut>(
      API_ENDPOINTS.GATE_CORE.SALES_DISPATCH_OUT_REJECT_BY_ID(id),
      data,
    );
    return response.data;
  },

  async getLock(): Promise<SalesDispatchGateLock> {
    const response = await apiClient.get<SalesDispatchGateLock>(
      API_ENDPOINTS.GATE_CORE.DISPATCH_GATE_LOCK,
    );
    return response.data;
  },

  async updateLock(data: { locked: boolean; reason?: string }): Promise<SalesDispatchGateLock> {
    const response = await apiClient.patch<SalesDispatchGateLock>(
      API_ENDPOINTS.GATE_CORE.DISPATCH_GATE_LOCK,
      data,
    );
    return response.data;
  },
};
