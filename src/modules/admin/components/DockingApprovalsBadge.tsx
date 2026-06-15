import { ADMIN_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { useDockingScanSkipRequests } from '@/modules/admin/api';
import { cn } from '@/shared/utils';

/**
 * Live count of pending docking scan-skip requests, rendered as a small pill in the
 * sidebar. Renders nothing when there are no pending requests or the user cannot view them.
 */
export function DockingApprovalsBadge({ className }: { className?: string }) {
  const { hasAnyPermission } = usePermission();
  const canView = hasAnyPermission([
    ADMIN_PERMISSIONS.DOCKING.VIEW_SCAN_SKIP,
    ADMIN_PERMISSIONS.DOCKING.APPROVE_SCAN_SKIP,
  ]);

  const { data } = useDockingScanSkipRequests(
    { status: 'PENDING' },
    { enabled: canView },
  );

  const count = data?.length ?? 0;
  if (count <= 0) return null;

  return (
    <span
      className={cn(
        'inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold leading-none text-white',
        className,
      )}
      aria-label={`${count} pending docking approval${count === 1 ? '' : 's'}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
