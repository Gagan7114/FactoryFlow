import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  AssetStatusBadge,
  getAssetStatusLabel,
  getWorkOrderStatusLabel,
  WorkOrderStatusBadge,
} from '../components';

describe('AssetStatusBadge', () => {
  it('renders readable labels for maintenance asset statuses', () => {
    render(<AssetStatusBadge status="UNDER_REPAIR" />);
    expect(screen.getByText('Under Repair')).toBeInTheDocument();
    expect(getAssetStatusLabel('BREAKDOWN')).toBe('Breakdown');
  });

  it('renders readable labels for work order statuses', () => {
    render(<WorkOrderStatusBadge status="WAITING_VENDOR" />);
    expect(screen.getByText('Waiting Vendor')).toBeInTheDocument();
    expect(getWorkOrderStatusLabel('IN_PROGRESS')).toBe('In Progress');
  });
});
