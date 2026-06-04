export const SALES_PLANNING_REQUIREMENT_STALE_TIME = 2 * 60 * 1000;
export const SALES_PLANNING_REQUIREMENT_PAGE_SIZE = 50;

export const SALES_PLANNING_STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'shortage', label: 'Shortage' },
  { value: 'po_covered', label: 'PO Covered' },
] as const;
