import type {
  ProductionMovementItem,
  ProductionMovementRecentItem,
} from '../types';

/**
 * Collapse raw movement rows into a list of recently-issued items.
 *
 * Keeps the most recent OUT (issue) movement per item code and sorts the
 * resulting list newest-first.
 */
export function deriveRecentItems(
  movements: ProductionMovementItem[],
): ProductionMovementRecentItem[] {
  const latestByItem = new Map<string, ProductionMovementItem>();

  for (const movement of movements) {
    if (movement.out_qty <= 0 || !movement.item_code) {
      continue;
    }

    const existing = latestByItem.get(movement.item_code);
    if (!existing || movement.date > existing.date) {
      latestByItem.set(movement.item_code, movement);
    }
  }

  return Array.from(latestByItem.values())
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .map((movement) => ({
      item_code: movement.item_code,
      item_name: movement.item_name,
      last_issue_qty: movement.out_qty,
      warehouse: movement.warehouse,
      doc_num: movement.doc_num,
      date: movement.date,
    }));
}
