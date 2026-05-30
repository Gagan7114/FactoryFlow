import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const content = readFileSync(resolve(process.cwd(), 'src/modules/gate/module.config.tsx'), 'utf-8');

describe('Gate Module Config', () => {
  it('exports the gate module config', () => {
    expect(content).toContain("name: 'gate'");
    expect(content).toMatch(/export\s+const\s+gateModuleConfig/);
    expect(content).toContain(': ModuleConfig');
  });

  it('has unified gate dashboard and new-entry routes', () => {
    expect(content).toContain("path: '/gate'");
    expect(content).toContain("path: '/gate/new'");
    expect(content).toContain('element: <GateDashboardPage />');
    expect(content).toContain('element: <GateNewEntryPage />');
  });

  it('keeps legacy step2 URLs as redirects to details', () => {
    expect(content).toContain('function RedirectStep2ToDetails');
    expect(content).toContain('<RedirectStep2ToDetails routePrefix="/gate/raw-materials" />');
    expect(content).toContain('<RedirectStep2ToDetails routePrefix="/gate/daily-needs" />');
    expect(content).toContain('<RedirectStep2ToDetails routePrefix="/gate/maintenance" />');
    expect(content).toContain('<RedirectStep2ToDetails routePrefix="/gate/construction" />');
  });

  it('does not lazy-load the removed security check step pages', () => {
    expect(content).not.toContain("import('./pages/rawMaterialPages/Step2Page')");
    expect(content).not.toContain("import('./pages/dailyNeedsPages/Step2Page')");
    expect(content).not.toContain("import('./pages/maintenancePages/Step2Page')");
    expect(content).not.toContain("import('./pages/constructionPages/Step2Page')");
  });

  it('shows only dashboard and new entry in the Gate sidebar group', () => {
    expect(content).toContain("title: 'Gate'");
    expect(content).toContain("title: 'Dashboard'");
    expect(content).toContain("title: 'New Entry'");
  });
});
