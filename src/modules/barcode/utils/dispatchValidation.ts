import type { DispatchScanLog, DispatchSession, DispatchSessionLine } from '../types';

const CLOSED_STATUSES = new Set([
  'COMPLETED',
  'CLOSED',
  'SAP_SYNC_FAILED',
  'CANCELLED',
]);

function toNumber(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value: string | number | null | undefined) {
  const parsed = toNumber(value);
  return parsed.toLocaleString('en-IN', { maximumFractionDigits: 3 });
}

function getAcceptedScanBoxes(scan: DispatchScanLog) {
  if (scan.entity_type === 'BOX' || scan.scan_type === 'BOX') return 1;
  const parsed = scan.parsed_barcode as { box_count_dispatched?: unknown } | null | undefined;
  const boxes = toNumber(parsed?.box_count_dispatched);
  return boxes > 0 ? boxes : 0;
}

export function getDispatchActiveLine(
  sessionOrLines: DispatchSession | DispatchSessionLine[] | null | undefined,
) {
  if (!sessionOrLines) return null;
  if (!Array.isArray(sessionOrLines) && sessionOrLines.active_line) {
    return sessionOrLines.active_line;
  }

  const lines = Array.isArray(sessionOrLines) ? sessionOrLines : sessionOrLines.lines;
  return (
    [...lines]
      .sort((a, b) => a.sequence_no - b.sequence_no || a.id - b.id)
      .find((line) => toNumber(line.scanned_qty) < toNumber(line.bill_qty)) ?? null
  );
}

export function getLineRemainingQty(line: DispatchSessionLine | null | undefined) {
  if (!line) return 0;
  return Math.max(toNumber(line.remaining_qty), 0);
}

export function isLineComplete(line: DispatchSessionLine | null | undefined) {
  if (!line) return false;
  return toNumber(line.scanned_qty) >= toNumber(line.bill_qty);
}

export function getLineProgress(line: DispatchSessionLine | null | undefined) {
  if (!line) return 0;
  const billQty = toNumber(line.bill_qty);
  if (billQty <= 0) return 0;
  return Math.min(Math.max((toNumber(line.scanned_qty) / billQty) * 100, 0), 100);
}

export function isLineLocked(
  line: DispatchSessionLine,
  sessionOrActiveLine: DispatchSession | DispatchSessionLine | null | undefined,
) {
  if (isLineComplete(line)) return false;

  const activeLine =
    sessionOrActiveLine && 'lines' in sessionOrActiveLine
      ? getDispatchActiveLine(sessionOrActiveLine)
      : sessionOrActiveLine;

  return Boolean(activeLine && line.id !== activeLine.id);
}

export function canSubmitDispatchScan(session: DispatchSession | null | undefined) {
  if (!session || CLOSED_STATUSES.has(session.status)) return false;
  return session.can_scan !== false && Boolean(getDispatchActiveLine(session));
}

export function canMarkDispatchComplete(session: DispatchSession | null | undefined) {
  if (!session || CLOSED_STATUSES.has(session.status)) return false;
  return session.can_dispatch && !getDispatchActiveLine(session);
}

export function formatDispatchScanMessage(scan: DispatchScanLog | null | undefined) {
  if (!scan) return '';
  if (scan.result === 'ACCEPTED') {
    const boxes = getAcceptedScanBoxes(scan);
    const qty = scan.qty ? `${formatNumber(scan.qty)} ${scan.uom}`.trim() : '';
    const qtyWithBoxes = boxes > 0
      ? [qty, `${formatNumber(boxes)} Boxes`].filter(Boolean).join(' / ')
      : qty;
    return qtyWithBoxes ? `Accepted ${scan.material_code} (${qtyWithBoxes})` : `Accepted ${scan.material_code}`;
  }
  return scan.reject_message || scan.reject_code || 'Scan rejected';
}
