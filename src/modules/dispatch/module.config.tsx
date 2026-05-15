import { Truck } from 'lucide-react';
import { lazy } from 'react';
import { Navigate } from 'react-router-dom';

import { DISPATCH_PERMISSIONS, GRPO_PERMISSIONS } from '@/config/permissions';
import type { ModuleConfig } from '@/core/types';

const DispatchPlansDashboardPage = lazy(
  () => import('@/modules/dashboards/dispatch-plans/pages/DispatchPlansDashboardPage'),
);
const DispatchVehicleLinkingPage = lazy(
  () => import('@/modules/vehicle-management/pages/DispatchVehicleLinkingPage'),
);
const ServiceGRPODashboardPage = lazy(
  () => import('@/modules/grpo/pages/ServiceGRPODashboardPage'),
);
const ServicePendingEntriesPage = lazy(
  () => import('@/modules/grpo/pages/ServicePendingEntriesPage'),
);
const ServiceGRPOPreviewPage = lazy(
  () => import('@/modules/grpo/pages/ServiceGRPOPreviewPage'),
);
const ServiceGRPOHistoryPage = lazy(
  () => import('@/modules/grpo/pages/ServiceGRPOHistoryPage'),
);
const ServiceGRPOHistoryDetailPage = lazy(
  () => import('@/modules/grpo/pages/ServiceGRPOHistoryDetailPage'),
);
const OpenBiltiesPage = lazy(() => import('./pages/OpenBiltiesPage'));
const TransporterInvoicesPage = lazy(() => import('./pages/TransporterInvoicesPage'));
const TransporterInvoiceHistoryPage = lazy(
  () => import('./pages/TransporterInvoiceHistoryPage'),
);
const TransporterInvoiceDetailPage = lazy(
  () => import('./pages/TransporterInvoiceDetailPage'),
);

const dispatchViewPermissions = [
  DISPATCH_PERMISSIONS.VIEW_PLANS,
  DISPATCH_PERMISSIONS.LINK_VEHICLE,
  DISPATCH_PERMISSIONS.POST_BILTY_GRPO,
  GRPO_PERMISSIONS.VIEW_PENDING,
  GRPO_PERMISSIONS.PREVIEW,
  GRPO_PERMISSIONS.POST,
  GRPO_PERMISSIONS.VIEW_HISTORY,
  GRPO_PERMISSIONS.VIEW_POSTING,
  DISPATCH_PERMISSIONS.VIEW_OPEN_BILTIES,
  DISPATCH_PERMISSIONS.VIEW_TRANSPORTER_AP_INVOICE,
  DISPATCH_PERMISSIONS.POST_TRANSPORTER_AP_INVOICE,
] as const;

const serviceGRPOViewPermissions = [
  DISPATCH_PERMISSIONS.POST_BILTY_GRPO,
  GRPO_PERMISSIONS.VIEW_PENDING,
  GRPO_PERMISSIONS.PREVIEW,
  GRPO_PERMISSIONS.POST,
  GRPO_PERMISSIONS.VIEW_HISTORY,
  GRPO_PERMISSIONS.VIEW_POSTING,
] as const;

