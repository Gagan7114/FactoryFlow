import { describe, expect, it } from 'vitest';

import {
  BARCODE_MODULE_PREFIX,
  BARCODE_PERMISSIONS,
} from '@/config/permissions/barcode.permissions';

describe('BARCODE_PERMISSIONS', () => {
  it('uses barcode app permissions for pallet and box access', () => {
    expect(BARCODE_PERMISSIONS.VIEW_PALLET).toBe('barcode.view_pallet');
    expect(BARCODE_PERMISSIONS.CREATE_PALLET).toBe('barcode.add_pallet');
    expect(BARCODE_PERMISSIONS.MANAGE_PALLET).toBe('barcode.change_pallet');
    expect(BARCODE_PERMISSIONS.VIEW_BOX).toBe('barcode.view_box');
    expect(BARCODE_PERMISSIONS.CREATE_BOX).toBe('barcode.add_box');
    expect(BARCODE_PERMISSIONS.MANAGE_BOX).toBe('barcode.change_box');
  });

  it('uses barcode custom permissions for dispatch access', () => {
    expect(BARCODE_PERMISSIONS.VIEW_DISPATCH).toBe('barcode.can_view_barcode_dispatch');
    expect(BARCODE_PERMISSIONS.CREATE_DISPATCH).toBe('barcode.can_create_barcode_dispatch');
    expect(BARCODE_PERMISSIONS.SCAN_DISPATCH).toBe('barcode.can_scan_barcode_dispatch');
    expect(BARCODE_PERMISSIONS.VIEW_DISPATCH_REPORTS).toBe(
      'barcode.can_view_barcode_dispatch_reports',
    );
  });

  it('all values start with barcode app prefix', () => {
    for (const permission of Object.values(BARCODE_PERMISSIONS)) {
      expect(permission).toMatch(/^barcode\./);
    }
  });
});

describe('BARCODE_MODULE_PREFIX', () => {
  it('is barcode', () => {
    expect(BARCODE_MODULE_PREFIX).toBe('barcode');
  });
});
