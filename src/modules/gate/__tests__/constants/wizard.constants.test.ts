import { describe, expect, it } from 'vitest';

import { DEBOUNCE_CONFIG, TABLE_CONFIG, WIZARD_CONFIG } from '../../constants/wizard.constants';

describe('WIZARD_CONFIG', () => {
  it('keeps raw material wizard at five visible steps after removing security check', () => {
    expect(WIZARD_CONFIG.TOTAL_STEPS).toBe(5);
    expect(WIZARD_CONFIG.STEPS).toEqual({
      VEHICLE_DRIVER: 1,
      PO_RECEIPT: 2,
      ARRIVAL_SLIP: 3,
      WEIGHMENT: 4,
      ATTACHMENTS: 5,
    });
  });

  it('labels the visible steps without a security check step', () => {
    expect(WIZARD_CONFIG.STEP_TITLES).toEqual({
      1: 'Vehicle & Driver',
      2: 'PO Receipt',
      3: 'Arrival Slip',
      4: 'Weighment',
      5: 'Attachments',
    });
  });
});

describe('TABLE_CONFIG', () => {
  it('has MIN_WIDTH = 800px', () => {
    expect(TABLE_CONFIG.MIN_WIDTH).toBe('800px');
  });
});

describe('DEBOUNCE_CONFIG', () => {
  it('has SEARCH_DELAY = 100', () => {
    expect(DEBOUNCE_CONFIG.SEARCH_DELAY).toBe(100);
  });
});
