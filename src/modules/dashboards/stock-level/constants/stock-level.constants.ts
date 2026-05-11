import type { StockHealthStatus, StockMovementStatus } from '../types';

// ============================================================================
// Filter Options
// ============================================================================

export const STOCK_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'healthy', label: 'Healthy' },
  { value: 'low', label: 'Low' },
  { value: 'critical', label: 'Critical' },
  { value: 'unset', label: 'No Minimum' },
] as const;

export const DEFAULT_STOCK_STATUS_FILTER: StockHealthStatus[] = ['low', 'critical'];

export const STOCK_MOVEMENT_FILTER_OPTIONS = [
  { value: 'planned', label: 'Planned' },
  { value: 'recent', label: 'Recently Used' },
  { value: 'slow', label: 'Slow Moving' },
] as const;

export const DEFAULT_STOCK_MOVEMENT_FILTER: StockMovementStatus[] = ['planned', 'recent'];

// ============================================================================
// Query Config
// ============================================================================

export const STOCK_LEVEL_STALE_TIME = 5 * 60 * 1000; // 5 minutes
