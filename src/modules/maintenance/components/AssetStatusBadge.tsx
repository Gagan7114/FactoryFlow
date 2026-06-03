import { Badge } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { AssetStatus } from '../types';
import { getAssetStatusClass, getAssetStatusLabel } from './statusLabels';

export function AssetStatusBadge({ status }: { status: AssetStatus }) {
  return (
    <Badge variant="outline" className={cn('whitespace-nowrap', getAssetStatusClass(status))}>
      {getAssetStatusLabel(status)}
    </Badge>
  );
}
