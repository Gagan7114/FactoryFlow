import {
  ArrowLeftRight,
  Building2,
  Factory,
  HardHat,
  LogIn,
  LogOut,
  Package,
  PackageX,
  RotateCcw,
  Search,
  Undo2,
  UtensilsCrossed,
  Wrench,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { GATE_PERMISSIONS } from '@/config/permissions';
import { ROUTES } from '@/config/routes.config';
import { usePermission } from '@/core/auth';
import { Card, CardContent, CardHeader, CardTitle, Input } from '@/shared/components/ui';

interface GateModuleCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  route: string;
  color: string;
  permissions: readonly string[];
  section: 'in' | 'out';
}

const gateModules: GateModuleCard[] = [
  {
    title: 'Raw Materials (RM/PM/Assets)',
    description: 'Receive purchase materials, packing materials, and assets through gate-in.',
    icon: <Package className="h-5 w-5" />,
    route: ROUTES.GATE.children?.RAW_MATERIALS.path || '/gate/raw-materials',
    color: 'text-blue-600',
    permissions: [GATE_PERMISSIONS.RAW_MATERIAL.VIEW, GATE_PERMISSIONS.RAW_MATERIAL.VIEW_FULL],
    section: 'in',
  },
  {
    title: 'Daily Needs (Food/Consumables)',
    description: 'Record consumables, food items, and routine supplies entering the plant.',
    icon: <UtensilsCrossed className="h-5 w-5" />,
    route: ROUTES.GATE.children?.DAILY_NEEDS.path || '/gate/daily-needs',
    color: 'text-yellow-600',
    permissions: [GATE_PERMISSIONS.DAILY_NEEDS.VIEW, GATE_PERMISSIONS.DAILY_NEEDS.VIEW_FULL],
    section: 'in',
  },
  {
    title: 'Maintenance (Spare parts/Tools)',
    description: 'Track maintenance spares, tools, and service material gate-in entries.',
    icon: <Wrench className="h-5 w-5" />,
    route: ROUTES.GATE.children?.MAINTENANCE.path || '/gate/maintenance',
    color: 'text-purple-600',
    permissions: [GATE_PERMISSIONS.MAINTENANCE.VIEW, GATE_PERMISSIONS.MAINTENANCE.VIEW_FULL],
    section: 'in',
  },
  {
    title: 'Construction (Civil/Building Work)',
    description: 'Manage civil work, building material, and contractor construction arrivals.',
    icon: <Building2 className="h-5 w-5" />,
    route: ROUTES.GATE.children?.CONSTRUCTION.path || '/gate/construction',
    color: 'text-orange-600',
    permissions: [GATE_PERMISSIONS.CONSTRUCTION.VIEW, GATE_PERMISSIONS.CONSTRUCTION.VIEW_FULL],
    section: 'in',
  },
  {
    title: 'Visitor/Labour',
    description: 'Register visitors, labour, contractors, and people movement at the gate.',
    icon: <HardHat className="h-5 w-5" />,
    route: ROUTES.GATE.children?.CONTRACTOR_LABOR.path || '/gate/visitor-labour',
    color: 'text-red-600',
    permissions: [GATE_PERMISSIONS.PERSON_GATE_IN.VIEW],
    section: 'in',
  },
  {
    title: 'Empty Vehicle In',
    description: 'Enter empty vehicles with the reason for later dispatch, BST, or movement.',
    icon: <LogIn className="h-5 w-5" />,
    route: ROUTES.GATE.children?.EMPTY_VEHICLE_IN.path || '/gate/empty-vehicle-in',
    color: 'text-sky-700',
    permissions: [
      GATE_PERMISSIONS.EMPTY_VEHICLE_IN.VIEW,
      GATE_PERMISSIONS.EMPTY_VEHICLE_IN.CREATE,
    ],
    section: 'in',
  },
  {
    title: 'BST In',
    description: 'Receive in-transit branch stock transfer vehicles and record receiving quantities.',
    icon: <ArrowLeftRight className="h-5 w-5" />,
    route: ROUTES.GATE.children?.BST_IN.path || '/gate/bst-in',
    color: 'text-emerald-700',
    permissions: [GATE_PERMISSIONS.BST_IN.VIEW, GATE_PERMISSIONS.BST_IN.CREATE],
    section: 'in',
  },
  {
    title: 'Rejected QC Return',
    description: 'Send rejected inward material back out after QC or factory decision.',
    icon: <PackageX className="h-5 w-5" />,
    route: ROUTES.GATE.children?.REJECTED_QC_RETURN.path || '/gate/rejected-qc-return',
    color: 'text-rose-600',
    permissions: [
      GATE_PERMISSIONS.REJECTED_QC_RETURN.VIEW,
      GATE_PERMISSIONS.REJECTED_QC_RETURN.CREATE,
    ],
    section: 'out',
  },
  {
    title: 'Empty Vehicle Out',
    description: 'Mark inward vehicles out when they leave without outbound goods.',
    icon: <LogOut className="h-5 w-5" />,
    route: ROUTES.GATE.children?.EMPTY_VEHICLE_OUT.path || '/gate/empty-vehicle-out',
    color: 'text-blue-700',
    permissions: [
      GATE_PERMISSIONS.EMPTY_VEHICLE_OUT.VIEW,
      GATE_PERMISSIONS.EMPTY_VEHICLE_OUT.CREATE,
    ],
    section: 'out',
  },
  {
    title: 'BST Out',
    description: 'Link an empty BST vehicle to a posted SAP stock transfer for gate-out.',
    icon: <ArrowLeftRight className="h-5 w-5" />,
    route: ROUTES.GATE.children?.BST_OUT.path || '/gate/bst-out',
    color: 'text-indigo-600',
    permissions: [GATE_PERMISSIONS.BST_OUT.VIEW, GATE_PERMISSIONS.BST_OUT.CREATE],
    section: 'out',
  },
  {
    title: 'BST Return',
    description: 'Record BST vehicles that returned before the destination branch received them.',
    icon: <RotateCcw className="h-5 w-5" />,
    route: ROUTES.GATE.children?.BST_RETURN.path || '/gate/bst-return',
    color: 'text-amber-700',
    permissions: [GATE_PERMISSIONS.BST_RETURN.VIEW, GATE_PERMISSIONS.BST_RETURN.CREATE],
    section: 'in',
  },
  {
    title: 'Customer Return In',
    description: 'Receive customer returned finished goods against completed sales dispatches.',
    icon: <Undo2 className="h-5 w-5" />,
    route: ROUTES.GATE.children?.CUSTOMER_RETURN.path || '/gate/customer-return',
    color: 'text-rose-700',
    permissions: [
      GATE_PERMISSIONS.CUSTOMER_RETURN.VIEW,
      GATE_PERMISSIONS.CUSTOMER_RETURN.CREATE,
    ],
    section: 'in',
  },
  {
    title: 'Repair Parts In',
    description: 'Receive repairable parts, tools, or maintenance items back from vendors.',
    icon: <RotateCcw className="h-5 w-5" />,
    route: ROUTES.GATE.children?.REPAIR_PARTS_IN.path || '/gate/repair-parts-in',
    color: 'text-emerald-700',
    permissions: [
      GATE_PERMISSIONS.REPAIR_MOVEMENT.VIEW,
      GATE_PERMISSIONS.REPAIR_MOVEMENT.CREATE,
    ],
    section: 'in',
  },
  {
    title: 'Repair Parts Out',
    description: 'Send repairable spare parts, tools, or maintenance items out to vendors.',
    icon: <Wrench className="h-5 w-5" />,
    route: ROUTES.GATE.children?.REPAIR_PARTS_OUT.path || '/gate/repair-parts-out',
    color: 'text-slate-600',
    permissions: [
      GATE_PERMISSIONS.REPAIR_MOVEMENT.VIEW,
      GATE_PERMISSIONS.REPAIR_MOVEMENT.CREATE,
    ],
    section: 'out',
  },
  {
    title: 'Job Work / Oil Refining',
    description: 'Record oil refining vehicle movement and link production orders later.',
    icon: <Factory className="h-5 w-5" />,
    route: ROUTES.GATE.children?.JOB_WORK.path || '/gate/job-work',
    color: 'text-cyan-600',
    permissions: [
      GATE_PERMISSIONS.DASHBOARD.VIEW,
      GATE_PERMISSIONS.JOB_WORK.VIEW,
      GATE_PERMISSIONS.JOB_WORK.CREATE,
    ],
    section: 'in',
  },
];

