import { ALL_MATERIAL_TYPES_VALUE } from '../../utils/itemGroupDefaults';
import {
  DEFAULT_STOCK_MOVEMENT_FILTER,
  DEFAULT_STOCK_STATUS_FILTER,
  DEFAULT_STOCK_WAREHOUSE_FILTER,
} from '../constants';
import type { StockDashboardFilters, StockHealthStatus, StockMovementStatus } from '../types';

const ARRAY_FILTER_KEYS = ['warehouse', 'sub_group', 'variety', 'sku', 'unit', 'uom'] as const;

interface FilterParamOptions {
  defaultWarehouse?: boolean;
  defaultStatus?: boolean;
  defaultMovement?: boolean;
}

function normalizeSearch(value: string | null): string | undefined {
  const search = value?.trim();
  return search ? search.toUpperCase() : undefined;
}

function parseArray(value: string | null): string[] | undefined {
  if (value === null) return undefined;
  if (!value.trim()) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function setArrayParam(params: URLSearchParams, key: string, values?: string[]): void {
  if (values === undefined) return;
  params.set(key, values.join(','));
}

function sameValues(a: readonly string[] = [], b: readonly string[] = []): boolean {
  if (a.length !== b.length) return false;
  return [...a].sort().every((value, index) => value === [...b].sort()[index]);
}

export function filtersFromSearchParams(
  params: URLSearchParams,
  defaultItemGroup?: string,
  options: FilterParamOptions = {},
): StockDashboardFilters {
  const {
    defaultWarehouse = true,
    defaultStatus = true,
    defaultMovement = true,
  } = options;

  const filters: StockDashboardFilters = {
    item_group:
      params.get('item_group') !== null
        ? (params.get('item_group') ?? ALL_MATERIAL_TYPES_VALUE)
        : (defaultItemGroup ?? ALL_MATERIAL_TYPES_VALUE),
    warehouse:
      parseArray(params.get('warehouse')) ??
      (defaultWarehouse ? [...DEFAULT_STOCK_WAREHOUSE_FILTER] : []),
    status:
      (parseArray(params.get('status')) as StockHealthStatus[] | undefined) ??
      (defaultStatus ? [...DEFAULT_STOCK_STATUS_FILTER] : []),
    movement_status:
      (parseArray(params.get('movement_status')) as StockMovementStatus[] | undefined) ??
      (defaultMovement ? [...DEFAULT_STOCK_MOVEMENT_FILTER] : []),
  };

  const search = normalizeSearch(params.get('search'));
  if (search) filters.search = search;

  for (const key of ARRAY_FILTER_KEYS) {
    if (key === 'warehouse') continue;
    const parsed = parseArray(params.get(key));
    if (parsed !== undefined) filters[key] = parsed;
  }

  const asOfDate = params.get('as_of_date')?.trim();
  if (asOfDate) filters.as_of_date = asOfDate;

  return filters;
}

export function filtersToSearchParams(filters: StockDashboardFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.search) params.set('search', filters.search);
  if (filters.item_group !== undefined) params.set('item_group', filters.item_group);
  setArrayParam(params, 'warehouse', filters.warehouse);
  setArrayParam(params, 'status', filters.status);
  setArrayParam(params, 'movement_status', filters.movement_status);
  setArrayParam(params, 'sub_group', filters.sub_group);
  setArrayParam(params, 'variety', filters.variety);
  setArrayParam(params, 'sku', filters.sku);
  setArrayParam(params, 'unit', filters.unit);
  setArrayParam(params, 'uom', filters.uom);
  if (filters.as_of_date) params.set('as_of_date', filters.as_of_date);

  return params;
}

export function countActiveStockFilters(
  filters: StockDashboardFilters,
  defaultItemGroup?: string,
): number {
  let count = 0;
  const baselineItemGroup = defaultItemGroup ?? ALL_MATERIAL_TYPES_VALUE;

  if (filters.search) count += 1;
  if ((filters.item_group ?? baselineItemGroup) !== baselineItemGroup) count += 1;
  if (filters.warehouse?.length) count += 1;
  if (filters.status?.length && !sameValues(filters.status, DEFAULT_STOCK_STATUS_FILTER)) {
    count += 1;
  }
  if (
    filters.movement_status?.length &&
    !sameValues(filters.movement_status, DEFAULT_STOCK_MOVEMENT_FILTER)
  ) {
    count += 1;
  }
  if (filters.sub_group?.length) count += 1;
  if (filters.variety?.length) count += 1;
  if (filters.sku?.length) count += 1;
  if (filters.unit?.length) count += 1;
  if (filters.uom?.length) count += 1;
  if (filters.as_of_date) count += 1;

  return count;
}
