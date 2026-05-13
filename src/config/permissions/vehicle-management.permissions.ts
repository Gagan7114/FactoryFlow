export const VEHICLE_MANAGEMENT_MODULE_PREFIX = [
  'vehicle_management',
  'driver_management',
] as const;

export const VEHICLE_MANAGEMENT_PERMISSIONS = {
  VIEW: 'vehicle_management.view_vehicle',
  MANAGE_VEHICLES: 'vehicle_management.change_vehicle',
  MANAGE_TRANSPORTERS: 'vehicle_management.change_transporter',
  MANAGE_DRIVERS: 'driver_management.change_driver',
  VIEW_DISPATCH_LINKING: 'dispatch_plans.can_view_dispatch_plans',
  LINK_DISPATCH_VEHICLE: 'dispatch_plans.can_edit_dispatch_plans',
} as const;

export type VehicleManagementPermission =
  (typeof VEHICLE_MANAGEMENT_PERMISSIONS)[keyof typeof VEHICLE_MANAGEMENT_PERMISSIONS];
