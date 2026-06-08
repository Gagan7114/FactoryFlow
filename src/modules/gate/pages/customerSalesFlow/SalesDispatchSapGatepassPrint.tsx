import { forwardRef } from 'react';

import type {
  SalesDispatchGateOut,
  SalesDispatchGateOutDocument,
  SalesDispatchGatepassPrintLog,
  SalesDispatchItem,
} from '@/modules/gate/api';

export const SAP_GATEPASS_PRINT_PAGE_STYLE = `
  @page {
    size: A4 portrait;
    margin: 5mm;
  }

  @media print {
    body {
      margin: 0;
      background: #ffffff !important;
    }

    .sap-gatepass-print-host {
      position: static !important;
      left: auto !important;
      top: auto !important;
      width: 100% !important;
    }
  }
`;

interface SapGatepassPrintProps {
  entry: SalesDispatchGateOut;
  companyName: string;
  printLog?: SalesDispatchGatepassPrintLog | null;
}

interface SapGatepassDocument extends SalesDispatchGateOutDocument {
  key: string;
  items: SalesDispatchItem[];
}

export const SalesDispatchSapGatepassPrint = forwardRef<HTMLDivElement, SapGatepassPrintProps>(
  ({ entry, companyName, printLog }, ref) => {
    const documents = getSapGatepassDocuments(entry);
    const items = documents.flatMap((document) => document.items);
    const invoiceNumbers = formatDocumentNumbers(entry, documents);
    const firstDocument = documents[0];
    const billAmount = sumDocuments(documents, 'sap_doc_total') || toNumber(entry.sap_doc_total);
    const totalQty = sumItems(items, 'quantity') || sumDocuments(documents, 'total_quantity');
    const totalBoxes = sumItems(items, 'total_boxes') || sumDocuments(documents, 'total_boxes');
    const totalLitres =
      sumItems(items, 'total_litres') || sumDocuments(documents, 'total_litres') || 0;
    const totalGrossWeight =
      sumItems(items, 'total_weight') ||
      sumDocuments(documents, 'total_weight') ||
      toNumber(entry.total_weight);
    const isReprint = printLog?.print_type === 'REPRINT';

    return (
      <div ref={ref} className="sap-gatepass-print">
        <div className="sap-gatepass-header">
          <div className="sap-gatepass-brand">
            <div className="sap-gatepass-title">Bill Summary</div>
            <img className="sap-gatepass-logo" src="/JivoWellnessLogo.png" alt="Jivo" />
          </div>
          <div className="sap-gatepass-company">
            <div className="sap-gatepass-company-name">{companyName || 'FACTORY'}</div>
            <div className="sap-gatepass-address">
              {formatMultiline(
                firstDocument?.ship_to_address ||
                  entry.ship_to_address ||
                  firstDocument?.place_of_supply ||
                  entry.place_of_supply,
              )}
            </div>
          </div>
          <div className="sap-gatepass-tax">
            <div>Phone: {formatDash(entry.transporter_mobile_no)}</div>
            <div>GST No. {formatDash(firstDocument?.bp_gstin || entry.bp_gstin)}</div>
          </div>
        </div>

        <section className="sap-gatepass-invoice-strip">
          <div>Invoice Number : {formatDash(invoiceNumbers)}</div>
          <div>
            Invoice Date : {formatSapDate(firstDocument?.sap_doc_date || entry.sap_doc_date)}
          </div>
          <div>Dispatch Date: {formatSapDate(entry.dispatch_date || entry.gate_out_date)}</div>
        </section>

        <section className="sap-gatepass-details">
          <div>
            <SapField
              label="Customer Name"
              value={firstDocument?.customer_name || entry.customer_name}
            />
            <SapField
              label="Delivery Address"
              value={
                firstDocument?.ship_to_address ||
                entry.ship_to_address ||
                firstDocument?.place_of_supply ||
                entry.place_of_supply
              }
              multiline
            />
            <SapField label="Contact No" value={entry.driver_mobile_no} />
          </div>
          <div>
            <SapField label="Transporter Name" value={entry.transporter_name} />
            <SapField label="Bilty No" value={entry.bilty_no} />
            <SapField label="Bilty Date" value={formatSapDate(entry.bilty_date)} />
            <SapField label="Vehicle No" value={entry.vehicle_no} />
            <SapField label="Driver Contact No" value={entry.driver_mobile_no} />
            <SapField label="DriverName." value={entry.driver_name} />
          </div>
        </section>

        <table className="sap-gatepass-items">
          <colgroup>
            <col className="sap-gatepass-col-sno" />
            <col className="sap-gatepass-col-desc" />
            <col className="sap-gatepass-col-qty" />
            <col className="sap-gatepass-col-box" />
            <col className="sap-gatepass-col-loose" />
            <col className="sap-gatepass-col-warehouse" />
            <col className="sap-gatepass-col-weight" />
          </colgroup>
          <thead>
            <tr>
              <th>S. No</th>
              <th>Description of Goods</th>
              <th className="sap-center">Qty Pcs</th>
              <th className="sap-center">Box</th>
              <th className="sap-center">Loose Qty</th>
              <th className="sap-center">Warehouse</th>
              <th>Gross Weight (KGS)</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id || `${item.item_code}-${index}`}>
                <td className="sap-center">{index + 1}</td>
                <td>{formatDash(item.item_name || item.item_code)}</td>
                <td className="sap-num">{formatNumber(item.quantity)}</td>
                <td className="sap-num">{formatNumber(item.total_boxes || 0)}</td>
                <td className="sap-num">0.00</td>
                <td>{formatDash(formatItemWarehouse(item))}</td>
                <td className="sap-num">{formatNumber(item.total_weight || 0)}</td>
              </tr>
            ))}
            <tr className="sap-gatepass-total-row">
              <td />
              <td>Total :</td>
              <td className="sap-num">{formatNumber(totalQty)}</td>
              <td className="sap-num">{formatNumber(totalBoxes)}</td>
              <td className="sap-num">0.00</td>
              <td />
              <td className="sap-num">{formatNumber(totalGrossWeight)}</td>
            </tr>
          </tbody>
        </table>

        <section className="sap-gatepass-footer">
          <div className="sap-gatepass-amounts">
            <div className="sap-gatepass-bill-amount">Bill Amount: {formatNumber(billAmount)}</div>
            <div className="sap-gatepass-total-line">
              <span>Total Liter:</span>
              <span>Total Gross Weight:&nbsp; KGS{formatNumber(totalGrossWeight)}</span>
            </div>
            <div>Remarks:</div>
            {isReprint ? <div>Reprint Reason: {formatDash(printLog.reprint_reason)}</div> : null}
          </div>
          <div className="sap-gatepass-signatures">
            <div>Dispatched By</div>
            <div>
              <div>For {companyName || 'FACTORY'}</div>
              <div className="sap-gatepass-authorized">Authorised Signatory</div>
            </div>
          </div>
        </section>
        <div className="sap-gatepass-sap-footer">Printed by SAP Business One</div>
      </div>
    );
  },
);

