import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

function readSource(): string {
  return readFileSync(
    resolve(process.cwd(), 'src/modules/gate/pages/shared/dashboardStatusConfig.ts'),
    'utf-8',
  );
}

describe('RAW_MATERIAL_STATUS_CONFIG', () => {
  it('contains all raw material backend gate statuses in the overview order', () => {
    const content = readSource();
    const statusKeys = [
      'draft',
      'security_check_done',
      'arrival_slip_submitted',
      'arrival_slip_rejected',
      'in_progress',
      'qc_pending',
      'qc_in_review',
      'qc_awaiting_qam',
      'qc_rejected',
      'qc_hold',
      'qc_completed',
      'completed',
      'cancelled',
    ];

    for (const key of statusKeys) {
      expect(content).toContain(`'${key}'`);
    }
  });

  it('defines visible labels for rejected, hold, and completed QC states', () => {
    const content = readSource();

    expect(content).toContain("label: 'QC Rejected'");
    expect(content).toContain("label: 'QC On Hold'");
    expect(content).toContain("label: 'QC Completed'");
  });
});
