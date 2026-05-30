// ============================================================================
// Filter Options
// ============================================================================

export const NON_MOVING_AGE_OPTIONS = [
  { value: 0, label: 'All Stock' },
  { value: 15, label: '15 Days' },
  { value: 30, label: '30 Days' },
  { value: 45, label: '45 Days' },
  { value: 90, label: '90 Days' },
  { value: 180, label: '180 Days' },
  { value: 365, label: '365 Days' },
] as const;

// ============================================================================
// Query Config
// ============================================================================

export const NON_MOVING_STALE_TIME = 5 * 60 * 1000; // 5 minutes
