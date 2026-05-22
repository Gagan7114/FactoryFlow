import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

function readSource(): string {
  return readFileSync(
    resolve(process.cwd(), 'src/modules/grpo/pages/GRPOPreviewPage.tsx'),
    'utf-8',
  );
}

describe('GRPOPreviewPage file content', () => {
  const content = readSource();

  it('exports the preview page', () => {
    expect(content).toContain('export default function GRPOPreviewPage()');
  });

  it('loads GRPO and gate weighment APIs', () => {
    expect(content).toContain('useGRPOPreview');
    expect(content).toContain('usePostGRPO');
    expect(content).toContain('useWeighment');
    expect(content).toContain("from '@/modules/gate/api/weighment/weighment.queries'");
  });

  it('tracks tare weight in the merged GRPO form', () => {
    expect(content).toContain('interface MergedFormState');
    expect(content).toContain('tareWeight: string');
    expect(content).toContain("tareWeight: prev?.tareWeight ?? ''");
  });

  it('renders a weighment section in GRPO', () => {
    expect(content).toContain('Scale');
    expect(content).toContain('Weighment');
    expect(content).toContain('Gross Weight');
    expect(content).toContain('Tare Weight <span className="text-destructive">*</span>');
    expect(content).toContain('Net Weight');
    expect(content).toContain('calculatedNetWeight');
  });

  it('requires tare weight before posting GRPO', () => {
    expect(content).toContain('Gate gross weight is required before GRPO');
    expect(content).toContain('Tare weight is required');
    expect(content).toContain('Tare weight cannot be greater than gross weight');
  });

  it('sends tare weight with the GRPO post request', () => {
    expect(content).toContain('const result = await postGRPO.mutateAsync');
    expect(content).toContain('tare_weight: parseFloat(mergedForm.tareWeight)');
  });

  it('uses combined posting state for buttons', () => {
    expect(content).toContain('const isPosting = postGRPO.isPending');
    expect(content).toContain('disabled={isPosting}');
    expect(content).toContain("'Posting...'");
  });
});
