export interface ProductionMovementFilters {
  date_from: string;
  date_to: string;
  warehouse?: string;
  direction?: 'all' | 'in' | 'out';
  transaction_type?: string;
  search?: string;
  production_only?: boolean;
  limit?: number;
}

export interface ProductionMovementOption {
  code: string;
  name?: string;
  label?: string;
}

export interface ProductionMovementFilterOptions {
  warehouses: ProductionMovementOption[];
  transaction_types: ProductionMovementOption[];
}

export interface ProductionMovementItem {
  date: string;
  item_code: string;
  item_name: string;
  item_group: string;
  warehouse: string;
  warehouse_name: string;
  in_qty: number;
  out_qty: number;
  quantity: number;
  direction: 'IN' | 'OUT';
  transaction_value: number;
  abs_value: number;
  transaction_type: number;
  transaction_label: string;
  reference: string;
  doc_num: string;
  created_by: string;
}

export interface ProductionMovementSummary {
  total_entries: number;
  inward_entries: number;
  outward_entries: number;
  total_in_qty: number;
  total_out_qty: number;
  net_qty: number;
  total_value: number;
  net_value: number;
  warehouse_count: number;
}

export interface ProductionMovementWarehouseSummary {
  warehouse: string;
  warehouse_name: string;
  entry_count: number;
  in_qty: number;
  out_qty: number;
  net_qty: number;
  total_value: number;
}

export interface ProductionMovementTypeSummary {
  transaction_type: number;
  transaction_label: string;
  entry_count: number;
  in_qty: number;
  out_qty: number;
  total_value: number;
}

export interface ProductionMovementMeta {
  date_from: string;
  date_to: string;
  warehouse: string;
  direction: string;
  production_only: boolean;
  limit: number;
}

export interface ProductionMovementReportResponse {
  data: ProductionMovementItem[];
  summary: ProductionMovementSummary;
  warehouse_summary: ProductionMovementWarehouseSummary[];
  movement_type_summary: ProductionMovementTypeSummary[];
  meta: ProductionMovementMeta;
}
