import {
  compactExportValue,
  createRecordSheet,
  type DashboardExcelRecord,
  downloadExcelWorkbook,
} from '@/shared/utils';

import { GRPO_STATUS } from '../constants';
import type {
  GRPOHistoryEntry,
  PendingGRPOEntryWithSuppliers,
  ServiceGRPOHistoryEntry,
  ServiceGRPOPendingEntry,
} from '../types';

interface ExportGRPODashboardOptions {
  pendingEntries: PendingGRPOEntryWithSuppliers[];
  historyEntries: GRPOHistoryEntry[];
}

interface ExportServiceGRPODashboardOptions {
  pendingEntries: ServiceGRPOPendingEntry[];
  historyEntries: ServiceGRPOHistoryEntry[];
}

export function exportGRPODashboard({
  pendingEntries,
  historyEntries,
}: ExportGRPODashboardOptions): void {
  const sheets = [
    createRecordSheet('Pending Entries', pendingEntries.map(toPendingGRPORow)),
    createRecordSheet('Posting History', historyEntries.map(toGRPOHistoryRow)),
    createRecordSheet('History Lines', historyEntries.flatMap(toGRPOHistoryLineRows)),
    createRecordSheet('Status Summary', buildHistorySummaryRows(historyEntries)),
  ].filter((sheet): sheet is NonNullable<typeof sheet> => Boolean(sheet));

  downloadExcelWorkbook({
    fileName: 'Material_GRPO_Dashboard.xlsx',
    metadata: [
      { label: 'Dashboard', value: 'GRPO Posting' },
      { label: 'Pending Entries', value: pendingEntries.length },
      { label: 'Posting History Rows', value: historyEntries.length },
      {
        label: 'Pending POs',
        value: pendingEntries.reduce((sum, entry) => sum + entry.pending_po_count, 0),
      },
    ],
    sheets,
  });
}

export function exportServiceGRPODashboard({
  pendingEntries,
  historyEntries,
}: ExportServiceGRPODashboardOptions): void {
  const sheets = [
    createRecordSheet('Pending Bookings', pendingEntries.map(toServicePendingRow)),
    createRecordSheet('Posting History', historyEntries.map(toServiceHistoryRow)),
    createRecordSheet('History Lines', historyEntries.flatMap(toServiceHistoryLineRows)),
    createRecordSheet('Status Summary', buildHistorySummaryRows(historyEntries)),
  ].filter((sheet): sheet is NonNullable<typeof sheet> => Boolean(sheet));

  downloadExcelWorkbook({
    fileName: 'Service_GRPO_Dashboard.xlsx',
    metadata: [
      { label: 'Dashboard', value: 'Service GRPO' },
      { label: 'Pending Bookings', value: pendingEntries.length },
      { label: 'Posting History Rows', value: historyEntries.length },
      {
        label: 'Pending Freight',
        value: pendingEntries.reduce(
          (sum, entry) => sum + Number(entry.total_freight || entry.freight || 0),
          0,
        ),
      },
    ],
    sheets,
  });
}

function toPendingGRPORow(entry: PendingGRPOEntryWithSuppliers): DashboardExcelRecord {
  return {
    'Entry No.': entry.entry_no,
    Status: entry.status,
    'Entry Time': entry.entry_time,
    'PO Date': compactExportValue(entry.po_date),
    'Total POs': entry.total_po_count,
    'Posted POs': entry.posted_po_count,
    'Pending POs': entry.pending_po_count,
    'Fully Posted': entry.is_fully_posted ? 'Yes' : 'No',
    Suppliers: compactExportValue(
      entry.suppliers
        ?.map((supplier) => `${supplier.supplier_code} - ${supplier.supplier_name}`)
        .join(', '),
    ),
  };
}

function toGRPOHistoryRow(entry: GRPOHistoryEntry): DashboardExcelRecord {
  return {
    'Posting ID': entry.id,
    'Entry No.': entry.entry_no,
    'Vehicle Entry': entry.vehicle_entry,
    'PO Receipt': entry.po_receipt,
    'PO Number': entry.po_number,
    'SAP Doc Entry': compactExportValue(entry.sap_doc_entry),
    'SAP Doc Num': compactExportValue(entry.sap_doc_num),
    'SAP Doc Total': compactExportValue(entry.sap_doc_total),
    Status: entry.status,
    Error: compactExportValue(entry.error_message),
    'Posted At': compactExportValue(entry.posted_at),
    'Created At': entry.created_at,
    'Is Merged': entry.is_merged ? 'Yes' : 'No',
    'PO Numbers': compactExportValue(entry.po_numbers?.join(', ')),
  };
}

