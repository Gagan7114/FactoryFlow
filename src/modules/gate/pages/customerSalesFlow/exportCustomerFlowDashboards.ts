import type { DateRange } from '@/core/store/filtersSlice';
import {
  compactExportValue,
  createFilterMetadata,
  createRecordSheet,
  type DashboardExcelRecord,
  downloadExcelWorkbook,
} from '@/shared/utils';

import {
  buildCustomerFlowItemSummary,
  type CustomerFlowEntry,
  formatCustomerFlowDateTime,
  getCustomerFlowValue,
  getCustomerReturnStatusLabel,
} from './customerSalesFlow.storage';

type CustomerFlowExportMode = 'sales-dispatch' | 'customer-return';

interface CustomerFlowSummaryItem {
  label: string;
  value: number;
}

interface ExportCustomerFlowDashboardOptions {
  mode: CustomerFlowExportMode;
  entries: CustomerFlowEntry[];
  dateRange: DateRange;
  searchTerm: string;
  summary: CustomerFlowSummaryItem[];
}

const dashboardLabels: Record<CustomerFlowExportMode, { title: string; filePrefix: string }> = {
  'sales-dispatch': {
    title: 'Sales Dispatch',
    filePrefix: 'Sales_Dispatch',
  },
  'customer-return': {
    title: 'Goods Return',
    filePrefix: 'Goods_Return',
  },
};

export function exportCustomerFlowDashboard({
  mode,
  entries,
  dateRange,
  searchTerm,
  summary,
}: ExportCustomerFlowDashboardOptions): void {
  const dashboard = dashboardLabels[mode];
  const sheets = [
    createRecordSheet('Entries', entries.map((entry) => toEntryRow(entry, mode))),
    createRecordSheet('Items', entries.flatMap((entry) => toItemRows(entry))),
    createRecordSheet(
      'Status Summary',
      summary.map((item) => ({ Metric: item.label, Value: item.value })),
    ),
  ].filter((sheet): sheet is NonNullable<typeof sheet> => Boolean(sheet));

  downloadExcelWorkbook({
    fileName: `${dashboard.filePrefix}_${dateRange.from || 'all'}_${dateRange.to || 'all'}.xlsx`,
    metadata: [
      { label: 'Dashboard', value: dashboard.title },
      ...createFilterMetadata(
        {
          from_date: dateRange.from,
          to_date: dateRange.to,
          search: searchTerm.trim(),
        },
        {
          from_date: 'From Date',
          to_date: 'To Date',
          search: 'Search',
        },
      ),
      { label: 'Exported Entries', value: entries.length },
    ],
    sheets,
  });
}

function toEntryRow(entry: CustomerFlowEntry, mode: CustomerFlowExportMode): DashboardExcelRecord {
  const isReturn = mode === 'customer-return';

  return {
    'Entry No.': entry.entryNo,
    Status: isReturn ? getCustomerReturnStatusLabel(entry) : entry.status,
    'Document No.': isReturn
      ? getCustomerFlowValue(entry, 'invoiceNo')
      : getCustomerFlowValue(entry, 'outboundDeliveryNo'),
    'SAP Status': getCustomerFlowValue(entry, 'sapStatus'),
    Customer: getCustomerFlowValue(entry, 'customerName'),
    'Customer Code': getCustomerFlowValue(entry, 'customerCode'),
    Vehicle: getCustomerFlowValue(entry, 'vehicleNo'),
    Transporter: getCustomerFlowValue(entry, 'transporterName'),
    'LR No.': getCustomerFlowValue(entry, 'lrNo'),
    'E-Way Bill': getCustomerFlowValue(entry, 'ewayBillNo'),
    'Gate Date Time': isReturn
      ? formatCustomerFlowDateTime(entry.values.gateInDate, entry.values.inTime)
      : formatCustomerFlowDateTime(entry.values.gateOutDate, entry.values.outTime),
    'Goods Issue Posted': isReturn ? '-' : getCustomerFlowValue(entry, 'goodsIssuePosted'),
    'Item Summary': buildCustomerFlowItemSummary(entry.items),
    Remarks: getCustomerFlowValue(entry, 'remarks'),
    'Created At': entry.createdAt,
    'Updated At': entry.updatedAt,
  };
}

function toItemRows(entry: CustomerFlowEntry): DashboardExcelRecord[] {
  if (entry.items.length === 0) {
    return [
      {
        'Entry No.': entry.entryNo,
        'Item Code': '-',
        'Item Name': '-',
      },
    ];
  }

  return entry.items.map((item) => ({
    'Entry No.': entry.entryNo,
    'Item Code': compactExportValue(item.itemCode),
    'Item Name': compactExportValue(item.itemName),
    'Order Qty': compactExportValue(item.orderQty),
    'Dispatched Qty': compactExportValue(item.dispatchedQty),
    'Return Qty': compactExportValue(item.returnQty),
    'Accepted Qty': compactExportValue(item.acceptedQty),
    'Rejected Qty': compactExportValue(item.rejectedQty),
    UOM: compactExportValue(item.uom),
    Reason: compactExportValue(item.reason),
    Condition: compactExportValue(item.condition),
  }));
}
