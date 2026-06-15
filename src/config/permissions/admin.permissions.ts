/**
 * Admin Module Permissions
 *
 * These constants map to Django permissions defined in the backend `docking_admin` app.
 * Format: 'app_label.permission_codename'
 */

export const ADMIN_PERMISSIONS = {
  DOCKING: {
    /** Operator can request to skip box scanning for a docking entry */
    REQUEST_SCAN_SKIP: 'docking_admin.can_request_docking_scan_skip',
    /** View docking scan skip requests (admin queue) */
    VIEW_SCAN_SKIP: 'docking_admin.can_view_docking_scan_skip',
    /** Approve or reject docking scan skip requests */
    APPROVE_SCAN_SKIP: 'docking_admin.can_approve_docking_scan_skip',
  },
} as const;

/** Module prefix for sidebar filtering */
export const ADMIN_MODULE_PREFIX = 'docking_admin';

/** Type for admin permission values (Django backend permissions). */
export type AdminPermission =
  (typeof ADMIN_PERMISSIONS.DOCKING)[keyof typeof ADMIN_PERMISSIONS.DOCKING];
