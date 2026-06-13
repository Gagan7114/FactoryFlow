// ═══════════════════════════════════════════════════════════════
// Gate Entry Full View API Tests
// ═══════════════════════════════════════════════════════════════
// Verifies that gateEntryFullViewApi exports exist and expose
// the expected method names for the PO gate entry full view.
// ═══════════════════════════════════════════════════════════════

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/core/api', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    patch: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

vi.mock('@/config/constants', () => ({
  API_ENDPOINTS: {
    GATE_CORE: {
      FULL_VIEW: vi.fn(),
      COMPLETE: vi.fn(),
    },
  },
}));

import { gateEntryFullViewApi } from '../../../api/gateEntryFullView/gateEntryFullView.api';

// ═══════════════════════════════════════════════════════════════
// Export existence
// ═══════════════════════════════════════════════════════════════

describe('gateEntryFullViewApi', () => {
  it('is defined as an object', () => {
    expect(gateEntryFullViewApi).toBeDefined();
    expect(typeof gateEntryFullViewApi).toBe('object');
  });

  // ═══════════════════════════════════════════════════════════════
  // Method existence
  // ═══════════════════════════════════════════════════════════════

  it('has a get method', () => {
    expect(typeof gateEntryFullViewApi.get).toBe('function');
  });

  it('has a complete method', () => {
    expect(typeof gateEntryFullViewApi.complete).toBe('function');
  });

  // ═══════════════════════════════════════════════════════════════
  // No unexpected methods
  // ═══════════════════════════════════════════════════════════════

  it('exposes exactly the expected methods', () => {
    const methodNames = Object.keys(gateEntryFullViewApi).sort();
    expect(methodNames).toEqual(['complete', 'get']);
  });

  it('types the backend QC summary and nested inspection payload', () => {
    const content = readFileSync(
      resolve(process.cwd(), 'src/modules/gate/api/gateEntryFullView/gateEntryFullView.api.ts'),
      'utf-8',
    );

    expect(content).toContain('qc_summary');
    expect(content).toContain('can_complete: boolean');
    expect(content).toContain('type RawMaterialQcStatusCode');
    expect(content).toContain("'HOLD'");
    expect(content).toContain('inspection?:');
    expect(content).toContain('workflow_status: InspectionWorkflowStatus');
    expect(content).toContain('final_status: InspectionFinalStatus');
  });
});
