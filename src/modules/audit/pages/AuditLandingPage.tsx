import { ClipboardCheck, FilePlus2, ListChecks } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { AUDIT_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';

interface AuditCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  route: string;
  color: string;
  permissions: readonly string[];
}

const cards: AuditCard[] = [
  {
    title: 'Submit Invoice',
    description: 'Create a new invoice-tracker entry for Factory, Mayapuri, Mart or Import/Export.',
    icon: <FilePlus2 className="h-5 w-5" />,
    route: '/audit/submit',
    color: 'text-indigo-600',
    permissions: [AUDIT_PERMISSIONS.SUBMIT],
  },
  {
    title: 'My Submissions',
    description: 'Track the audit status of invoices you have submitted.',
    icon: <ListChecks className="h-5 w-5" />,
    route: '/audit/my-submissions',
    color: 'text-emerald-600',
    permissions: [AUDIT_PERMISSIONS.SUBMIT, AUDIT_PERMISSIONS.VIEW],
  },
  {
    title: 'Auditor Queue',
    description: 'Delhi office: receive documents and pre-audit pending invoices.',
    icon: <ClipboardCheck className="h-5 w-5" />,
    route: '/audit/queue',
    color: 'text-amber-600',
    permissions: [AUDIT_PERMISSIONS.AUDIT],
  },
];

export default function AuditLandingPage() {
  const navigate = useNavigate();
  const { hasAnyPermission } = usePermission();

  const visibleCards = useMemo(
    () => cards.filter((card) => hasAnyPermission(card.permissions)),
    [hasAnyPermission],
  );

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Audit"
        description="Invoice tracker submission and pre-audit workflow"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {visibleCards.map((card) => (
          <Card
            key={card.route}
            className="cursor-pointer transition-shadow hover:shadow-md"
            onClick={() => navigate(card.route)}
          >
            <CardHeader>
              <div className={card.color}>{card.icon}</div>
              <CardTitle className="text-base">{card.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
