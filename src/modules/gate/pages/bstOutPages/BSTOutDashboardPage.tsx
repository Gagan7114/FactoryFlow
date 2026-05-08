import { CheckCircle2, Clock, FileText, Plus, RefreshCw, Search, Truck, User } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useGlobalDateRange } from '@/core/store/hooks';
import { type BSTGateOutEntry, useBSTGateOutEntries } from '@/modules/gate/api';
import { DateRangePicker } from '@/modules/gate/components';
import { getLastStep } from '@/modules/gate/hooks';
import { Badge, Button, Card, CardContent, Input } from '@/shared/components/ui';

function formatDateTime(date?: string, time?: string) {
  if (!date && !time) return '-';
  return [date, time].filter(Boolean).join(' ');
}

function getBSTOutResumePath(entry: BSTGateOutEntry) {
  const vehicleEntryId = entry.vehicle_entry;

  if (entry.status === 'COMPLETED') {
    return `/gate/bst-out/new/review?entryId=${vehicleEntryId}`;
  }

  const lastStep = getLastStep(vehicleEntryId);

  switch (lastStep) {
    case 'review':
      return `/gate/bst-out/new/review?entryId=${vehicleEntryId}`;
    case 'attachments':
      return `/gate/bst-out/new/attachments?entryId=${vehicleEntryId}`;
    case 'step2':
      return `/gate/bst-out/new/step2?entryId=${vehicleEntryId}`;
    default:
      return `/gate/bst-out/new?entryId=${vehicleEntryId}`;
  }
}

export default function BSTOutDashboardPage() {
  const navigate = useNavigate();
  const { dateRange, dateRangeAsDateObjects, setDateRange } = useGlobalDateRange();
  const [searchTerm, setSearchTerm] = useState('');

  const queryParams = useMemo(
    () => ({
      from_date: dateRange.from,
      to_date: dateRange.to,
    }),
    [dateRange.from, dateRange.to],
  );

  const {
    data: entries = [],
    isLoading,
    refetch,
  } = useBSTGateOutEntries(queryParams);

  const inProgressCount = entries.filter((entry) => entry.status === 'IN_PROGRESS').length;
  const completedCount = entries.filter((entry) => entry.status === 'COMPLETED').length;
  const cancelledCount = entries.filter((entry) => entry.status === 'CANCELLED').length;
  const filteredEntries = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return entries;

    return entries.filter((entry) => (
      [
        entry.entry_no,
        entry.vehicle_number,
        entry.driver_name,
        entry.sap_doc_num,
        entry.sap_from_warehouse,
        entry.sap_to_warehouse,
        entry.gate_out_date,
        entry.out_time,
        entry.status,
      ].some((value) => String(value || '').toLowerCase().includes(query))
    ));
  }, [entries, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">BST Out</h2>
          <p className="text-muted-foreground">
            Link BST vehicles to posted SAP stock transfers and complete gate out
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
          <DateRangePicker
            date={dateRangeAsDateObjects}
            onDateChange={(date) => {
              if (date && 'from' in date) {
                setDateRange(date);
              } else {
                setDateRange(undefined);
              }
            }}
          />
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => navigate('/gate/bst-out/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Entry
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Clock className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold">{inProgressCount}</span>
            </div>
            <p className="mt-2 text-sm font-medium text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">{completedCount}</span>
            </div>
            <p className="mt-2 text-sm font-medium text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <FileText className="h-5 w-5 text-violet-600" />
              <span className="text-2xl font-bold">{entries.length}</span>
            </div>
            <p className="mt-2 text-sm font-medium text-muted-foreground">Total Entries</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <FileText className="h-5 w-5 text-red-600" />
              <span className="text-2xl font-bold">{cancelledCount}</span>
            </div>
            <p className="mt-2 text-sm font-medium text-muted-foreground">Cancelled</p>
          </CardContent>
        </Card>
      </div>

      <section>
        <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Truck className="h-4 w-4" />
            BST Gate-Out Entries
          </h3>
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search entry, vehicle, driver, SAP BST"
              className="pl-9"
            />
          </div>
        </div>
        {isLoading ? (
          <EmptyState text="Loading BST out entries..." />
        ) : entries.length === 0 ? (
          <EmptyState text="No BST out entries in this date range" />
        ) : filteredEntries.length === 0 ? (
          <EmptyState text="No BST out entries match this search" />
        ) : (
          <div className="overflow-hidden rounded-md border">
            <div className="max-h-[520px] overflow-auto">
              <table className="w-full min-w-[1100px]">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-3 text-left text-sm font-medium">Entry No.</th>
                    <th className="p-3 text-left text-sm font-medium">Vehicle</th>
                    <th className="p-3 text-left text-sm font-medium">Driver</th>
                    <th className="p-3 text-left text-sm font-medium">SAP BST</th>
                    <th className="p-3 text-left text-sm font-medium">From</th>
                    <th className="p-3 text-left text-sm font-medium">To</th>
                    <th className="p-3 text-left text-sm font-medium">Gate Out</th>
                    <th className="p-3 text-left text-sm font-medium">Status</th>
                    <th className="p-3 text-left text-sm font-medium">Lines</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => {
                    const isCancelled = entry.status === 'CANCELLED';
                    return (
                      <tr
                        key={entry.id}
                        className={
                          isCancelled
                            ? 'border-t opacity-70'
                            : 'cursor-pointer border-t transition-colors hover:bg-muted/50'
                        }
                        onClick={() => {
                          if (!isCancelled) {
                            navigate(getBSTOutResumePath(entry));
                          }
                        }}
                      >
                        <td className="whitespace-nowrap p-3 text-sm font-medium">
                          {entry.entry_no}
                        </td>
                        <td className="whitespace-nowrap p-3 text-sm">{entry.vehicle_number}</td>
                        <td className="whitespace-nowrap p-3 text-sm">
                          <span className="inline-flex items-center gap-1">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            {entry.driver_name}
                          </span>
                        </td>
                        <td className="whitespace-nowrap p-3 text-sm">{entry.sap_doc_num}</td>
                        <td className="whitespace-nowrap p-3 text-sm">
                          {entry.sap_from_warehouse || '-'}
                        </td>
                        <td className="whitespace-nowrap p-3 text-sm">
                          {entry.sap_to_warehouse || '-'}
                        </td>
                        <td className="whitespace-nowrap p-3 text-sm">
                          {formatDateTime(entry.gate_out_date, entry.out_time)}
                        </td>
                        <td className="whitespace-nowrap p-3 text-sm">
                          <Badge
                            variant={
                              entry.status === 'COMPLETED'
                                ? 'secondary'
                                : isCancelled
                                  ? 'destructive'
                                  : 'outline'
                            }
                          >
                            {entry.status}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap p-3 text-sm">{entry.items.length}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-24 items-center justify-center rounded-lg border text-sm text-muted-foreground">
      {text}
    </div>
  );
}
