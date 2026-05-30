import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// GRPODashboardPage — File Content Verification
//
// Direct import hangs because GRPODashboardPage imports 10 icons
// from lucide-react and @/shared/components/ui (radix-ui chain).
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  return readFileSync(
    resolve(process.cwd(), 'src/modules/grpo/pages/GRPODashboardPage.tsx'),
    'utf-8',
  );
}

// ═══════════════════════════════════════════════════════════════
// Exports & Dependencies
// ═══════════════════════════════════════════════════════════════

describe('GRPODashboardPage — Exports', () => {
  it('default exports GRPODashboardPage function', () => {
    const content = readSource();
    expect(content).toContain('export default function GRPODashboardPage()');
  });

  it('imports icons from lucide-react', () => {
    const content = readSource();
    expect(content).toContain("from 'lucide-react'");
    expect(content).toContain('PackageCheck');
    expect(content).toContain('ChevronRight');
    expect(content).toContain('Clock');
    expect(content).toContain('CheckCircle2');
    expect(content).toContain('XCircle');
    expect(content).toContain('AlertCircle');
    expect(content).toContain('ShieldX');
    expect(content).toContain('RefreshCw');
    expect(content).toContain('History');
    expect(content).toContain('List');
  });

  it('imports UI components from @/shared/components/ui', () => {
    const content = readSource();
    expect(content).toContain("from '@/shared/components/ui'");
    expect(content).toContain('Button');
    expect(content).toContain('Card');
    expect(content).toContain('CardContent');
  });

  it('imports dashboard summary and pending hooks from api', () => {
    const content = readSource();
    expect(content).toContain('useGRPODashboardSummary');
    expect(content).toContain('usePendingGRPOEntries');
    expect(content).toContain("from '../api'");
  });

  it('imports ApiError type from @/core/api/types', () => {
    const content = readSource();
    expect(content).toContain('ApiError');
    expect(content).toContain("from '@/core/api/types'");
  });
});

// ═══════════════════════════════════════════════════════════════
// Header
// ═══════════════════════════════════════════════════════════════

describe('GRPODashboardPage — Header', () => {
  it('renders "GRPO Posting" heading', () => {
    const content = readSource();
    expect(content).toContain('>GRPO Posting</h2>');
  });

  it('renders subtitle about goods receipts', () => {
    const content = readSource();
    expect(content).toContain('Post goods receipts to SAP after gate entry completion');
  });

  it('has View Pending button', () => {
    const content = readSource();
    expect(content).toContain('View Pending');
    expect(content).toContain("navigate('/grpo/material/pending')");
  });
});

// ═══════════════════════════════════════════════════════════════
// Status Config & Counts
// ═══════════════════════════════════════════════════════════════

describe('GRPODashboardPage — Insight Config', () => {
  it('defines INSIGHT_CONFIG with pending, accepted, rejected, and posted', () => {
    const content = readSource();
    expect(content).toContain('INSIGHT_CONFIG');
    expect(content).toContain("label: 'Pending POs'");
    expect(content).toContain("label: 'QC Accepted'");
    expect(content).toContain("label: 'QC Rejected'");
    expect(content).toContain("label: 'SAP Posted'");
  });

  it('defines INSIGHT_ORDER array', () => {
    const content = readSource();
    expect(content).toContain("const INSIGHT_ORDER = ['pending', 'accepted', 'rejected', 'posted']");
  });

  it('uses dashboard summary values for insights', () => {
    const content = readSource();
    expect(content).toContain('insightValues');
    expect(content).toContain('summary?.qc_accepted_qty');
    expect(content).toContain('summary?.qc_rejected_qty');
    expect(content).toContain('summary?.posted_count');
  });

  it('calculates totalPendingPOs', () => {
    const content = readSource();
    expect(content).toContain('totalPendingPOs');
    expect(content).toContain('summary?.pending_po_count');
    expect(content).toContain('pendingEntries.reduce');
    expect(content).toContain('pending_po_count');
  });
});

// ═══════════════════════════════════════════════════════════════
// Summary Card
// ═══════════════════════════════════════════════════════════════

describe('GRPODashboardPage — Summary Card', () => {
  it('has Pending GRPO summary card', () => {
    const content = readSource();
    expect(content).toContain('Pending GRPO');
    expect(content).toContain('{pendingEntryCount}');
  });

  it('shows POs pending count', () => {
    const content = readSource();
    expect(content).toContain('{totalPendingPOs}');
    expect(content).toContain('POs pending');
  });
});

// ═══════════════════════════════════════════════════════════════
// States & Sections
// ═══════════════════════════════════════════════════════════════

describe('GRPODashboardPage — States & Sections', () => {
  it('shows loading spinner', () => {
    const content = readSource();
    expect(content).toContain('isLoading');
    expect(content).toContain('animate-spin');
  });

  it('handles permission error (403)', () => {
    const content = readSource();
    expect(content).toContain('isPermissionError');
    expect(content).toContain('Permission Denied');
  });

  it('handles general API error', () => {
    const content = readSource();
    expect(content).toContain('Failed to Load');
  });

  it('shows empty state for no pending entries', () => {
    const content = readSource();
    expect(content).toContain('No pending entries');
  });

  it('has Recent Pending Entries section', () => {
    const content = readSource();
    expect(content).toContain('Recent Pending Entries');
    expect(content).toContain('pendingEntries.slice(0, 5)');
  });

  it('has GRPO Insights overview section', () => {
    const content = readSource();
    expect(content).toContain('>GRPO Insights</h3>');
    expect(content).toContain('INSIGHT_ORDER.map');
  });

  it('has Quick Actions section', () => {
    const content = readSource();
    expect(content).toContain('Quick Actions');
    expect(content).toContain("navigate('/grpo/material/pending')");
    expect(content).toContain("navigate('/grpo/material/history')");
  });

  it('renders quick action buttons for Pending Entries and Posting History', () => {
    const content = readSource();
    expect(content).toContain('>Pending Entries</span>');
    expect(content).toContain('>Posting History</span>');
  });
});

// ═══════════════════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════════════════

describe('GRPODashboardPage — Utilities', () => {
  it('defines formatDateTime helper', () => {
    const content = readSource();
    expect(content).toContain('const formatDateTime');
    expect(content).toContain('toLocaleString');
  });
});
