import { format } from 'date-fns';
import { CalendarClock, CheckCircle2, Clock, RefreshCw, Search, Truck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { VEHICLE_MANAGEMENT_PERMISSIONS } from '@/config/permissions';
import { useAuth } from '@/core/auth/hooks/useAuth';
import { usePermission } from '@/core/auth/hooks/usePermission';
import type { DispatchBill } from '@/modules/dashboards/dispatch-plans/types';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  NativeSelect,
  SelectOption,
} from '@/shared/components/ui';

import { useDispatchLinkingPlans, useLinkDispatchVehicle } from '../api';
import { DispatchLinkingSheet, DispatchLinkingTable } from '../components';
import type {
  DispatchLinkingBucket,
  DispatchLinkingFilters,
  DispatchVehicleLinkPayload,
} from '../types';

const BUCKET_OPTIONS: Array<{ value: DispatchLinkingBucket; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'all', label: 'All Dated' },
];

function todayInputValue() {
  return format(new Date(), 'yyyy-MM-dd');
}

export default function DispatchVehicleLinkingPage() {
  const { currentCompany } = useAuth();
  const { hasPermission } = usePermission();
  const canEdit = hasPermission(VEHICLE_MANAGEMENT_PERMISSIONS.DISPATCH_VEHICLE_LINKING);

  const [filters, setFilters] = useState<DispatchLinkingFilters>({
    bucket: 'today',
    date: todayInputValue(),
    booking_status: 'all',
    limit: 2000,
  });
  const [searchDraft, setSearchDraft] = useState('');
  const [selectedBill, setSelectedBill] = useState<DispatchBill | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const effectiveFilters = useMemo(
    () => ({
      ...filters,
      search: searchDraft.trim() || undefined,
    }),
    [filters, searchDraft],
  );

  const plansQuery = useDispatchLinkingPlans(effectiveFilters, currentCompany?.company_id);
  const linkMutation = useLinkDispatchVehicle();

  const handleLink = (bill: DispatchBill) => {
    setSelectedBill(bill);
    setIsSheetOpen(true);
  };

  const handleSave = async (docEntry: number, payload: DispatchVehicleLinkPayload) => {
    try {
      await linkMutation.mutateAsync({ docEntry, payload });
      toast.success('Vehicle linked to dispatch plan');
      setIsSheetOpen(false);
      setSelectedBill(null);
    } catch {
      toast.error('Failed to link vehicle');
    }
  };

  const meta = plansQuery.data?.meta;

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Dispatch Vehicle Linking"
        description="Link transport to dispatch plans released by planning"
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => plansQuery.refetch()}
          disabled={plansQuery.isFetching}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </DashboardHeader>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Clock className="h-5 w-5 text-amber-600" />}
          label="Today"
          value={meta?.today ?? 0}
        />
        <StatCard
          icon={<CalendarClock className="h-5 w-5 text-red-600" />}
          label="Overdue"
          value={meta?.overdue ?? 0}
        />
        <StatCard
          icon={<Truck className="h-5 w-5 text-blue-600" />}
          label="Pending"
          value={meta?.pending ?? 0}
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5 text-green-600" />}
          label="Booked"
          value={meta?.booked ?? 0}
        />
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
        <div className="flex w-full flex-col gap-1.5 sm:w-auto">
          <Label htmlFor="dispatch-linking-date" className="text-xs font-semibold">
            Dispatch Date
          </Label>
          <Input
            id="dispatch-linking-date"
            type="date"
            value={filters.date}
            onChange={(event) =>
              setFilters((current) => ({ ...current, date: event.target.value }))
            }
            className="w-full sm:w-40"
          />
        </div>

        <div className="flex w-full flex-col gap-1.5 sm:w-auto">
          <Label htmlFor="dispatch-linking-status" className="text-xs">
            Status
          </Label>
          <NativeSelect
            id="dispatch-linking-status"
            value={filters.booking_status ?? 'all'}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                booking_status: event.target.value as DispatchLinkingFilters['booking_status'],
              }))
            }
            className="w-full sm:w-36"
          >
            <SelectOption value="all">All</SelectOption>
            <SelectOption value="PENDING">Pending</SelectOption>
            <SelectOption value="BOOKED">Booked</SelectOption>
            <SelectOption value="DISPATCHED">Dispatched</SelectOption>
            <SelectOption value="CANCELLED">Cancelled</SelectOption>
          </NativeSelect>
        </div>

        <div className="flex min-w-0 flex-1 basis-full flex-col gap-1.5 sm:min-w-64">
          <Label htmlFor="dispatch-linking-search" className="text-xs">
            Search
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="dispatch-linking-search"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Bill, customer, city, vehicle"
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          {BUCKET_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant={filters.bucket === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilters((current) => ({ ...current, bucket: option.value }))}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {plansQuery.error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load dispatch plans.
        </div>
      ) : (
        <DispatchLinkingTable
          bills={plansQuery.data?.data ?? []}
          isLoading={plansQuery.isLoading || plansQuery.isFetching}
          canEdit={canEdit}
          onLink={handleLink}
        />
      )}

      <DispatchLinkingSheet
        key={selectedBill?.doc_entry ?? 'empty'}
        bill={selectedBill}
        open={isSheetOpen}
        isSaving={linkMutation.isPending}
        onOpenChange={setIsSheetOpen}
        onSave={handleSave}
      />
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          {icon}
          <span className="text-2xl font-bold">{value}</span>
        </div>
        <p className="mt-2 text-sm font-medium text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
