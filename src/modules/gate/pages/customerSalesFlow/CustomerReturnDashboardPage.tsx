import { CheckCircle2, Clock, PackageX, Plus, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Badge, Button, Card, CardContent, Input } from '@/shared/components/ui';

import {
  buildCustomerFlowItemSummary,
  buildCustomerFlowSearchText,
  CUSTOMER_RETURN_KEY,
  type CustomerFlowEntry,
  formatCustomerFlowDateTime,
  getCustomerFlowValue,
  getCustomerReturnStatusLabel,
  isCustomerReturnAwaitingFactoryHead,
  readCustomerFlowEntries,
} from './customerSalesFlow.storage';

export default function CustomerReturnDashboardPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const entries = useMemo(() => {
    void refreshKey;
    return readCustomerFlowEntries(CUSTOMER_RETURN_KEY);
  }, [refreshKey]);

  const filteredEntries = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return entries;
    return entries.filter((entry) => buildCustomerFlowSearchText(entry).toLowerCase().includes(query));
  }, [entries, searchTerm]);

  const pendingQcCount = entries.filter((entry) => entry.status === 'PENDING_QC').length;
  const inProgressCount = entries.filter((entry) => entry.status === 'IN_PROGRESS').length;
  const acceptedCount = entries.filter((entry) => ['QC_ACCEPTED', 'QC_PARTIAL'].includes(entry.status)).length;
  const rejectedCount = entries.filter((entry) => (
    entry.status === 'QC_REJECTED' && !isCustomerReturnAwaitingFactoryHead(entry)
  )).length;
  const awaitingFactoryHeadCount = entries.filter(isCustomerReturnAwaitingFactoryHead).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Customer Return In</h2>
          <p className="text-muted-foreground">
            Receive customer returns against completed sales dispatches
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" onClick={() => setRefreshKey((key) => key + 1)}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => navigate('/gate/customer-return/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Entry
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<PackageX className="h-5 w-5 text-blue-600" />} label="In Progress" value={inProgressCount} />
        <StatCard icon={<Clock className="h-5 w-5 text-amber-600" />} label="Pending QC" value={pendingQcCount} />
        <StatCard icon={<CheckCircle2 className="h-5 w-5 text-green-600" />} label="Accepted" value={acceptedCount} />
        <StatCard icon={<ShieldCheck className="h-5 w-5 text-amber-700" />} label="Awaiting Factory Head" value={awaitingFactoryHeadCount} />
        <StatCard icon={<ShieldCheck className="h-5 w-5 text-red-600" />} label="Final Rejected" value={rejectedCount} />
      </div>

      <section>
        <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <PackageX className="h-4 w-4" />
            Customer Return Entries
          </h3>
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search return, dispatch, customer, vehicle"
              className="pl-9"
            />
          </div>
        </div>

        {entries.length === 0 ? (
          <EmptyState text="No customer return entries yet" />
        ) : filteredEntries.length === 0 ? (
          <EmptyState text="No customer returns match this search" />
        ) : (
          <ReturnTable entries={filteredEntries} />
        )}
      </section>
    </div>
  );
}

function ReturnTable({ entries }: { entries: CustomerFlowEntry[] }) {
  const navigate = useNavigate();

  return (
    <div className="overflow-hidden rounded-md border">
      <div className="max-h-[520px] overflow-auto">
        <table className="w-full min-w-[1100px]">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 text-left text-sm font-medium">Entry No.</th>
              <th className="p-3 text-left text-sm font-medium">Dispatch</th>
              <th className="p-3 text-left text-sm font-medium">Customer</th>
              <th className="p-3 text-left text-sm font-medium">Items</th>
              <th className="p-3 text-left text-sm font-medium">Vehicle</th>
              <th className="p-3 text-left text-sm font-medium">Gate In</th>
              <th className="p-3 text-left text-sm font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                key={entry.id}
                className="cursor-pointer border-t transition-colors hover:bg-muted/50"
                      onClick={() => {
                        if (entry.status === 'IN_PROGRESS') {
                          navigate(`/gate/customer-return/new/attachments?entryId=${encodeURIComponent(entry.id)}`);
                          return;
                        }

                        navigate(`/gate/customer-return/${entry.id}`);
                      }}
              >
                <td className="whitespace-nowrap p-3 text-sm font-medium">{entry.entryNo}</td>
                <td className="whitespace-nowrap p-3 text-sm">{getCustomerFlowValue(entry, 'dispatchEntry')}</td>
                <td className="p-3 text-sm">{getCustomerFlowValue(entry, 'customerName')}</td>
                <td className="p-3 text-sm">{buildCustomerFlowItemSummary(entry.items)}</td>
                <td className="whitespace-nowrap p-3 text-sm">{getCustomerFlowValue(entry, 'vehicleNo')}</td>
                <td className="whitespace-nowrap p-3 text-sm">
                  {formatCustomerFlowDateTime(entry.values.gateInDate, entry.values.inTime)}
                </td>
                <td className="whitespace-nowrap p-3 text-sm">
                  <StatusBadge entry={entry} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ entry }: { entry: CustomerFlowEntry }) {
  if (entry.status === 'PENDING_QC' || entry.status === 'IN_PROGRESS') {
    return <Badge variant="warning">{getCustomerReturnStatusLabel(entry)}</Badge>;
  }
  if (entry.status === 'QC_REJECTED' || entry.status === 'CANCELLED') {
    return <Badge variant="destructive">{getCustomerReturnStatusLabel(entry)}</Badge>;
  }
  return <Badge variant="success">{getCustomerReturnStatusLabel(entry)}</Badge>;
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
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

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-24 items-center justify-center rounded-lg border text-sm text-muted-foreground">
      {text}
    </div>
  );
}
