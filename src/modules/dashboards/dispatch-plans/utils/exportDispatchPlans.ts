import { downloadExcelWorkbook } from '@/shared/utils';

import {
  compactExportValue,
  createFilterMetadata,
  createRecordSheet,
  type DashboardExcelRecord,
} from '../../utils/dashboardExcelExport';
import type { DispatchBill, DispatchPlanFilters, DispatchPlansMeta } from '../types';

interface ExportDispatchPlansOptions {
  bills: DispatchBill[];
  filters: DispatchPlanFilters;
  meta?: DispatchPlansMeta;
}

export function exportDispatchPlansDashboard({
  bills,
  filters,
  meta,
}: ExportDispatchPlansOptions): void {
  const sheets = [
    createRecordSheet('Dispatch Bills', bills.map(toDispatchBillRow)),
    createRecordSheet('Summary', meta ? [toDispatchSummaryRow(meta)] : []),
  ].filter((sheet): sheet is NonNullable<typeof sheet> => Boolean(sheet));

  downloadExcelWorkbook({
    fileName: `Dispatch_Plans_${filters.date_from}_to_${filters.date_to}.xlsx`,
    metadata: [
      ...createFilterMetadata(filters, {
        date_from: 'Date From',
        date_to: 'Date To',
        booking_status: 'Booking Status',
      }),
      { label: 'Exported Rows', value: bills.length },
      ...(meta ? [{ label: 'Fetched At', value: meta.fetched_at }] : []),
    ],
    sheets,
  });
}

function toDispatchBillRow(bill: DispatchBill): DashboardExcelRecord {
  return {
    Created: compactExportValue(bill.create_date),
    'Created Time': compactExportValue(bill.create_time),
    'Invoice Date': compactExportValue(bill.doc_date),
    'Bill No.': bill.doc_num,
    'Party Code': compactExportValue(bill.card_code),
    Party: compactExportValue(bill.card_name),
    Branch: compactExportValue(bill.branch_name),
    City: compactExportValue(bill.city),
    State: compactExportValue(bill.state),
    'Doc Value': bill.doc_total,
    'Gross Amount': bill.total_gross_amount,
    'Total Quantity': bill.total_quantity,
    'Total Litres': bill.total_litres,
    'Total Boxes': bill.total_boxes,
    'Total Weight Kg': bill.total_weight,
    Warehouses: compactExportValue(bill.warehouses),
    Items: compactExportValue(bill.item_summary),
    'Base References': compactExportValue(bill.base_refs),
    'SAP Transporter': compactExportValue(bill.sap_transporter_name),
    'SAP Vehicle': compactExportValue(bill.sap_vehicle_no || bill.gst_vehicle_no),
    'SAP Bilty': compactExportValue(bill.sap_bilty_no || bill.sap_lr_number),
    'SAP E-Way Bill': compactExportValue(bill.sap_eway_bill),
    Status: bill.plan.booking_status,
    'Linked Vehicle': compactExportValue(bill.plan.vehicle_no),
    'Driver Name': compactExportValue(bill.plan.driver_name),
    Transporter: compactExportValue(bill.plan.transporter_name),
    'Plan Bilty': compactExportValue(bill.plan.bilty_no),
    'Dispatch Date': compactExportValue(bill.plan.dispatch_date),
    Priority: compactExportValue(bill.plan.priority),
    Remarks: compactExportValue(bill.plan.remarks),
  };
}

function toDispatchSummaryRow(meta: DispatchPlansMeta): DashboardExcelRecord {
  return {
    'Total Bills': meta.total_bills,
    Pending: meta.pending_count,
    Booked: meta.booked_count,
    Dispatched: meta.dispatched_count,
    Cancelled: meta.cancelled_count,
    'Total Doc Value': meta.total_doc_value,
    'Total Litres': meta.total_litres,
    'Total Boxes': meta.total_boxes,
    'Fetched At': meta.fetched_at,
  };
}
