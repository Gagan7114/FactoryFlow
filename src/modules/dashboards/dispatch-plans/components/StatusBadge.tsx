import { Badge } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { DispatchPlanStatus } from '../types';

const STATUS_STYLES: Record<DispatchPlanStatus, string> = {
  PENDING: 'border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-950/30 dark:text-slate-300',
  BOOKED: 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-300',
  DISPATCHED: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300',
  CANCELLED: 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300',
};

const STATUS_LABELS: Record<DispatchPlanStatus, string> = {
  PENDING: 'Pending',
  BOOKED: 'Booked',
  DISPATCHED: 'Dispatched',
  CANCELLED: 'Cancelled',
};

interface StatusBadgeProps {
  status: DispatchPlanStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn('whitespace-nowrap', STATUS_STYLES[status], className)}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

