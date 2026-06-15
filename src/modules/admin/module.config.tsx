import { ShieldCheck } from 'lucide-react';
import { lazy } from 'react';

import { ADMIN_PERMISSIONS } from '@/config/permissions';
import type { ModuleConfig } from '@/core/types';

import { DockingApprovalsBadge } from './components/DockingApprovalsBadge';

const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const DockingScanApprovalsPage = lazy(() => import('./pages/DockingScanApprovalsPage'));

const dockingApprovalPermissions = [
  ADMIN_PERMISSIONS.DOCKING.VIEW_SCAN_SKIP,
  ADMIN_PERMISSIONS.DOCKING.APPROVE_SCAN_SKIP,
] as const;

export const adminModuleConfig: ModuleConfig = {
  name: 'admin',
  routes: [
    {
      path: '/admin',
      element: <AdminDashboardPage />,
      layout: 'main',
      permissions: dockingApprovalPermissions,
      breadcrumb: { label: 'Admin' },
    },
    {
      path: '/admin/docking/scan-approvals',
      element: <DockingScanApprovalsPage />,
      layout: 'main',
      permissions: dockingApprovalPermissions,
      breadcrumb: { label: 'Scan Skip Requests' },
    },
  ],
  navigation: [
    {
      path: '/admin',
      title: 'Admin',
      icon: ShieldCheck,
      showInSidebar: true,
      permissions: dockingApprovalPermissions,
      hasSubmenu: true,
      badge: DockingApprovalsBadge,
      children: [
        {
          path: '/admin/docking/scan-approvals',
          title: 'Docking Approvals',
          permissions: dockingApprovalPermissions,
          badge: DockingApprovalsBadge,
        },
      ],
    },
  ],
};
