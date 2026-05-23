import { downloadExcelWorkbook } from '@/shared/utils';

import {
  compactExportValue,
  createFilterMetadata,
  createRecordSheet,
  type DashboardExcelRecord,
} from '../../utils/dashboardExcelExport';
import type {
  PlanDashboardFilters,
  ProcurementItem,
  ProcurementMeta,
  SummaryMeta,
  SummaryOrder,
} from '../types';

interface ExportSAPPlanSummaryOptions {
  orders: SummaryOrder[];
  filters: PlanDashboardFilters;
  meta?: SummaryMeta;
}

interface ExportSAPPlanProcurementOptions {
  items: ProcurementItem[];
  filters: PlanDashboardFilters;
  meta?: ProcurementMeta;
}

export function exportSAPPlanSummaryDashboard({
  orders,
  filters,
  meta,
}: ExportSAPPlanSummaryOptions): void {
  const filteredOrders = filters.status?.length
    ? orders.filter((order) => filters.status!.includes(order.status))
    : orders;
  const sheets = [
    createRecordSheet('SKU Summary', filteredOrders.map(toSummaryOrderRow)),
    createRecordSheet('Summary', meta ? [toSummaryMetaRow(meta)] : []),
  ].filter((sheet): sheet is NonNullable<typeof sheet> => Boolean(sheet));

  downloadExcelWorkbook({
    fileName: 'SAP_Material_Plan_SKU_Summary.xlsx',
    metadata: [
      ...createFilterMetadata(filters, {
        due_date_from: 'Due Date From',
        due_date_to: 'Due Date To',
        show_shortfall_only: 'Show Shortfall Only',
      }),
      { label: 'Exported Rows', value: filteredOrders.length },
      ...(meta ? [{ label: 'Fetched At', value: meta.fetched_at }] : []),
    ],
    sheets,
  });
}

export function exportSAPPlanProcurementDashboard({
  items,
  filters,
  meta,
}: ExportSAPPlanProcurementOptions): void {
  const sheets = [
    createRecordSheet('Procurement', items.map(toProcurementRow)),
    createRecordSheet('Summary', meta ? [toProcurementMetaRow(meta)] : []),
  ].filter((sheet): sheet is NonNullable<typeof sheet> => Boolean(sheet));

  downloadExcelWorkbook({
    fileName: 'SAP_Material_Plan_Procurement.xlsx',
    metadata: [
      ...createFilterMetadata(filters, {
        due_date_from: 'Due Date From',
        due_date_to: 'Due Date To',
        show_shortfall_only: 'Show Shortfall Only',
      }),
      { label: 'Exported Rows', value: items.length },
      ...(meta ? [{ label: 'Fetched At', value: meta.fetched_at }] : []),
    ],
    sheets,
  });
}

function toSummaryOrderRow(order: SummaryOrder): DashboardExcelRecord {
  return {
    'Production Order': `PO-${order.prod_order_num}`,
    'SKU Code': order.sku_code,
    'SKU Name': order.sku_name,
    'Planned Quantity': order.planned_qty,
    'Completed Quantity': order.completed_qty,
    'Total Components': order.total_components,
    'Components With Shortfall': order.components_with_shortfall,
    'Remaining Component Quantity': order.total_remaining_component_qty,
    'Due Date': compactExportValue(order.due_date),
    'Post Date': compactExportValue(order.post_date),
    Status: order.status,
    Warehouse: order.warehouse,
    Priority: order.priority,
  };
}

function toProcurementRow(item: ProcurementItem): DashboardExcelRecord {
  return {
    'Component Code': item.component_code,
    Component: item.component_name,
    UOM: item.uom,
    'Total Required': item.total_required_qty,
    'Stock On Hand': item.stock_on_hand,
    Committed: item.stock_committed,
    'On Order': item.stock_on_order,
    'Net Available': item.net_available,
    Shortfall: item.shortfall_qty,
    'Suggested Purchase': item.suggested_purchase_qty,
    'Vendor Lead Time': item.vendor_lead_time,
    'Default Vendor': compactExportValue(item.default_vendor),
    'Related Production Orders': item.related_prod_orders.map((po) => `PO-${po}`).join(', '),
  };
}

function toSummaryMetaRow(meta: SummaryMeta): DashboardExcelRecord {
  return {
    'Total Orders': meta.total_orders,
    'Orders With Shortfall': meta.orders_with_shortfall,
    'Fetched At': meta.fetched_at,
  };
}

function toProcurementMetaRow(meta: ProcurementMeta): DashboardExcelRecord {
  return {
    'Total Components': meta.total_components,
    'Components With Shortfall': meta.components_with_shortfall,
    'Fetched At': meta.fetched_at,
  };
}
