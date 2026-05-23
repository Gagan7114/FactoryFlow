import { downloadExcelWorkbook } from '@/shared/utils';

import {
  compactExportValue,
  createFilterMetadata,
  createRecordSheet,
  type DashboardExcelRecord,
} from '../../utils/dashboardExcelExport';
import type {
  InventoryAgeFilters,
  InventoryAgeItem,
  InventoryAgeMeta,
  WarehouseSummary,
} from '../types';

interface ExportInventoryAgeOptions {
  items: InventoryAgeItem[];
  filters: InventoryAgeFilters;
  meta?: InventoryAgeMeta;
  warehouseSummary?: WarehouseSummary[];
}

export function exportInventoryAgeDashboard({
  items,
  filters,
  meta,
  warehouseSummary = [],
}: ExportInventoryAgeOptions): void {
  const sheets = [
    createRecordSheet('Inventory Items', items.map(toInventoryAgeRow)),
    createRecordSheet('Warehouse Summary', warehouseSummary.map(toWarehouseSummaryRow)),
    createRecordSheet('Summary', meta ? [toInventorySummaryRow(meta)] : []),
  ].filter((sheet): sheet is NonNullable<typeof sheet> => Boolean(sheet));

  downloadExcelWorkbook({
    fileName: `Inventory_Age_${filters.item_group ?? 'all'}.xlsx`,
    metadata: [
      ...createFilterMetadata(filters, {
        item_group: 'Item Group',
        min_age: 'Minimum Age',
        sub_group: 'Sub Group',
      }),
      { label: 'Exported Rows', value: items.length },
      ...(meta ? [{ label: 'Fetched At', value: meta.fetched_at }] : []),
    ],
    sheets,
  });
}

function toInventoryAgeRow(item: InventoryAgeItem): DashboardExcelRecord {
  return {
    'Item Code': item.item_code,
    'Item Name': item.item_name,
    Group: item.item_group,
    'Sub Group': item.sub_group,
    Variety: compactExportValue(item.variety),
    SKU: compactExportValue(item.sku),
    Warehouse: item.warehouse,
    'On Hand': item.on_hand,
    Litres: item.litres,
    Unit: item.unit,
    'In Stock Value': item.in_stock_value,
    'Calculated Price': item.calc_price,
    'Effective Date': compactExportValue(item.effective_date),
    'Age Days': item.days_age,
    'Is Litre': item.is_litre ? 'Yes' : 'No',
  };
}

function toWarehouseSummaryRow(summary: WarehouseSummary): DashboardExcelRecord {
  return {
    Warehouse: summary.warehouse,
    'Item Count': summary.item_count,
    'Total Value': summary.total_value,
    'Total Quantity': summary.total_quantity,
    'Total Litres': summary.total_litres,
  };
}

function toInventorySummaryRow(meta: InventoryAgeMeta): DashboardExcelRecord {
  return {
    'Total Items': meta.total_items,
    'Total Value': meta.total_value,
    'Total Quantity': meta.total_quantity,
    'Total Litres': meta.total_litres,
    Warehouses: meta.warehouse_count,
    'Fetched At': meta.fetched_at,
  };
}
