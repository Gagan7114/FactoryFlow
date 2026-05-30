import type { ProductionMovementItem } from '../../production-movement/types';

export type ProductionFlowStatus =
  | 'not_started'
  | 'material_pending'
  | 'production_pending'
  | 'fg_pending'
  | 'complete';

export interface ProductionFlowFilters {
  date_from: string;
  date_to: string;
  warehouse?: string;
  search?: string;
  status?: 'all' | ProductionFlowStatus;
  limit?: number;
}

export interface ProductionFlowSummary {
  total_orders: number;
  planned_qty: number;
  completed_qty: number;
  rejected_qty: number;
  remaining_qty: number;
  component_gap_qty: number;
  fg_gap_qty: number;
  not_started: number;
  material_pending: number;
  production_pending: number;
  fg_pending: number;
  complete: number;
}

export interface ProductionFlowComponent {
  doc_entry: string;
  line_num: number;
  item_code: string;
  item_name: string;
  warehouse: string;
  warehouse_name: string;
  planned_qty: number;
  issued_qty: number;
  gap_qty: number;
  uom: string;
}

export interface ProductionFlowRow {
  doc_entry: string;
  document: string;
  post_date: string;
  start_date: string;
  due_date: string;
  item_code: string;
  item_name: string;
  warehouse: string;
  warehouse_name: string;
  planned_qty: number;
  completed_qty: number;
  rejected_qty: number;
  remaining_qty: number;
  sap_status: string;
  component_planned_qty: number;
  component_issued_qty: number;
  component_gap_qty: number;
  component_count: number;
  material_warehouse_codes: string[];
  fg_warehouse_codes: string[];
  material_movement_out_qty: number;
  fg_received_qty: number;
  fg_moved_qty: number;
  material_gap_qty: number;
  production_gap_qty: number;
  fg_gap_qty: number;
  flow_status: ProductionFlowStatus;
  movement_count: number;
  components: ProductionFlowComponent[];
  material_movements: ProductionMovementItem[];
  finished_good_movements: ProductionMovementItem[];
  movement_entries: ProductionMovementItem[];
}

export interface ProductionFlowMeta {
  date_from: string;
  date_to: string;
  warehouse: string;
  search: string;
  status: string;
  limit: number;
}

export interface ProductionFlowReportResponse {
  summary: ProductionFlowSummary;
  data: ProductionFlowRow[];
  meta: ProductionFlowMeta;
}
