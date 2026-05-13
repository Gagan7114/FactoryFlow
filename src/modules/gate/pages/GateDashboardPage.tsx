import { ArrowRight, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { usePermission } from '@/core/auth';
import { Badge, Button, Card, CardContent, Input } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { GATE_ENTRY_TYPES, type GateEntryTypeConfig } from '../constants/gateEntryTypes';

const directionLabels: Record<GateEntryTypeConfig['direction'], string> = {
  in: 'Gate In',
  out: 'Gate Out',
  return: 'Gate In',
};

const directionSearchText: Record<GateEntryTypeConfig['direction'], string> = {
  in: 'gate in inward incoming receive',
  out: 'gate out outward outgoing dispatch',
  return: 'return returned receiving back',
};

export default function GateDashboardPage() {
  const navigate = useNavigate();
  const { hasAnyPermission } = usePermission();
  const [searchTerm, setSearchTerm] = useState('');

  const visibleEntryTypes = useMemo(
    () => GATE_ENTRY_TYPES.filter((entryType) => hasAnyPermission(entryType.viewPermissions)),
    [hasAnyPermission],
  );

  const filteredEntryTypes = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return visibleEntryTypes;

    return visibleEntryTypes.filter((entryType) =>
      [
        entryType.title,
        entryType.description,
        directionLabels[entryType.direction],
        directionSearchText[entryType.direction],
        entryType.vehicleMode === 'vehicle' ? 'vehicle truck tanker' : 'person visitor labour',
        ...entryType.keywords,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [searchTerm, visibleEntryTypes]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gate Management</h2>
          <p className="text-muted-foreground">Complete gate control for all movements</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto lg:items-center">
          <div className="relative w-full sm:w-96">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search type, document, vehicle, reason"
              className="pl-9"
            />
          </div>
          <Button className="w-full sm:w-auto" onClick={() => navigate('/gate/new')}>
            <Plus className="h-4 w-4" />
            New Entry
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {filteredEntryTypes.length === 0 ? (
            <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
              No gate entry types match this search
            </div>
          ) : (
            <div className="divide-y">
              {filteredEntryTypes.map((entryType) => (
                <EntryTypeRow
                  key={entryType.id}
                  entryType={entryType}
                  onOpen={() => navigate(entryType.dashboardRoute)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EntryTypeRow({
  entryType,
  onOpen,
}: {
  entryType: GateEntryTypeConfig;
  onOpen: () => void;
}) {
  const Icon = entryType.icon;

  return (
    <button
      type="button"
      className="grid w-full gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/50 md:grid-cols-[minmax(0,1fr)_auto_auto]"
      onClick={onOpen}
    >
      <span className="flex min-w-0 items-start gap-3">
        <span className="rounded-md border p-2">
          <Icon className={cn('h-4 w-4', entryType.colorClassName)} />
        </span>
        <span className="min-w-0">
          <span className="block font-medium">{entryType.title}</span>
          <span className="line-clamp-2 text-sm leading-5 text-muted-foreground">
            {entryType.description}
          </span>
        </span>
      </span>

      <span className="flex flex-wrap gap-2 md:justify-end">
        <Badge variant="outline">{directionLabels[entryType.direction]}</Badge>
      </span>

      <span className="hidden items-center text-sm font-medium text-muted-foreground md:flex">
        Open
        <ArrowRight className="ml-2 h-4 w-4" />
      </span>
    </button>
  );
}
