import { PackageCheck } from 'lucide-react';
import { lazy } from 'react';
import { Navigate } from 'react-router-dom';

import { GRPO_PERMISSIONS } from '@/config/permissions';
import type { ModuleConfig } from '@/core/types';

// Lazy load GRPO pages
const GRPODashboardPage = lazy(() => import('./pages/GRPODashboardPage'));
const PendingEntriesPage = lazy(() => import('./pages/PendingEntriesPage'));
const AllEntriesPage = lazy(() => import('./pages/AllEntriesPage'));
const GRPOPreviewPage = lazy(() => import('./pages/GRPOPreviewPage'));
const GRPOHistoryPage = lazy(() => import('./pages/GRPOHistoryPage'));
const GRPOHistoryDetailPage = lazy(() => import('./pages/GRPOHistoryDetailPage'));
const ServiceGRPODashboardPage = lazy(() => import('./pages/ServiceGRPODashboardPage'));
const ServicePendingEntriesPage = lazy(() => import('./pages/ServicePendingEntriesPage'));
const ServiceGRPOPreviewPage = lazy(() => import('./pages/ServiceGRPOPreviewPage'));
const ServiceGRPOHistoryPage = lazy(() => import('./pages/ServiceGRPOHistoryPage'));
const ServiceGRPOHistoryDetailPage = lazy(
  () => import('./pages/ServiceGRPOHistoryDetailPage'),
);

/**
 * GRPO module configuration
 *
 * Route permissions: Controls who can access each page (ProtectedRoute)
 * Navigation permissions: Controls what appears in sidebar and dashboard cards
 */
export const grpoModuleConfig: ModuleConfig = {
  name: 'grpo',
  routes: [
    // Dashboard - requires pending view permission
    {
      path: '/grpo',
      element: <Navigate to="/grpo/material" replace />,
      layout: 'main',
      permissions: [GRPO_PERMISSIONS.VIEW_PENDING],
      breadcrumb: { label: 'GRPO' },
    },
    {
      path: '/grpo/material',
      element: <GRPODashboardPage />,
      layout: 'main',
      permissions: [GRPO_PERMISSIONS.VIEW_PENDING],
      breadcrumb: { label: 'Material GRPO' },
    },
    // Pending entries list
    {
      path: '/grpo/material/pending',
      element: <PendingEntriesPage />,
      layout: 'main',
      permissions: [GRPO_PERMISSIONS.VIEW_PENDING],
    },
    // All entries list (gate / QC / done)
    {
      path: '/grpo/material/all-entries',
      element: <AllEntriesPage />,
      layout: 'main',
      permissions: [GRPO_PERMISSIONS.VIEW_PENDING],
    },
    // Preview and post GRPO
    {
      path: '/grpo/material/preview/:vehicleEntryId',
      element: <GRPOPreviewPage />,
      layout: 'main',
      permissions: [GRPO_PERMISSIONS.PREVIEW],
    },
    // Posting history
    {
      path: '/grpo/material/history',
      element: <GRPOHistoryPage />,
      layout: 'main',
      permissions: [GRPO_PERMISSIONS.VIEW_HISTORY],
    },
    // Posting detail
    {
      path: '/grpo/material/history/:postingId',
      element: <GRPOHistoryDetailPage />,
      layout: 'main',
      permissions: [GRPO_PERMISSIONS.VIEW_POSTING],
    },
    {
      path: '/grpo/pending',
      element: <Navigate to="/grpo/material/pending" replace />,
      layout: 'main',
      permissions: [GRPO_PERMISSIONS.VIEW_PENDING],
    },
    {
      path: '/grpo/all-entries',
      element: <Navigate to="/grpo/material/all-entries" replace />,
      layout: 'main',
      permissions: [GRPO_PERMISSIONS.VIEW_PENDING],
    },
    {
      path: '/grpo/preview/:vehicleEntryId',
      element: <GRPOPreviewPage />,
      layout: 'main',
      permissions: [GRPO_PERMISSIONS.PREVIEW],
    },
    {
      path: '/grpo/history',
      element: <Navigate to="/grpo/material/history" replace />,
      layout: 'main',
      permissions: [GRPO_PERMISSIONS.VIEW_HISTORY],
    },
    {
      path: '/grpo/history/:postingId',
      element: <GRPOHistoryDetailPage />,
      layout: 'main',
      permissions: [GRPO_PERMISSIONS.VIEW_POSTING],
    },
    {
      path: '/grpo/service',
      element: <ServiceGRPODashboardPage />,
      layout: 'main',
      permissions: [GRPO_PERMISSIONS.VIEW_PENDING],
      breadcrumb: { label: 'Service GRPO' },
    },
    {
      path: '/grpo/service/pending',
      element: <ServicePendingEntriesPage />,
      layout: 'main',
      permissions: [GRPO_PERMISSIONS.VIEW_PENDING],
    },
    {
      path: '/grpo/service/preview/:dispatchPlanId',
      element: <ServiceGRPOPreviewPage />,
      layout: 'main',
      permissions: [GRPO_PERMISSIONS.PREVIEW],
    },
    {
      path: '/grpo/service/history',
      element: <ServiceGRPOHistoryPage />,
      layout: 'main',
      permissions: [GRPO_PERMISSIONS.VIEW_HISTORY],
    },
    {
      path: '/grpo/service/history/:postingId',
      element: <ServiceGRPOHistoryDetailPage />,
      layout: 'main',
      permissions: [GRPO_PERMISSIONS.VIEW_POSTING],
    },
  ],
  navigation: [
    {
      path: '/grpo',
      title: 'GRPO',
      icon: PackageCheck,
      showInSidebar: true,
      permissions: [GRPO_PERMISSIONS.VIEW_PENDING],
      hasSubmenu: true,
      children: [
        {
          path: '/grpo/material',
          title: 'Material GRPO',
          permissions: [GRPO_PERMISSIONS.VIEW_PENDING],
        },
        {
          path: '/grpo/material/pending',
          title: 'Material Pending',
          permissions: [GRPO_PERMISSIONS.VIEW_PENDING],
        },
        {
          path: '/grpo/material/all-entries',
          title: 'Material All Entries',
          permissions: [GRPO_PERMISSIONS.VIEW_PENDING],
        },
        {
          path: '/grpo/material/history',
          title: 'Material History',
          permissions: [GRPO_PERMISSIONS.VIEW_HISTORY],
        },
        {
          path: '/grpo/service',
          title: 'Service GRPO',
          permissions: [GRPO_PERMISSIONS.VIEW_PENDING],
        },
        {
          path: '/grpo/service/pending',
          title: 'Service Pending',
          permissions: [GRPO_PERMISSIONS.VIEW_PENDING],
        },
        {
          path: '/grpo/service/history',
          title: 'Service History',
          permissions: [GRPO_PERMISSIONS.VIEW_HISTORY],
        },
      ],
    },
  ],
};