export const dispatchModuleConfig: ModuleConfig = {
  name: 'dispatch',
  routes: [
    {
      path: '/dispatch',
      element: <Navigate to="/dispatch/plans" replace />,
      layout: 'main',
      permissions: dispatchViewPermissions,
      breadcrumb: { label: 'Dispatch' },
    },
    {
      path: '/dispatch/plans',
      element: <DispatchPlansDashboardPage />,
      layout: 'main',
      permissions: [DISPATCH_PERMISSIONS.VIEW_PLANS],
      breadcrumb: { label: 'Dispatch Plans' },
    },
    {
      path: '/dispatch/vehicle-linking',
      element: <DispatchVehicleLinkingPage />,
      layout: 'main',
      permissions: [DISPATCH_PERMISSIONS.LINK_VEHICLE],
      breadcrumb: { label: 'Vehicle Linking' },
    },
    {
      path: '/dispatch/bilty-grpo',
      element: <ServiceGRPODashboardPage />,
      layout: 'main',
      permissions: serviceGRPOViewPermissions,
      breadcrumb: { label: 'Service GRPO' },
    },
    {
      path: '/dispatch/bilty-grpo/pending',
      element: <ServicePendingEntriesPage />,
      layout: 'main',
      permissions: [
        DISPATCH_PERMISSIONS.POST_BILTY_GRPO,
        GRPO_PERMISSIONS.VIEW_PENDING,
        GRPO_PERMISSIONS.POST,
      ],
      breadcrumb: { label: 'Pending Service GRPO' },
    },
    {
      path: '/dispatch/bilty-grpo/preview/:dispatchPlanId',
      element: <ServiceGRPOPreviewPage />,
      layout: 'main',
      permissions: [
        DISPATCH_PERMISSIONS.POST_BILTY_GRPO,
        GRPO_PERMISSIONS.PREVIEW,
        GRPO_PERMISSIONS.POST,
      ],
      breadcrumb: { label: 'Service GRPO Preview' },
    },
    {
      path: '/dispatch/bilty-grpo/history',
      element: <ServiceGRPOHistoryPage />,
      layout: 'main',
      permissions: [
        DISPATCH_PERMISSIONS.POST_BILTY_GRPO,
        GRPO_PERMISSIONS.VIEW_HISTORY,
        GRPO_PERMISSIONS.VIEW_POSTING,
      ],
      breadcrumb: { label: 'Service GRPO History' },
    },
    {
      path: '/dispatch/bilty-grpo/history/:postingId',
      element: <ServiceGRPOHistoryDetailPage />,
      layout: 'main',
      permissions: [
        DISPATCH_PERMISSIONS.POST_BILTY_GRPO,
        GRPO_PERMISSIONS.VIEW_POSTING,
        GRPO_PERMISSIONS.VIEW_HISTORY,
      ],
      breadcrumb: { label: 'Service GRPO Detail' },
    },
    {
      path: '/dispatch/open-bilties',
      element: <OpenBiltiesPage />,
      layout: 'main',
      permissions: [
        DISPATCH_PERMISSIONS.VIEW_OPEN_BILTIES,
        DISPATCH_PERMISSIONS.POST_TRANSPORTER_AP_INVOICE,
      ],
      breadcrumb: { label: 'Open Bilties' },
    },
    {
      path: '/dispatch/transporter-invoices',
      element: <TransporterInvoicesPage />,
      layout: 'main',
      permissions: [DISPATCH_PERMISSIONS.POST_TRANSPORTER_AP_INVOICE],
      breadcrumb: { label: 'Transporter Invoices' },
    },
    {
      path: '/dispatch/transporter-invoices/history',
      element: <TransporterInvoiceHistoryPage />,
      layout: 'main',
      permissions: [DISPATCH_PERMISSIONS.VIEW_TRANSPORTER_AP_INVOICE],
      breadcrumb: { label: 'Invoice History' },
    },
    {
      path: '/dispatch/transporter-invoices/history/:postingId',
      element: <TransporterInvoiceDetailPage />,
      layout: 'main',
      permissions: [DISPATCH_PERMISSIONS.VIEW_TRANSPORTER_AP_INVOICE],
      breadcrumb: { label: 'Invoice Detail' },
    },
  ],
  navigation: [
    {
      path: '/dispatch',
      title: 'Dispatch',
      icon: Truck,
      showInSidebar: true,
      permissions: dispatchViewPermissions,
      hasSubmenu: true,
      children: [
        {
          path: '/dispatch/plans',
          title: 'Plans',
          permissions: [DISPATCH_PERMISSIONS.VIEW_PLANS],
        },
        {
          path: '/dispatch/vehicle-linking',
          title: 'Vehicle Linking',
          permissions: [DISPATCH_PERMISSIONS.LINK_VEHICLE],
        },
        {
          path: '/dispatch/bilty-grpo',
          title: 'Service GRPO',
          permissions: serviceGRPOViewPermissions,
        },
        {
          path: '/dispatch/open-bilties',
          title: 'Open Bilties',
          permissions: [DISPATCH_PERMISSIONS.VIEW_OPEN_BILTIES],
        },
        {
          path: '/dispatch/transporter-invoices',
          title: 'Transporter Invoices',
          permissions: [DISPATCH_PERMISSIONS.POST_TRANSPORTER_AP_INVOICE],
        },
        {
          path: '/dispatch/transporter-invoices/history',
          title: 'Invoice History',
          permissions: [DISPATCH_PERMISSIONS.VIEW_TRANSPORTER_AP_INVOICE],
        },
      ],
    },
  ],
};
