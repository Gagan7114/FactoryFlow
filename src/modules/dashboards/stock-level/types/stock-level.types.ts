// ============================================================================
// Stock Status
// ============================================================================

export type StockHealthStatus = 'healthy' | 'low' | 'critical' | 'unset' | 'none';
export type StockMovementStatus = 'recent' | 'slow';

// ============================================================================
// Filters
// ============================================================================

export type StockSortCol =
  | 'item_code'
  | 'item_name'
  | 'warehouse'
  | 'on_hand'
  | 'min_stock'
  | 'health_ratio';

export interface StockDashboardFilters {
  search?: string;
  item_group?: string;
  warehouse?: string[];
  sub_group?: string[];
  variety?: string[];
  sku?: string[];
  unit?: string[];
  uom?: string[];
  status?: StockHealthStatus[];
  movement_status?: StockMovementStatus[];
  as_of_date?: string;
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
  uom: string;
  stock_status: StockHealthStatus;
  health_ratio: number;
  movement_status: StockMovementStatus;
  last_consumption_date?: string | null;
  days_since_last_consumption?: number | null;
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
  as_of_date?: string;
  reconstruction_note?: string;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface StockDashboardResponse {
  data: StockItem[];
  meta: StockDashboardMeta;
}

// ============================================================================
// Filter Options
// ============================================================================

export interface StockDashboardFilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface StockDashboardFilterOptions {
  item_groups: StockDashboardFilterOption[];
  warehouses: StockDashboardFilterOption[];
  statuses: StockDashboardFilterOption[];
  movements: StockDashboardFilterOption[];
  sub_groups: StockDashboardFilterOption[];
  varieties: StockDashboardFilterOption[];
  skus: StockDashboardFilterOption[];
  units: StockDashboardFilterOption[];
  uoms: StockDashboardFilterOption[];
}

// ============================================================================
// Item Detail (expand)
// ============================================================================

export interface StockItemDetailResponse {
  data: StockItem[];
}
