export const DISPATCH_MODULE_PREFIX = 'dispatch_plans';

export const DISPATCH_PERMISSIONS = {
  VIEW_PLANS: 'dispatch_plans.can_view_dispatch_plans',
  EDIT_PLANS: 'dispatch_plans.can_edit_dispatch_plans',
  LINK_VEHICLE: 'dispatch_plans.can_link_dispatch_vehicle',
  VIEW_OPEN_BILTIES: 'dispatch_plans.can_view_open_bilties',
  POST_BILTY_GRPO: 'dispatch_plans.can_post_bilty_service_grpo',
  VIEW_TRANSPORTER_AP_INVOICE: 'dispatch_plans.can_view_transporter_ap_invoice',
  POST_TRANSPORTER_AP_INVOICE: 'dispatch_plans.can_post_transporter_ap_invoice',
} as const;

export type DispatchPermission =
  (typeof DISPATCH_PERMISSIONS)[keyof typeof DISPATCH_PERMISSIONS];
