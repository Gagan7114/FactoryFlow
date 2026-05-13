export type CustomerFlowStatus =
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'PENDING_QC'
  | 'PENDING_SAP_GR'
  | 'QC_ACCEPTED'
  | 'QC_PARTIAL'
  | 'QC_REJECTED'
  | 'POSTED';

export type CustomerFlowValue = string | boolean;

export const CUSTOMER_RETURN_FACTORY_HEAD_DECISION_LABELS: Record<string, string> = {
  ACCEPT_QC_OVERRIDE: 'Accept QC Override',
  RETURN_TO_VENDOR: 'Return to Vendor',
  HOLD_FOR_REVIEW: 'Hold for Review',
  SEND_FOR_RECHECK: 'Send for Recheck',
  SCRAP: 'Scrap',
};

export interface CustomerFlowItem {
  id: string;
  itemCode: string;
  itemName: string;
  orderQty: string;
  dispatchedQty: string;
  returnQty: string;
  acceptedQty: string;
  rejectedQty: string;
  uom: string;
  reason: string;
  condition: string;
}

export interface CustomerFlowEntry {
  id: string;
  entryNo: string;
  status: CustomerFlowStatus;
  values: Record<string, CustomerFlowValue>;
  items: CustomerFlowItem[];
  createdAt: string;
  updatedAt: string;
}

export const SALES_DISPATCH_KEY = 'gate.sales-dispatch.completed-entries';
export const CUSTOMER_RETURN_KEY = 'gate.customer-return.completed-entries';
export const CREDIT_NOTE_KEY = 'finance.credit-note.completed-entries';
export const DEBIT_NOTE_KEY = 'finance.debit-note.completed-entries';

export const SAMPLE_DELIVERIES: CustomerFlowEntry[] = [
  {
    id: 'sap-delivery-800001',
    entryNo: 'DLV-800001',
    status: 'COMPLETED',
    values: {
      salesOrderNo: 'SO-450001',
      outboundDeliveryNo: '800001',
      deliveryNoteNo: 'DN-800001',
      invoiceNo: 'INV-900001',
      customerCode: 'CUST-1024',
      customerName: 'North Retail Stores',
      shipTo: 'Delhi DC',
      transporterName: 'Jivo Contract Logistics',
      lrNo: 'LR-24001',
      ewayBillNo: 'EWB-7712001',
      sapStatus: 'Delivery ready for PGI',
      remarks: '',
    },
    items: [
      {
        id: 'line-1',
        itemCode: 'FG-BOX-001',
        itemName: '1L Oil Box',
        orderQty: '100',
        dispatchedQty: '100',
        returnQty: '',
        acceptedQty: '',
        rejectedQty: '',
        uom: 'BOX',
        reason: '',
        condition: '',
      },
    ],
    createdAt: '2026-05-01T09:00:00.000Z',
    updatedAt: '2026-05-01T09:00:00.000Z',
  },
  {
    id: 'sap-delivery-800002',
    entryNo: 'DLV-800002',
    status: 'COMPLETED',
    values: {
      salesOrderNo: 'SO-450002',
      outboundDeliveryNo: '800002',
      deliveryNoteNo: 'DN-800002',
      invoiceNo: 'INV-900002',
      customerCode: 'CUST-2088',
      customerName: 'West Wholesale',
      shipTo: 'Jaipur Hub',
      transporterName: 'FastMove Roadlines',
      lrNo: 'LR-24002',
      ewayBillNo: 'EWB-7712002',
      sapStatus: 'Delivery ready for PGI',
      remarks: '',
    },
    items: [
      {
        id: 'line-1',
        itemCode: 'FG-BOX-002',
        itemName: '5L Oil Box',
        orderQty: '60',
        dispatchedQty: '60',
        returnQty: '',
        acceptedQty: '',
        rejectedQty: '',
        uom: 'BOX',
        reason: '',
        condition: '',
      },
    ],
    createdAt: '2026-05-02T11:30:00.000Z',
    updatedAt: '2026-05-02T11:30:00.000Z',
  },
];

export function readCustomerFlowEntries(storageKey: string): CustomerFlowEntry[] {
  const rawEntries = window.localStorage.getItem(storageKey);
  if (!rawEntries) return [];

  try {
    return JSON.parse(rawEntries) as CustomerFlowEntry[];
  } catch {
    return [];
  }
}

export function writeCustomerFlowEntries(storageKey: string, entries: CustomerFlowEntry[]) {
  window.localStorage.setItem(storageKey, JSON.stringify(entries));
}

export function saveCustomerFlowEntry(storageKey: string, entry: CustomerFlowEntry) {
  writeCustomerFlowEntries(storageKey, [entry, ...readCustomerFlowEntries(storageKey)]);
}

export function upsertCustomerFlowEntry(storageKey: string, entry: CustomerFlowEntry) {
  const entries = readCustomerFlowEntries(storageKey);
  const existingIndex = entries.findIndex((currentEntry) => currentEntry.id === entry.id);

  if (existingIndex === -1) {
    writeCustomerFlowEntries(storageKey, [entry, ...entries]);
    return;
  }

  writeCustomerFlowEntries(
    storageKey,
    entries.map((currentEntry) => (currentEntry.id === entry.id ? entry : currentEntry)),
  );
}

