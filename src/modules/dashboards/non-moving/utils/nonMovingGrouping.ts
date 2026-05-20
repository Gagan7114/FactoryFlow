import type { NonMovingItem } from '../types';

interface GroupedNonMovingItem {
  item: NonMovingItem;
  warehouses: Set<string>;
}

function shouldUseMovementFrom(candidate: NonMovingItem, current: NonMovingItem): boolean {
  if (candidate.days_since_last_movement < current.days_since_last_movement) return true;
  return (
    candidate.days_since_last_movement === current.days_since_last_movement &&
    !current.last_movement_date &&
    Boolean(candidate.last_movement_date)
  );
}

export function groupNonMovingItemsBySku(items: NonMovingItem[]): NonMovingItem[] {
  const grouped = new Map<string, GroupedNonMovingItem>();

  for (const item of items) {
    const key = `${item.branch}::${item.item_code}`;
    const existing = grouped.get(key);

    if (!existing) {
      grouped.set(key, {
        item: { ...item },
        warehouses: new Set(item.warehouse ? [item.warehouse] : []),
      });
      continue;
    }

    existing.warehouses.add(item.warehouse);
    existing.item.quantity += item.quantity;
    existing.item.value += item.value;

    if (shouldUseMovementFrom(item, existing.item)) {
      existing.item.days_since_last_movement = item.days_since_last_movement;
      existing.item.last_movement_date = item.last_movement_date;
      existing.item.consumption_ratio = item.consumption_ratio;
    }
  }

  return [...grouped.values()].map(({ item, warehouses }) => {
    const warehouseList = [...warehouses].filter(Boolean);
    return {
      ...item,
      warehouse:
        warehouseList.length > 1
          ? `${warehouseList.length} warehouses`
          : (warehouseList[0] ?? item.warehouse),
    };
  });
}
