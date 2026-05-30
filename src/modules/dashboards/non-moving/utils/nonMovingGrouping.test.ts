import { describe, expect, it } from 'vitest';

import type { NonMovingItem } from '../types';
import { groupNonMovingItemsBySku } from './nonMovingGrouping';

function makeItem(overrides: Partial<NonMovingItem>): NonMovingItem {
  return {
    branch: 'OIL',
    item_code: 'PM0000817',
    item_name: 'PREFORM 21/23 GMS',
    item_group_name: 'PACKAGING MATERIAL',
    sub_group: 'PREFORM',
    warehouse: 'BH-BS',
    quantity: 0,
    value: 0,
    last_movement_date: null,
    days_since_last_movement: 187,
    consumption_ratio: 0,
    ...overrides,
  };
}

describe('groupNonMovingItemsBySku', () => {
  it('sums quantity and value across warehouses for the same item', () => {
    const [grouped] = groupNonMovingItemsBySku([
      makeItem({ warehouse: 'BH-BS', quantity: 463104, value: 1478822.4 }),
      makeItem({ warehouse: 'BH-PM', quantity: 0, value: 0 }),
    ]);

    expect(grouped.quantity).toBe(463104);
    expect(grouped.value).toBe(1478822.4);
    expect(grouped.warehouse).toBe('2 warehouses');
  });

  it('uses the lowest idle days and matching movement details', () => {
    const [grouped] = groupNonMovingItemsBySku([
      makeItem({ warehouse: 'BH-BS', days_since_last_movement: 187, last_movement_date: null }),
      makeItem({
        warehouse: 'BH-PM',
        days_since_last_movement: 35,
        last_movement_date: '2026-04-15 00:00:00',
        consumption_ratio: 0.12,
      }),
    ]);

    expect(grouped.days_since_last_movement).toBe(35);
    expect(grouped.last_movement_date).toBe('2026-04-15 00:00:00');
    expect(grouped.consumption_ratio).toBe(0.12);
  });

  it('keeps the warehouse code when only one warehouse contributes', () => {
    const [grouped] = groupNonMovingItemsBySku([
      makeItem({ warehouse: 'BH-PM', days_since_last_movement: 35 }),
    ]);

    expect(grouped.warehouse).toBe('BH-PM');
  });
});