export function findCustomerFlowEntry(storageKey: string, entryIdOrNo: string) {
  return readCustomerFlowEntries(storageKey).find(
    (entry) => entry.id === entryIdOrNo || entry.entryNo === entryIdOrNo,
  ) || null;
}

export function updateCustomerFlowEntry(
  storageKey: string,
  entryId: string,
  updater: (entry: CustomerFlowEntry) => CustomerFlowEntry,
) {
  let updatedEntry: CustomerFlowEntry | null = null;
  const entries = readCustomerFlowEntries(storageKey).map((entry) => {
    if (entry.id !== entryId) return entry;
    updatedEntry = updater(entry);
    return updatedEntry;
  });

  if (updatedEntry) {
    writeCustomerFlowEntries(storageKey, entries);
  }

  return updatedEntry;
}

export function getCustomerFlowValue(entry: CustomerFlowEntry, key: string): string {
  const value = entry.values[key];
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return value || '-';
}

export function getCustomerFlowRawValue(entry: CustomerFlowEntry, key: string): string {
  const value = entry.values[key];
  return typeof value === 'string' ? value : '';
}

export function getCustomerReturnStatusLabel(entry: CustomerFlowEntry) {
  if (entry.status === 'PENDING_QC') return 'PENDING QC';
  if (entry.status === 'PENDING_SAP_GR') return 'PENDING SAP GR';
  if (entry.status === 'IN_PROGRESS') return 'IN PROGRESS';
  if (entry.status === 'CANCELLED') return 'CANCELLED';
  if (entry.status === 'QC_ACCEPTED') return 'QC ACCEPTED';
  if (entry.status === 'QC_PARTIAL') return 'QC PARTIAL';
  if (entry.status === 'QC_REJECTED') {
    const factoryHeadDecision = getCustomerFlowRawValue(entry, 'factoryHeadDecision');
    if (factoryHeadDecision) {
      return `FH: ${
        CUSTOMER_RETURN_FACTORY_HEAD_DECISION_LABELS[factoryHeadDecision] || factoryHeadDecision
      }`;
    }
    return 'AWAITING FACTORY HEAD';
  }
  return entry.status;
}

export function isCustomerReturnAwaitingFactoryHead(entry: CustomerFlowEntry) {
  return entry.status === 'QC_REJECTED' && !getCustomerFlowRawValue(entry, 'factoryHeadDecision');
}

export function buildCustomerFlowEntryNo(prefix: string) {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timePart = now.toTimeString().slice(0, 8).replace(/:/g, '');
  return `${prefix}-${datePart}-${timePart}`;
}

export function formatCustomerFlowDateTime(date?: CustomerFlowValue, time?: CustomerFlowValue) {
  const dateLabel = typeof date === 'string' && date ? date : '';
  const timeLabel = typeof time === 'string' && time ? time : '';
  return [dateLabel, timeLabel].filter(Boolean).join(' ') || '-';
}

export function formatCustomerFlowTimestamp(value?: string) {
  if (!value) return '-';

  try {
    return new Date(value).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

export function buildCustomerFlowItemSummary(items: CustomerFlowItem[]) {
  if (items.length === 0) return '-';
  if (items.length === 1) return items[0].itemName || items[0].itemCode || '-';
  return `${items[0].itemName || items[0].itemCode} + ${items.length - 1} more`;
}

export function buildCustomerFlowSearchText(entry: CustomerFlowEntry) {
  return [
    entry.entryNo,
    entry.status,
    ...Object.values(entry.values).map((value) => String(value)),
    ...entry.items.flatMap((item) => [
      item.itemCode,
      item.itemName,
      item.orderQty,
      item.dispatchedQty,
      item.returnQty,
      item.acceptedQty,
      item.rejectedQty,
      item.uom,
      item.reason,
      item.condition,
    ]),
  ].join(' ');
}

export function getAvailableDispatchSources() {
  const localDispatches = readCustomerFlowEntries(SALES_DISPATCH_KEY)
    .filter((entry) => entry.status === 'COMPLETED');
  const localDeliveryNos = new Set(
    localDispatches.map((entry) => getCustomerFlowValue(entry, 'outboundDeliveryNo')),
  );

  return [
    ...localDispatches,
    ...SAMPLE_DELIVERIES.filter(
      (delivery) => !localDeliveryNos.has(getCustomerFlowValue(delivery, 'outboundDeliveryNo')),
    ),
  ];
}

export function getCreditableReturnEntries() {
  const creditNotes = readCustomerFlowEntries(CREDIT_NOTE_KEY);
  const creditedReturnNos = new Set(
    creditNotes
      .filter((entry) => entry.status !== 'CANCELLED')
      .map((entry) => getCustomerFlowValue(entry, 'customerReturnEntry')),
  );

  return readCustomerFlowEntries(CUSTOMER_RETURN_KEY)
    .filter((entry) => entry.status === 'COMPLETED')
    .filter((entry) => !creditedReturnNos.has(entry.entryNo));
}
