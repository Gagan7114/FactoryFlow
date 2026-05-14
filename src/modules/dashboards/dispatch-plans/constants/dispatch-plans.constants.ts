import { format, startOfDay, subDays } from 'date-fns';

import type { DispatchPlanFilters } from '../types';
import type { DispatchPlanStatus } from '../types';

export const DISPATCH_PLAN_STALE_TIME = 60_000;

export const BOOKING_STATUS_OPTIONS: Array<{
  value: DispatchPlanStatus | 'all';
  label: string;
}> = [
  { value: 'all', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'BOOKED', label: 'Booked' },
  { value: 'DISPATCHED', label: 'Dispatched' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export const EDIT_BOOKING_STATUS_OPTIONS: Array<{
  value: DispatchPlanStatus;
  label: string;
}> = BOOKING_STATUS_OPTIONS.filter(
  (option): option is { value: DispatchPlanStatus; label: string } => option.value !== 'all',
);

export function createDefaultDispatchPlanFilters(): DispatchPlanFilters {
  const today = startOfDay(new Date());
  return {
    date_from: format(subDays(today, 7), 'yyyy-MM-dd'),
    date_to: format(today, 'yyyy-MM-dd'),
    booking_status: 'all',
    limit: 500,
  };
}
