// ============================================================================
// Stock Status
// ============================================================================

export type StockHealthStatus = 'healthy' | 'low' | 'critical' | 'unset' | 'none';
export type StockMovementStatus = 'planned' | 'recent' | 'slow';

// ============================================================================
// Filters
// ============================================================================

export type StockSortCol =
  | 'item_code'
  | 'item_name'
  | 'warehouse'
  | 'on_hand'
  | 'min_stock'
  | 'planned_qty'
  | 'health_ratio';

export interface StockDashboardFilters {
  search?: string;
  item_group?: string;
  warehouse?: string[];
  status?: StockHealthStatus[];
  movement_status?: StockMovementStatus[];
  sort_by?: StockSortCol;
  sort_dir?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}

// ============================================================================
// Stock Item
// ============================================================================

export interface StockItem {
  item_code: string;
  item_name: string;
  warehouse: string;
  on_hand: number;
  min_stock: number;
  planned_qty: number;
  uom: string;
  stock_status: StockHealthStatus;
  health_ratio: number;
  movement_status: StockMovementStatus;
  last_consumption_date?: string | null;
  days_since_last_consumption?: number | null;
  has_open_plan?: boolean;
  /** Number of warehouses in this group (>1 = grouped row) */
  warehouse_count?: number;
  /** True when any child warehouse has a worse status than the aggregate */
  has_warning?: boolean;
}

// ============================================================================
// Response
// ============================================================================

export interface StockDashboardMeta {
  total_items: number;
  healthy_count: number;
  low_stock_count: number;
  critical_stock_count: number;
  warehouses: string[];
  fetched_at: string;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface StockDashboardResponse {
  data: StockItem[];
  meta: StockDashboardMeta;
}

// ============================================================================
// Item Detail (expand)
// ============================================================================

export interface StockItemDetailResponse {
  data: StockItem[];
}