SalesDispatchSapGatepassPrint.displayName = 'SalesDispatchSapGatepassPrint';

function SapField({
  label,
  value,
  multiline,
}: {
  label: string;
  value?: string | number | null;
  multiline?: boolean;
}) {
  return (
    <div className="sap-gatepass-field">
      <div className="sap-gatepass-field-label">{label}</div>
      <div className="sap-gatepass-field-separator">:</div>
      <div
        className={
          multiline ? 'sap-gatepass-field-value sap-multiline' : 'sap-gatepass-field-value'
        }
      >
        {formatMultiline(value)}
      </div>
    </div>
  );
}

function getSapGatepassDocuments(entry: SalesDispatchGateOut): SapGatepassDocument[] {
  if (entry.documents?.length) {
    return entry.documents.map((document) => ({
      ...document,
      key: String(document.id),
      items: getDocumentItems(entry, document),
    }));
  }

  return [
    {
      id: entry.sap_doc_entry,
      key: `${entry.document_type}:${entry.sap_doc_entry}`,
      document_type: entry.document_type,
      sap_doc_entry: entry.sap_doc_entry,
      sap_doc_num: entry.sap_doc_num,
      sap_doc_date: entry.sap_doc_date,
      sap_doc_total: entry.sap_doc_total,
      sap_branch_id: entry.sap_branch_id,
      sap_branch_name: entry.sap_branch_name,
      sap_reference: entry.sap_reference,
      sap_comments: entry.sap_comments,
      customer_code: entry.customer_code,
      customer_name: entry.customer_name,
      ship_to_code: entry.ship_to_code,
      ship_to_address: entry.ship_to_address,
      place_of_supply: entry.place_of_supply,
      bp_gstin: entry.bp_gstin,
      eway_bill: entry.eway_bill,
      from_warehouse: entry.from_warehouse,
      to_warehouse: entry.to_warehouse,
      warehouses: entry.warehouses,
      item_summary: entry.item_summary,
      base_refs: entry.base_refs,
      total_quantity: entry.total_quantity,
      total_litres: entry.total_litres,
      total_boxes: entry.total_boxes,
      total_weight: entry.total_weight,
      items: entry.items,
    },
  ];
}