export default function GateDashboardPage() {
  const navigate = useNavigate();
  const { hasAnyPermission } = usePermission();
  const [searchTerm, setSearchTerm] = useState('');

  const visibleModules = useMemo(
    () => gateModules.filter((mod) => hasAnyPermission(mod.permissions)),
    [hasAnyPermission],
  );
  const filteredModules = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return visibleModules;

    return visibleModules.filter((module) => [
      module.title,
      module.description,
      module.section === 'in' ? 'gate in inward incoming receive' : 'gate out outward outgoing dispatch',
    ].join(' ').toLowerCase().includes(query));
  }, [searchTerm, visibleModules]);
  const gateInModules = filteredModules.filter((module) => module.section === 'in');
  const gateOutModules = filteredModules.filter((module) => module.section === 'out');

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gate Management</h2>
          <p className="text-muted-foreground">Complete gate control for all movements</p>
        </div>
        <div className="relative w-full lg:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search gate submodules"
            className="pl-9"
          />
        </div>
      </div>

      {filteredModules.length === 0 ? (
        <div className="flex h-24 items-center justify-center rounded-lg border text-sm text-muted-foreground">
          No gate submodules match this search
        </div>
      ) : (
        <>
          <GateModuleSection title="Gate In" modules={gateInModules} onOpen={navigate} />
          <GateModuleSection title="Gate Out" modules={gateOutModules} onOpen={navigate} />
        </>
      )}
    </div>
  );
}

function GateModuleSection({
  title,
  modules,
  onOpen,
}: {
  title: string;
  modules: GateModuleCard[];
  onOpen: (route: string) => void;
}) {
  if (modules.length === 0) return null;

  return (
    <div>
      <h3 className="mb-4 text-lg font-semibold">{title}</h3>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {modules.map((module) => (
          <Card
            key={module.route}
            className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
            onClick={() => onOpen(module.route)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{module.title}</CardTitle>
              <div className={module.color}>{module.icon}</div>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-5 text-muted-foreground">{module.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
