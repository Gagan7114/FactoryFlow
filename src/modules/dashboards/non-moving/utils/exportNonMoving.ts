import { downloadExcelWorkbook } from '@/shared/utils';

import {
  compactExportValue,
  createFilterMetadata,
  createRecordSheet,
  type DashboardExcelRecord,
} from '../../utils/dashboardExcelExport';
import type {
  NonMovingFilters,
  NonMovingItem,
  ReportSummary,
  WarehouseSummary,
} from '../types';

interface ExportNonMovingOptions {
  items: NonMovingItem[];
  filters: NonMovingFilters;
  summary?: ReportSummary;
  warehouseSummary?: WarehouseSummary[];
}

export function exportNonMovingDashboard({
  items,
  filters,
  summary,
  warehouseSummary = [],
}: ExportNonMovingOptions): void {
  const sheets = [
    createRecordSheet('Non Moving Items', items.map(toNonMovingRow)),
    createRecordSheet('Branch Summary', summary?.by_branch.map(toBranchSummaryRow) ?? []),
    createRecordSheet('Warehouse Summary', warehouseSummary.map(toWarehouseSummaryRow)),
    createRecordSheet('Summary', summary ? [toSummaryRow(summary)] : []),
  ].filter((sheet): sheet is NonNullable<typeof sheet> => Boolean(sheet));

  downloadExcelWorkbook({
    fileName: `Non_Moving_${filters.age}_days.xlsx`,
    metadata: [
      ...createFilterMetadata(filters, {
        item_group: 'Item Group',
        sub_group: 'Sub Group',
      }),
      { label: 'Exported Rows', value: items.length },
    ],
    sheets,
  });
}

function toNonMovingRow(item: NonMovingItem): DashboardExcelRecord {
  return {
    Branch: item.branch,
    'Item Code': item.item_code,
    'Item Name': item.item_name,
    'Item Group': item.item_group_name,
    'Sub Group': item.sub_group,
    Warehouse: item.warehouse,
    Quantity: item.quantity,
    Value: item.value,
    'Last Movement Date': compactExportValue(item.last_movement_date),
    'Days Since Last Movement': item.days_since_last_movement,
    'Consumption Ratio': item.consumption_ratio,
  };
}

function toWarehouseSummaryRow(summary: WarehouseSummary): DashboardExcelRecord {
  return {
    Warehouse: summary.warehouse,
    'Warehouse Name': compactExportValue(summary.warehouse_name),
    'Item Count': summary.item_count,
    'Total Value': summary.total_value,
    'Total Quantity': summary.total_quantity,
  };
}

function toBranchSummaryRow(summary: ReportSummary['by_branch'][number]): DashboardExcelRecord {
  return {
    Branch: summary.branch,
    'Item Count': summary.item_count,
    'Total Value': summary.total_value,
    'Total Quantity': summary.total_quantity,
  };
}

function toSummaryRow(summary: ReportSummary): DashboardExcelRecord {
  return {
    'Total Items': summary.total_items,
    'Total Value': summary.total_value,
    'Total Quantity': summary.total_quantity,
  };
}
