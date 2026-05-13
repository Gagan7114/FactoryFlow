import { getGateStatusClasses } from '@/modules/gate/utils';
import { cn } from '@/shared/utils';

const BASE_STATUS_CLASSES =
  'inline-flex items-center whitespace-nowrap rounded-full border font-medium';

const STATUS_SIZE_CLASSES = {
  xs: 'px-1.5 py-0.5 text-[10px]',
  sm: 'px-2.5 py-0.5 text-xs',
} as const;

interface GateStatusBadgeProps {
  status?: string | number | null;
  label?: string | number | null;
  className?: string;
  size?: keyof typeof STATUS_SIZE_CLASSES;
}

export function GateStatusBadge({
  status,
  label,
  className,
  size = 'sm',
}: GateStatusBadgeProps) {
  return (
    <span
      className={cn(
        BASE_STATUS_CLASSES,
        STATUS_SIZE_CLASSES[size],
        getGateStatusClasses(status),
        className,
      )}
    >
      {label ?? status ?? '-'}
    </span>
  );
}
