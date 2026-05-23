import { downloadExcelWorkbook } from '@/shared/utils';

import {
  compactExportValue,
  createFilterMetadata,
  createRecordSheet,
  type DashboardExcelRecord,
  formatPercent,
} from '../../utils/dashboardExcelExport';
import type { StockDashboardFilters, StockDashboardMeta, StockItem } from '../types';

interface ExportStockLevelOptions {
  items: StockItem[];
  filters: StockDashboardFilters;
  meta?: StockDashboardMeta;
}

export function exportStockLevelDashboard({
  items,
  filters,
  meta,
}: ExportStockLevelOptions): void {
  const asOfLabel = filters.as_of_date ?? meta?.as_of_date ?? 'latest';
  const sheets = [
    createRecordSheet('Stock Items', items.map(toStockItemRow)),
    createRecordSheet('Summary', meta ? [toStockSummaryRow(meta)] : []),
  ].filter((sheet): sheet is NonNullable<typeof sheet> => Boolean(sheet));

  downloadExcelWorkbook({
    fileName: `Stock_Benchmark_${asOfLabel}.xlsx`,
    metadata: [
      ...createFilterMetadata(filters, {
        item_group: 'Item Group',
        as_of_date: 'As Of Date',
        movement_status: 'Movement Status',
      }),
      { label: 'Exported Rows', value: items.length },
      ...(meta ? [{ label: 'Fetched At', value: meta.fetched_at }] : []),
    ],
    sheets,
  });
}

function toStockItemRow(item: StockItem): DashboardExcelRecord {
  const difference = item.on_hand - item.min_stock;

  return {
    'Item Code': item.item_code,
    'Item Name': item.item_name,
    Warehouse: item.warehouse,
    'On Hand': item.on_hand,
    Benchmark: item.min_stock,
    Difference: difference,
    UOM: item.uom,
    Health: formatPercent(item.health_ratio),
    Status: item.stock_status,
    Movement: item.movement_status,
    'Last Consumption Date': compactExportValue(item.last_consumption_date),
    'Days Since Last Consumption': compactExportValue(item.days_since_last_consumption),
    'Warehouse Count': item.warehouse_count ?? 1,
    Warning: item.has_warning ? 'Yes' : 'No',
  };
}

function toStockSummaryRow(meta: StockDashboardMeta): DashboardExcelRecord {
  return {
    'Total Items': meta.total_items,
    Healthy: meta.healthy_count,
    Low: meta.low_stock_count,
    Critical: meta.critical_stock_count,
    Warehouses: meta.warehouses.join(', '),
    'As Of Date': compactExportValue(meta.as_of_date),
    Page: meta.page,
    'Page Size': meta.page_size,
    'Total Pages': meta.total_pages,
    Note: compactExportValue(meta.reconstruction_note),
    'Fetched At': meta.fetched_at,
  };
}
