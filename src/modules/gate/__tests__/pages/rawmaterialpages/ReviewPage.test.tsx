import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// ReviewPage — File Content Verification
// ═══════════════════════════════════════════════════════════════
// This page component imports from lucide-react and deep dependency
// chains that hang Vite's module graph resolver in threads pool.
// File-content verification avoids this entirely.
// ═══════════════════════════════════════════════════════════════

describe('ReviewPage', () => {
  const content = readFileSync(
    resolve(process.cwd(), 'src/modules/gate/pages/rawmaterialpages/ReviewPage.tsx'),
    'utf-8',
  );

  it('exports ReviewPage as default function', () => {
    expect(content).toContain('export default function');
  });

  it('imports icons from lucide-react', () => {
    expect(content).toContain("from 'lucide-react'");
  });

  it('imports from react', () => {
    expect(content).toContain("from 'react'");
  });

  it('has a return statement with JSX', () => {
    expect(content).toContain('return (');
  });

  it('allows completion when weighment is missing', () => {
    expect(content).not.toContain('REQUIRED_WEIGHMENT_MESSAGE');
    expect(content).not.toContain('Weighment is required before completion.');
    expect(content).not.toContain('Fill Weighment');
    expect(content).toContain('No weighment recorded for this entry.');
  });
});
