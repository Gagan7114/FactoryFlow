import {
  BarChart3,
  Bell,
  Boxes,
  CalendarCheck,
  ClipboardList,
  Factory,
  FileText,
  LayoutDashboard,
  Package,
  Settings,
  Wrench,
} from 'lucide-react';
import { lazy } from 'react';

import {
  GATE_PERMISSIONS,
  MAINTENANCE_MODULE_PREFIX,
  MAINTENANCE_PERMISSIONS,
} from '@/config/permissions';
import type { ModuleConfig } from '@/core/types';

const MaintenanceDashboardPage = lazy(() => import('./pages/MaintenanceDashboardPage'));
const MaintenanceAssetsPage = lazy(() => import('./pages/MaintenanceAssetsPage'));
const MaintenanceAssetDetailPage = lazy(() => import('./pages/MaintenanceAssetDetailPage'));
const MaintenanceAutomationPage = lazy(() => import('./pages/MaintenanceAutomationPage'));
const MaintenanceMastersPage = lazy(() => import('./pages/MaintenanceMastersPage'));
const MaintenancePMPage = lazy(() => import('./pages/MaintenancePMPage'));
const MaintenanceReportsPage = lazy(() => import('./pages/MaintenanceReportsPage'));
const MaintenanceSparesPage = lazy(() => import('./pages/MaintenanceSparesPage'));
const MaintenanceWorkOrdersPage = lazy(() => import('./pages/MaintenanceWorkOrdersPage'));
const MaintenanceWorkOrderDetailPage = lazy(() => import('./pages/MaintenanceWorkOrderDetailPage'));

export const maintenanceModuleConfig: ModuleConfig = {
  name: 'maintenance',
  routes: [
    {
      path: '/maintenance',
      element: <MaintenanceDashboardPage />,
      layout: 'main',
      permissions: [MAINTENANCE_PERMISSIONS.VIEW_DASHBOARD],
      breadcrumb: { label: 'Maintenance' },
    },
    {
      path: '/maintenance/assets',
      element: <MaintenanceAssetsPage />,
      layout: 'main',
      permissions: [MAINTENANCE_PERMISSIONS.VIEW_ASSET],
      breadcrumb: { label: 'Assets' },
    },
    {
      path: '/maintenance/assets/:assetId',
      element: <MaintenanceAssetDetailPage />,
      layout: 'main',
      permissions: [MAINTENANCE_PERMISSIONS.VIEW_ASSET],
      breadcrumb: { label: 'Asset' },
    },
    {
      path: '/maintenance/work-orders',
      element: <MaintenanceWorkOrdersPage />,
      layout: 'main',
      permissions: [MAINTENANCE_PERMISSIONS.VIEW_WORK_ORDER],
      breadcrumb: { label: 'Work Orders' },
    },
    {
      path: '/maintenance/work-orders/:workOrderId',
      element: <MaintenanceWorkOrderDetailPage />,
      layout: 'main',
      permissions: [MAINTENANCE_PERMISSIONS.VIEW_WORK_ORDER],
      breadcrumb: { label: 'Work Order' },
    },
    {
      path: '/maintenance/spares',
      element: <MaintenanceSparesPage />,
      layout: 'main',
      permissions: [MAINTENANCE_PERMISSIONS.VIEW_SPARE],
      breadcrumb: { label: 'Store / Spares' },
    },
    {
      path: '/maintenance/pm',
      element: <MaintenancePMPage />,
      layout: 'main',
      permissions: [MAINTENANCE_PERMISSIONS.VIEW_PM],
      breadcrumb: { label: 'PM / Checklist' },
    },
    {
      path: '/maintenance/reports',
      element: <MaintenanceReportsPage />,
      layout: 'main',
      permissions: [MAINTENANCE_PERMISSIONS.VIEW_REPORTS],
      breadcrumb: { label: 'Reports' },
    },
    {
      path: '/maintenance/automation',
      element: <MaintenanceAutomationPage />,
      layout: 'main',
      permissions: [MAINTENANCE_PERMISSIONS.VIEW_MODULE],
      breadcrumb: { label: 'Automation' },
    },
    {
      path: '/maintenance/masters',
      element: <MaintenanceMastersPage />,
      layout: 'main',
      permissions: [
        MAINTENANCE_PERMISSIONS.VIEW_ASSET_CATEGORY,
        MAINTENANCE_PERMISSIONS.VIEW_ASSET_LOCATION,
        MAINTENANCE_PERMISSIONS.VIEW_ASSET_DEPARTMENT,
        MAINTENANCE_PERMISSIONS.MANAGE_SETTINGS,
      ],
      breadcrumb: { label: 'Masters' },
    },
  ],
  navigation: [
    {
      path: '/maintenance',
      title: 'Maintenance',
      icon: Wrench,
      showInSidebar: true,
      modulePrefix: MAINTENANCE_MODULE_PREFIX,
      hasSubmenu: true,
      children: [
        {
          path: '/maintenance',
          title: 'Dashboard',
          icon: LayoutDashboard,
          permissions: [MAINTENANCE_PERMISSIONS.VIEW_DASHBOARD],
        },
        {
          path: '/maintenance/assets',
          title: 'Assets',
          icon: Factory,
          permissions: [MAINTENANCE_PERMISSIONS.VIEW_ASSET],
        },
        {
          path: '/maintenance/work-orders',
          title: 'Work Orders',
          icon: ClipboardList,
          permissions: [MAINTENANCE_PERMISSIONS.VIEW_WORK_ORDER],
        },
        {
          path: '/maintenance/spares',
          title: 'Store / Spares',
          icon: Boxes,
          permissions: [MAINTENANCE_PERMISSIONS.VIEW_SPARE],
        },
        {
          path: '/maintenance/pm',
          title: 'PM / Checklist',
          icon: CalendarCheck,
          permissions: [MAINTENANCE_PERMISSIONS.VIEW_PM],
        },
        {
          path: '/maintenance/reports',
          title: 'Reports',
          icon: BarChart3,
          permissions: [MAINTENANCE_PERMISSIONS.VIEW_REPORTS],
        },
        {
          path: '/maintenance/automation',
          title: 'Automation',
          icon: Bell,
          permissions: [MAINTENANCE_PERMISSIONS.VIEW_MODULE],
        },
        {
          path: '/maintenance/masters',
          title: 'Masters',
          icon: Settings,
          permissions: [
            MAINTENANCE_PERMISSIONS.VIEW_ASSET_CATEGORY,
            MAINTENANCE_PERMISSIONS.VIEW_ASSET_LOCATION,
            MAINTENANCE_PERMISSIONS.VIEW_ASSET_DEPARTMENT,
            MAINTENANCE_PERMISSIONS.MANAGE_SETTINGS,
          ],
        },
        {
          path: '/gate/maintenance',
          title: 'Gate Material In',
          icon: Package,
          permissions: [GATE_PERMISSIONS.MAINTENANCE.VIEW, GATE_PERMISSIONS.MAINTENANCE.VIEW_FULL],
        },
        {
          path: '/gate/repair-parts-out',
          title: 'Repair Movement',
          icon: FileText,
          permissions: [
            GATE_PERMISSIONS.REPAIR_MOVEMENT.VIEW,
            GATE_PERMISSIONS.REPAIR_MOVEMENT.CREATE,
          ],
        },
      ],
    },
  ],
};
