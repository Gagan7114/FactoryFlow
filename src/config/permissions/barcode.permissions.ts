/**
 * Barcode Module Permissions
 *
 * Maps to Django permissions on barcode models.
 * Uses production_execution permissions initially since barcode
 * is tightly integrated with the production workflow.
 */

export const BARCODE_PERMISSIONS = {
  VIEW_PALLET: 'production_execution.can_view_production_run',
  CREATE_PALLET: 'production_execution.can_create_production_run',
  MANAGE_PALLET: 'production_execution.can_view_material_usage',
  VIEW_BOX: 'production_execution.can_view_production_run',
  CREATE_BOX: 'production_execution.can_create_production_run',
  MANAGE_BOX: 'production_execution.can_view_material_usage',
  VIEW_DISPATCH: 'barcode.can_view_barcode_dispatch',
  CREATE_DISPATCH: 'barcode.can_create_barcode_dispatch',
  SCAN_DISPATCH: 'barcode.can_scan_barcode_dispatch',
  COMPLETE_DISPATCH: 'barcode.can_complete_barcode_dispatch',
  CLOSE_DISPATCH: 'barcode.can_close_barcode_dispatch',
  RETRY_DISPATCH_SAP: 'barcode.can_retry_barcode_dispatch_sap',
  MANAGE_DISPATCH_SETTINGS: 'barcode.can_manage_barcode_dispatch_settings',
  VIEW_DISPATCH_REPORTS: 'barcode.can_view_barcode_dispatch_reports',
} as const;

export const BARCODE_MODULE_PREFIX = 'production_execution';

export type BarcodePermission = (typeof BARCODE_PERMISSIONS)[keyof typeof BARCODE_PERMISSIONS];
