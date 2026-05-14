import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

export interface CustomerReturnInvoiceLine {
  line_num: number;
  item_code: string;
  item_name: string;
  quantity: number;
  uom: string;
  rate: number;
  line_total: number;
  gross_total: number;
  warehouse_code: string;
  base_ref: string;
  base_entry: number | null;
  base_type: number | null;
  tax_code: string;
  total_litres: number;
  total_boxes: number;
  total_weight: number;
}

export interface CustomerReturnInvoice {
  doc_entry: number;
  doc_num: string;
  doc_date: string | null;
  create_date: string | null;
  create_time: string;
  card_code: string;
  card_name: string;
  doc_total: number;
  branch_id: number | null;
  branch_name: string;
  ship_to_code: string;
  ship_to_address: string;
  state: string;
  city: string;
  bp_gstin: string;
  sap_dispatch_date: string | null;
  sap_bilty_no: string;
  sap_bilty_date: string | null;
  sap_transporter_name: string;
  sap_vehicle_no: string;
  sap_transporter_invoice: string;
  sap_lr_number: string;
  gst_vehicle_no: string;
  gst_transport_date: string | null;
  gst_transport_reason: string;
  line_count: number;
  total_quantity: number;
  total_litres: number;
  total_boxes: number;
  total_weight: number;
  total_line_amount: number;
  total_gross_amount: number;
  warehouses: string;
  item_summary: string;
  base_refs: string;
  items: CustomerReturnInvoiceLine[];
}

export const customerReturnInvoiceApi = {
  async getByNumber(invoiceNumber: string): Promise<CustomerReturnInvoice> {
    const response = await apiClient.get<CustomerReturnInvoice>(
      API_ENDPOINTS.DISPATCH_PLANS.BILL_BY_NUMBER(invoiceNumber),
    );
    return response.data;
  },
};
