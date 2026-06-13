import { ShieldCheck } from 'lucide-react';
import { lazy } from 'react';

import { AUDIT_PERMISSIONS } from '@/config/permissions';
import type { ModuleConfig } from '@/core/types';

const AuditLandingPage = lazy(() => import('./pages/AuditLandingPage'));
const AuditSubmitPage = lazy(() => import('./pages/AuditSubmitPage'));
const MyAuditSubmissionsPage = lazy(() => import('./pages/MyAuditSubmissionsPage'));
const AuditorQueuePage = lazy(() => import('./pages/AuditorQueuePage'));

const ANY_AUDIT_PERMISSION = [
  AUDIT_PERMISSIONS.SUBMIT,
  AUDIT_PERMISSIONS.VIEW,
  AUDIT_PERMISSIONS.AUDIT,
  AUDIT_PERMISSIONS.VIEW_ALL,
] as const;

export const auditModuleConfig: ModuleConfig = {
  name: 'audit',
  routes: [
    {
      path: '/audit',
      element: <AuditLandingPage />,
      layout: 'main',
      permissions: ANY_AUDIT_PERMISSION,
    },
    {
      path: '/audit/submit',
      element: <AuditSubmitPage />,
      layout: 'main',
      permissions: [AUDIT_PERMISSIONS.SUBMIT],
      breadcrumb: { label: 'Submit Invoice' },
    },
    {
      path: '/audit/my-submissions',
      element: <MyAuditSubmissionsPage />,
      layout: 'main',
      permissions: [AUDIT_PERMISSIONS.SUBMIT, AUDIT_PERMISSIONS.VIEW],
      breadcrumb: { label: 'My Submissions' },
    },
    {
      path: '/audit/queue',
      element: <AuditorQueuePage />,
      layout: 'main',
      permissions: [AUDIT_PERMISSIONS.AUDIT],
      breadcrumb: { label: 'Auditor Queue' },
    },
  ],
  navigation: [
    {
      path: '/audit',
      title: 'Audit',
      icon: ShieldCheck,
      showInSidebar: true,
      permissions: ANY_AUDIT_PERMISSION,
      hasSubmenu: true,
      children: [
        {
          path: '/audit/submit',
          title: 'Submit Invoice',
          permissions: [AUDIT_PERMISSIONS.SUBMIT],
        },
        {
          path: '/audit/my-submissions',
          title: 'My Submissions',
          permissions: [AUDIT_PERMISSIONS.SUBMIT, AUDIT_PERMISSIONS.VIEW],
        },
        {
          path: '/audit/queue',
          title: 'Auditor Queue',
          permissions: [AUDIT_PERMISSIONS.AUDIT],
        },
      ],
    },
  ],
};
