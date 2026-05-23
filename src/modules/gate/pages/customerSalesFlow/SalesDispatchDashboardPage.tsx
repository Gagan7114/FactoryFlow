import { CheckCircle2, Clock, FileText, Plus, RefreshCw, Search, Truck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useGlobalDateRange } from '@/core/store/hooks';
import { DateRangePicker, GateStatusBadge } from '@/modules/gate/components';
import { ExcelExportButton } from '@/shared/components/dashboard/ExcelExportButton';
import { Button, Card, CardContent, Input } from '@/shared/components/ui';

import {
  buildCustomerFlowItemSummary,
  buildCustomerFlowSearchText,
  type CustomerFlowEntry,
  formatCustomerFlowDateTime,
  getCustomerFlowValue,
  readCustomerFlowEntries,
  SALES_DISPATCH_KEY,
} from './customerSalesFlow.storage';
import { exportCustomerFlowDashboard } from './exportCustomerFlowDashboards';

export default function SalesDispatchDashboardPage() {
  const navigate = useNavigate();
  const { dateRange, dateRangeAsDateObjects, setDateRange } = useGlobalDateRange();
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const storedEntries = useMemo(() => {
    void refreshKey;
    return readCustomerFlowEntries(SALES_DISPATCH_KEY);
  }, [refreshKey]);

  const entries = useMemo(() => {
    return storedEntries.filter((entry) => {
      const gateOutDate = getCustomerFlowValue(entry, 'gateOutDate');
      const comparableDate = gateOutDate !== '-' ? gateOutDate : entry.createdAt.slice(0, 10);

      if (dateRange.from && comparableDate < dateRange.from) return false;
      if (dateRange.to && comparableDate > dateRange.to) return false;
      return true;
    });
  }, [dateRange.from, dateRange.to, storedEntries]);

  const filteredEntries = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return entries;
    return entries.filter((entry) => buildCustomerFlowSearchText(entry).toLowerCase().includes(query));
  }, [entries, searchTerm]);

  const completedCount = entries.filter((entry) => entry.status === 'COMPLETED').length;
  const inProgressCount = entries.filter((entry) => entry.status === 'IN_PROGRESS').length;
  const cancelledCount = entries.filter((entry) => entry.status === 'CANCELLED').length;
  const pgiPostedCount = entries.filter(
    (entry) => getCustomerFlowValue(entry, 'goodsIssuePosted') === 'Yes',
  ).length;

  const handleExport = () => {
    exportCustomerFlowDashboard({
      mode: 'sales-dispatch',
      entries: filteredEntries,
      dateRange,
      searchTerm,
      summary: [
        {
          label: 'In Progress',
          value: filteredEntries.filter((entry) => entry.status === 'IN_PROGRESS').length,
        },
        {
          label: 'Completed',
          value: filteredEntries.filter((entry) => entry.status === 'COMPLETED').length,
        },
        {
          label: 'PGI Posted',
          value: filteredEntries.filter(
            (entry) => getCustomerFlowValue(entry, 'goodsIssuePosted') === 'Yes',
          ).length,
        },
        {
          label: 'Cancelled',
          value: filteredEntries.filter((entry) => entry.status === 'CANCELLED').length,
        },
      ],
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Sales Dispatch Out</h2>
          <p className="text-muted-foreground">
            Verify outbound deliveries, truck documents, and customer dispatch gate-out
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
          <ExcelExportButton
            onExport={handleExport}
            disabled={filteredEntries.length === 0}
            disabledReason="No dispatch entries to export"
          />
          <Button variant="outline" onClick={() => setRefreshKey((key) => key + 1)}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => navigate('/gate/sales-dispatch/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Entry
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<Truck className="h-5 w-5 text-blue-600" />} label="In Progress" value={inProgressCount} />
        <StatCard icon={<CheckCircle2 className="h-5 w-5 text-green-600" />} label="Completed" value={completedCount} />
        <StatCard icon={<FileText className="h-5 w-5 text-violet-600" />} label="PGI Posted" value={pgiPostedCount} />
        <StatCard icon={<Clock className="h-5 w-5 text-red-600" />} label="Cancelled" value={cancelledCount} />
      </div>

      <section>
        <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Truck className="h-4 w-4" />
            Customer Dispatch Entries
          </h3>
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search entry, delivery, customer, vehicle"
              className="pl-9"
            />
          </div>
        </div>

        {entries.length === 0 ? (
          <EmptyState text="No sales dispatch entries yet" />
        ) : filteredEntries.length === 0 ? (
          <EmptyState text="No dispatch entries match this search" />
        ) : (
          <DispatchTable entries={filteredEntries} />
        )}
      </section>
    </div>
  );
}

function DispatchTable({ entries }: { entries: CustomerFlowEntry[] }) {
  const navigate = useNavigate();

  return (
    <div className="overflow-hidden rounded-md border">
      <div className="max-h-[520px] overflow-auto">
        <table className="w-full min-w-[1100px]">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 text-left text-sm font-medium">Entry No.</th>
              <th className="p-3 text-left text-sm font-medium">Delivery</th>
              <th className="p-3 text-left text-sm font-medium">Customer</th>
              <th className="p-3 text-left text-sm font-medium">Items</th>
              <th className="p-3 text-left text-sm font-medium">Vehicle</th>
              <th className="p-3 text-left text-sm font-medium">Gate Out</th>
              <th className="p-3 text-left text-sm font-medium">PGI</th>
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
                    navigate(`/gate/sales-dispatch/new/attachments?entryId=${encodeURIComponent(entry.id)}`);
                    return;
                  }

                  navigate(`/gate/sales-dispatch/${entry.id}`);
                }}
              >
                <td className="whitespace-nowrap p-3 text-sm font-medium">{entry.entryNo}</td>
                <td className="whitespace-nowrap p-3 text-sm">
                  {getCustomerFlowValue(entry, 'outboundDeliveryNo')}
                </td>
                <td className="p-3 text-sm">
                  <div className="font-medium">{getCustomerFlowValue(entry, 'customerName')}</div>
                  <div className="text-xs text-muted-foreground">
                    {getCustomerFlowValue(entry, 'customerCode')}
                  </div>
                </td>
                <td className="p-3 text-sm">{buildCustomerFlowItemSummary(entry.items)}</td>
                <td className="whitespace-nowrap p-3 text-sm">{getCustomerFlowValue(entry, 'vehicleNo')}</td>
                <td className="whitespace-nowrap p-3 text-sm">
                  {formatCustomerFlowDateTime(entry.values.gateOutDate, entry.values.outTime)}
                </td>
                <td className="whitespace-nowrap p-3 text-sm">
                  <GateStatusBadge
                    status={getCustomerFlowValue(entry, 'goodsIssuePosted') === 'Yes' ? 'POSTED' : 'PENDING'}
                  />
                </td>
                <td className="whitespace-nowrap p-3 text-sm">
                  <GateStatusBadge status={entry.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
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