function getDocumentItems(
  entry: SalesDispatchGateOut,
  document: SalesDispatchGateOutDocument,
): SalesDispatchItem[] {
  if (document.items?.length) return document.items;

  const matchedItems = entry.items.filter(
    (item) => item.document === document.id || item.document_sap_doc_num === document.sap_doc_num,
  );

  return matchedItems.length ? matchedItems : entry.documents?.length ? [] : entry.items;
}

function formatDocumentNumbers(entry: SalesDispatchGateOut, documents: SapGatepassDocument[]) {
  const numbers = entry.document_numbers?.length
    ? entry.document_numbers
    : documents.map((document) => document.sap_doc_num).filter(Boolean);
  return numbers.join(', ');
}

function sumDocuments(
  documents: SapGatepassDocument[],
  key: keyof Pick<
    SapGatepassDocument,
    'sap_doc_total' | 'total_boxes' | 'total_litres' | 'total_quantity' | 'total_weight'
  >,
) {
  return documents.reduce((total, document) => total + toNumber(document[key]), 0);
}

function sumItems(
  items: SalesDispatchItem[],
  key: keyof Pick<SalesDispatchItem, 'quantity' | 'total_boxes' | 'total_litres' | 'total_weight'>,
) {
  return items.reduce((total, item) => total + toNumber(item[key]), 0);
}

function formatItemWarehouse(item: SalesDispatchItem) {
  return item.warehouse_code || item.from_warehouse || item.to_warehouse || '';
}

function formatDash(value?: string | number | null) {
  if (value === null || value === undefined || String(value).trim() === '') return '-';
  return String(value);
}

function formatSapDate(value?: string | number | null) {
  if (value === null || value === undefined || String(value).trim() === '') return '-';

  const text = String(value).trim();
  const isoDate = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) {
    return `${Number(isoDate[3])}/${Number(isoDate[2])}/${isoDate[1]}`;
  }

  return text;
}

function formatMultiline(value?: string | number | null) {
  return formatDash(value)
    .split(/\r?\n/)
    .map((line, index) => (
      <span key={`${line}-${index}`}>
        {line}
        <br />
      </span>
    ));
}

function formatNumber(value?: string | number | null) {
  const numberValue = toNumber(value);
  return numberValue.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function toNumber(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return 0;
  const numberValue = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(numberValue) ? numberValue : 0;
}
