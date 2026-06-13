import { describe, expect, it } from 'vitest';

import { getGateStatusClasses } from '../../utils/gateStatusClasses';

describe('getGateStatusClasses', () => {
  it.each([
    ['QC_PENDING', 'amber'],
    ['QC_IN_REVIEW', 'blue'],
    ['QC_AWAITING_QAM', 'violet'],
    ['QC_REJECTED', 'red'],
    ['QC_HOLD', 'orange'],
    ['QC_COMPLETED', 'violet'],
    ['ARRIVAL_SLIP_SUBMITTED', 'sky'],
    ['ARRIVAL_SLIP_REJECTED', 'red'],
    ['SECURITY_CHECK_DONE', 'cyan'],
  ])('maps %s to %s classes', (status, expectedColor) => {
    expect(getGateStatusClasses(status)).toContain(expectedColor);
  });

  it('normalizes labels from spaces and slashes before lookup', () => {
    expect(getGateStatusClasses('QC / Hold')).toContain('orange');
    expect(getGateStatusClasses('On Hold')).toContain('orange');
    expect(getGateStatusClasses('QC On Hold')).toContain('orange');
  });

  it('falls back to slate classes for unknown statuses', () => {
    expect(getGateStatusClasses('UNKNOWN_STATUS')).toContain('slate');
  });
});
