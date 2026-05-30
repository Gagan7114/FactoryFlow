import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const content = readFileSync(
  resolve(process.cwd(), 'src/modules/gate/pages/maintenancePages/ReviewPage.tsx'),
  'utf-8',
);

describe('Maintenance ReviewPage', () => {
  it('completes directly without a security submit step', () => {
    expect(content).toContain('const handleComplete = async ()');
    expect(content).toContain('completeMaintenanceEntry.mutateAsync(entryIdNumber!)');
    expect(content).not.toContain('handleSubmitSecurity');
    expect(content).not.toContain('securityCheckApi');
    expect(content).not.toContain('Security Inspection Pending');
    expect(content).not.toContain('Submit Security');
  });

  it('keeps completion error handling', () => {
    expect(content).toContain('if (checkServerError(error))');
    expect(content).toContain('Cannot complete the entry at the moment. Please try again later.');
    expect(content).toContain("getErrorMessage(error, 'Failed to complete gate entry')");
  });
});
