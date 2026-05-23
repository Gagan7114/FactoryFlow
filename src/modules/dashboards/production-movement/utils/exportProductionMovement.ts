import { downloadExcelWorkbook } from '@/shared/utils';

import {
  compactExportValue,
  createFilterMetadata,
  createRecordSheet,
  type DashboardExcelRecord,
} from '../../utils/dashboardExcelExport';
import type {
  ProductionMovementFilters,
  ProductionMovementItem,
  ProductionMovementSummary,
  ProductionMovementWarehouseSummary,
} from '../types';

interface ExportProductionMovementOptions {
  items: ProductionMovementItem[];
  filters: ProductionMovementFilters;
  summary?: ProductionMovementSummary;
  warehouseSummary?: ProductionMovementWarehouseSummary[];
}

export function exportProductionMovementDashboard({
  items,
  filters,
  summary,
  warehouseSummary = [],
}: ExportProductionMovementOptions): void {
  const sheets = [
    createRecordSheet('Movement Entries', items.map(toProductionMovementRow)),
    createRecordSheet('Warehouse Summary', warehouseSummary.map(toWarehouseSummaryRow)),
    createRecordSheet('Summary', summary ? [toSummaryRow(summary)] : []),
  ].filter((sheet): sheet is NonNullable<typeof sheet> => Boolean(sheet));

  downloadExcelWorkbook({
    fileName: `Production_Movement_${filters.date_from}_to_${filters.date_to}.xlsx`,
    metadata: [
      ...createFilterMetadata(filters, {
        date_from: 'Date From',
        date_to: 'Date To',
        transaction_type: 'Transaction Type',
        production_only: 'Production Only',
      }),
      { label: 'Exported Rows', value: items.length },
    ],
    sheets,
  });
}

function toProductionMovementRow(item: ProductionMovementItem): DashboardExcelRecord {
  return {
    Date: item.date,
    'Item Code': item.item_code,
    'Item Name': item.item_name,
    'Item Group': item.item_group,
    Warehouse: item.warehouse,
    'Warehouse Name': item.warehouse_name,
    Direction: item.direction,
    Quantity: item.quantity,
    'In Quantity': item.in_qty,
    'Out Quantity': item.out_qty,
    'Transaction Value': item.transaction_value,
    'Absolute Value': item.abs_value,
    'Transaction Type': item.transaction_type,
    'Transaction Label': item.transaction_label,
    Reference: compactExportValue(item.reference),
    'Document No.': compactExportValue(item.doc_num),
    'Created By': compactExportValue(item.created_by),
  };
}

function toWarehouseSummaryRow(summary: ProductionMovementWarehouseSummary): DashboardExcelRecord {
  return {
    Warehouse: summary.warehouse,
    'Warehouse Name': summary.warehouse_name,
    Entries: summary.entry_count,
    'In Quantity': summary.in_qty,
    'Out Quantity': summary.out_qty,
    'Net Quantity': summary.net_qty,
    'Total Value': summary.total_value,
  };
}

function toSummaryRow(summary: ProductionMovementSummary): DashboardExcelRecord {
  return {
    'Total Entries': summary.total_entries,
    'Inward Entries': summary.inward_entries,
    'Outward Entries': summary.outward_entries,
    'Opening Quantity': summary.opening_qty,
    'Total In Quantity': summary.total_in_qty,
    'Total Out Quantity': summary.total_out_qty,
    'Net Quantity': summary.net_qty,
    'Closing Quantity': summary.closing_qty,
    'Total Value': summary.total_value,
    'Net Value': summary.net_value,
    Warehouses: summary.warehouse_count,
  };
}
