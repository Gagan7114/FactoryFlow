export type RepairMovementValue = string | boolean;

export interface RepairMovementEntry {
  id: string;
  entryNo: string;
  status: 'COMPLETED' | 'CANCELLED';
  values: Record<string, RepairMovementValue>;
  createdAt: string;
  updatedAt: string;
}

export interface RepairMovementItem {
  id: string;
  itemDescription: string;
  serialNo: string;
  qty: string;
  uom: string;
  conditionOut: string;
}

export const REPAIR_PARTS_OUT_DRAFT_KEY = 'gate.repair-parts-out.form-draft';
export const REPAIR_PARTS_OUT_COMPLETED_KEY = 'gate.repair-parts-out.completed-entries';
export const REPAIR_PARTS_IN_DRAFT_KEY = 'gate.repair-parts-in.form-draft';
export const REPAIR_PARTS_IN_COMPLETED_KEY = 'gate.repair-parts-in.completed-entries';

export function readRepairMovementEntries(storageKey: string): RepairMovementEntry[] {
  const rawEntries = window.localStorage.getItem(storageKey);
  if (!rawEntries) return [];

  try {
    return JSON.parse(rawEntries) as RepairMovementEntry[];
  } catch {
    return [];
  }
}

export function findRepairMovementEntry(
  storageKey: string,
  entryIdOrNo: string,
): RepairMovementEntry | null {
  return readRepairMovementEntries(storageKey).find(
    (entry) => entry.id === entryIdOrNo || entry.entryNo === entryIdOrNo,
  ) || null;
}

export function cancelRepairMovementEntry(
  storageKey: string,
  entryId: string,
  cancelReason: string,
): RepairMovementEntry | null {
  const entries = readRepairMovementEntries(storageKey);
  let cancelledEntry: RepairMovementEntry | null = null;
  const now = new Date().toISOString();

  const nextEntries = entries.map((entry) => {
    if (entry.id !== entryId) return entry;

    cancelledEntry = {
      ...entry,
      status: 'CANCELLED',
      values: {
        ...entry.values,
        cancelReason,
        cancelledAt: now,
      },
      updatedAt: now,
    };
    return cancelledEntry;
  });

  if (!cancelledEntry) return null;

  window.localStorage.setItem(storageKey, JSON.stringify(nextEntries));
  return cancelledEntry;
}

export function getRepairMovementValue(entry: RepairMovementEntry, key: string): string {
  const value = entry.values[key];
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return value || '-';
}

export function parseRepairMovementItems(entry: RepairMovementEntry): RepairMovementItem[] {
  const rawItems = entry.values.items;

  if (typeof rawItems === 'string' && rawItems.trim()) {
    try {
      const parsedItems = JSON.parse(rawItems) as Partial<RepairMovementItem>[];
      if (Array.isArray(parsedItems)) {
        return parsedItems
          .map((item, index) => ({
            id: item.id || `line-${index + 1}`,
            itemDescription: item.itemDescription?.trim() || '',
            serialNo: item.serialNo?.trim() || '',
            qty: item.qty?.trim() || '',
            uom: item.uom?.trim() || '',
            conditionOut: item.conditionOut?.trim() || '',
          }))
          .filter((item) => item.itemDescription);
      }
    } catch {
      // Fall through to the legacy single-item values below.
    }
  }

  const itemDescription = getRepairMovementValue(entry, 'itemDescription');
  if (itemDescription === '-') return [];

  return [
    {
      id: 'legacy-item',
      itemDescription,
      serialNo: getRepairMovementValue(entry, 'serialNo') === '-'
        ? ''
        : getRepairMovementValue(entry, 'serialNo'),
      qty: getRepairMovementValue(entry, 'qty') === '-' ? '' : getRepairMovementValue(entry, 'qty'),
      uom: getRepairMovementValue(entry, 'uom') === '-' ? '' : getRepairMovementValue(entry, 'uom'),
      conditionOut: getRepairMovementValue(entry, 'conditionOut') === '-'
        ? ''
        : getRepairMovementValue(entry, 'conditionOut'),
    },
  ];
}

export function buildRepairMovementItemsSummary(entry: RepairMovementEntry): string {
  const items = parseRepairMovementItems(entry);
  if (items.length === 0) return '-';
  if (items.length === 1) return items[0].itemDescription;
  return `${items[0].itemDescription} + ${items.length - 1} more`;
}

export function buildRepairMovementQtySummary(entry: RepairMovementEntry): string {
  const items = parseRepairMovementItems(entry);
  if (items.length === 0) return '-';
  if (items.length > 1) return `${items.length} lines`;

  return [items[0].qty, items[0].uom].filter(Boolean).join(' ') || '-';
}

export function buildRepairMovementItemsSearchText(entry: RepairMovementEntry): string {
  return parseRepairMovementItems(entry)
    .map((item) => [
      item.itemDescription,
      item.serialNo,
      item.qty,
      item.uom,
      item.conditionOut,
    ].filter(Boolean).join(' '))
    .join(' ');
}

export function formatRepairMovementDate(value?: RepairMovementValue): string {
  if (!value || typeof value === 'boolean') return '-';

  try {
    return new Date(value).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return value;
  }
}

export function formatRepairMovementDateTime(value?: string): string {
  if (!value) return '-';

  try {
    return new Date(value).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

export function buildRepairMovementDateTimeLabel(
  date?: RepairMovementValue,
  time?: RepairMovementValue,
): string {
  const dateLabel = formatRepairMovementDate(date);
  const timeLabel = typeof time === 'string' && time ? time : '';
  return [dateLabel, timeLabel].filter((part) => part && part !== '-').join(' ') || '-';
}
