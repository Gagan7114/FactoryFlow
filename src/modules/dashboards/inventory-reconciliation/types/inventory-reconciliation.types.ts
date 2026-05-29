import type { ProductionMovementItem } from '../../production-movement/types';

export interface InventoryReconciliationFilters {
  date_from: string;
  date_to: string;
  warehouse?: string;
  search?: string;
  limit?: number;
}

export interface InventoryReconciliationSummary {
  total_rows: number;
  total_issues: number;
  transfer_mismatches: number;
  production_shortfalls: number;
  component_gaps: number;
  balanced_rows: number;
  total_difference_qty: number;
}

export interface TransferReconciliationRow {
  source_type: 'transfer';
  document: string;
  doc_entry: string;
  date: string;
  item_code: string;
  item_name: string;
  from_warehouse: string;
  from_warehouse_name: string;
  to_warehouse: string;
  to_warehouse_name: string;
  expected_qty: number;
  actual_qty: number;
  difference_qty: number;
  entry_count: number;
  status: ReconciliationStatus;
  entries: ProductionMovementItem[];
}

export interface ProductionReconciliationRow {
  source_type: 'production_order';
  document: string;
  doc_entry: string;
  date: string;
  due_date: string;
  item_code: string;
  item_name: string;
  warehouse: string;
  warehouse_name: string;
  expected_qty: number;
  actual_qty: number;
  difference_qty: number;
  rejected_qty: number;
  status: ReconciliationStatus;
}

export interface ComponentReconciliationRow {
  source_type: 'bom_component';
  document: string;
  doc_entry: string;
  date: string;
  due_date: string;
  parent_item_code: string;
  parent_item_name: string;
  item_code: string;
  item_name: string;
  warehouse: string;
  warehouse_name: string;
  expected_qty: number;
  actual_qty: number;
  difference_qty: number;
  status: ReconciliationStatus;
}

export type InventoryReconciliationSourceType = 'transfer' | 'production_order' | 'bom_component';

export type ReconciliationStatus = 'balanced' | 'missing' | 'short' | 'extra';

export interface InventoryReconciliationMeta {
  date_from: string;
  date_to: string;
  warehouse: string;
  search: string;
  limit: number;
}

export interface InventoryReconciliationReportResponse {
  summary: InventoryReconciliationSummary;
  transfer_reconciliations: TransferReconciliationRow[];
  production_reconciliations: ProductionReconciliationRow[];
  component_reconciliations: ComponentReconciliationRow[];
  meta: InventoryReconciliationMeta;
}
