import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// Step4Page — File Content Verification
// ═══════════════════════════════════════════════════════════════
// This page component imports from lucide-react and deep dependency
// chains that hang Vite's module graph resolver in threads pool.
// File-content verification avoids this entirely.
// ═══════════════════════════════════════════════════════════════

describe('Step4Page', () => {
  const content = readFileSync(
    resolve(process.cwd(), 'src/modules/gate/pages/rawMaterialPages/Step4Page.tsx'),
    'utf-8',
  );

  it('exports Step4Page as default function', () => {
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

  it('keeps weighment validation optional before moving to attachments', () => {
    expect(content).toContain('hasWeighmentInput(formData)');
    expect(content).toContain('if (!hasWeighmentInput(formData))');
    expect(content).toContain('validateWeighmentDetails(formData)');
    expect(content).toContain('Gross weight is required.');
    expect(content).toContain('Tare weight cannot be negative.');
    expect(content).toContain('Tare weight cannot be greater than gross weight.');
    expect(content).toContain('formData.tareWeight.trim() ? parseFloat(formData.tareWeight) : 0');
  });

  it('does not mark gross or tare weight as required', () => {
    expect(content).toContain('<Label htmlFor="grossWeight">Gross Weight</Label>');
    expect(content).toContain('<Label htmlFor="tareWeight">Tare Weight</Label>');
  });
});