function toGRPOHistoryLineRows(entry: GRPOHistoryEntry): DashboardExcelRecord[] {
  return entry.lines.map((line) => ({
    'Posting ID': entry.id,
    'Entry No.': entry.entry_no,
    'PO Number': entry.po_number,
    'Item Code': line.item_code,
    'Item Name': line.item_name,
    'Quantity Posted': line.quantity_posted,
    'Base Entry': compactExportValue(line.base_entry),
    'Base Line': compactExportValue(line.base_line),
  }));
}

function toServicePendingRow(entry: ServiceGRPOPendingEntry): DashboardExcelRecord {
  return {
    'Dispatch Plan ID': entry.dispatch_plan_id,
    'SAP Invoice Doc Entry': entry.sap_invoice_doc_entry,
    'SAP Invoice Doc Num': entry.sap_invoice_doc_num,
    'Booking Status': entry.booking_status,
    'Dispatch Date': compactExportValue(entry.dispatch_date),
    Vehicle: compactExportValue(entry.vehicle_no),
    Driver: compactExportValue(entry.driver_name),
    Transporter: compactExportValue(entry.transporter_name),
    'Transporter GSTIN': compactExportValue(entry.transporter_gstin),
    'Bilty No.': compactExportValue(entry.bilty_no),
    'Bilty Date': compactExportValue(entry.bilty_date),
    Freight: compactExportValue(entry.freight),
    'Total Freight': compactExportValue(entry.total_freight),
    'Invoice Count': compactExportValue(entry.invoice_count),
    'Invoice Number': compactExportValue(entry.invoice_number),
    'E-Way Bill': compactExportValue(entry.eway_bill),
    'Product Variety': compactExportValue(entry.product_variety),
    'Created At': entry.created_at,
  };
}

function toServiceHistoryRow(entry: ServiceGRPOHistoryEntry): DashboardExcelRecord {
  return {
    'Posting ID': entry.id,
    'Dispatch Plan ID': entry.dispatch_plan,
    'Dispatch Bill No.': entry.dispatch_bill_no,
    'SAP Invoice Doc Entry': entry.sap_invoice_doc_entry,
    Vehicle: compactExportValue(entry.vehicle_no),
    Transporter: compactExportValue(entry.transporter_name),
    Vendor: compactExportValue(entry.vendor_name),
    'Vendor Code': compactExportValue(entry.vendor_code),
    'SAP Doc Entry': compactExportValue(entry.sap_doc_entry),
    'SAP Doc Num': compactExportValue(entry.sap_doc_num),
    'SAP Doc Total': compactExportValue(entry.sap_doc_total),
    'Total Amount': compactExportValue(entry.total_amount),
    'Place Of Supply': compactExportValue(entry.place_of_supply),
    Status: entry.status,
    Error: compactExportValue(entry.error_message),
    'Posted At': compactExportValue(entry.posted_at),
    'Created At': entry.created_at,
  };
}

function toServiceHistoryLineRows(entry: ServiceGRPOHistoryEntry): DashboardExcelRecord[] {
  return entry.lines.map((line) => ({
    'Posting ID': entry.id,
    'Dispatch Bill No.': entry.dispatch_bill_no,
    'Dispatch Plan ID': compactExportValue(line.dispatch_plan),
    'Service Description': line.service_description,
    Amount: line.amount,
    'Unit Price': compactExportValue(line.unit_price),
    'Tax Code': line.tax_code,
    'GL Account': line.gl_account,
    'SAC Code': compactExportValue(line.sac_code),
    Location: compactExportValue(line.location_name),
    Project: compactExportValue(line.project_code),
    'Sub Account': compactExportValue(line.sub_account),
    'Product Variety': compactExportValue(line.product_variety),
    'Total Litres': compactExportValue(line.total_litres),
  }));
}

function buildHistorySummaryRows(entries: Array<{ status: string }>): DashboardExcelRecord[] {
  return [
    {
      Status: GRPO_STATUS.PENDING,
      Count: entries.filter((entry) => entry.status === GRPO_STATUS.PENDING).length,
    },
    {
      Status: GRPO_STATUS.POSTED,
      Count: entries.filter((entry) => entry.status === GRPO_STATUS.POSTED).length,
    },
    {
      Status: 'FAILED / PARTIALLY_POSTED',
      Count: entries.filter(
        (entry) =>
          entry.status === GRPO_STATUS.FAILED || entry.status === GRPO_STATUS.PARTIALLY_POSTED,
      ).length,
    },
  ];
}
