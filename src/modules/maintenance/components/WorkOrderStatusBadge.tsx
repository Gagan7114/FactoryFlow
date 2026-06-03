import { Badge } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { WorkOrderStatus } from '../types';
import { getWorkOrderStatusClass, getWorkOrderStatusLabel } from './statusLabels';

export function WorkOrderStatusBadge({ status }: { status: WorkOrderStatus }) {
  return (
    <Badge variant="outline" className={cn('whitespace-nowrap', getWorkOrderStatusClass(status))}>
      {getWorkOrderStatusLabel(status)}
    </Badge>
  );
}
