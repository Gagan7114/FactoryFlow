import { CheckCircle2, Clock, FileText, Plus, RefreshCw, Search, Truck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useGlobalDateRange } from '@/core/store/hooks';
import {
  type SalesDispatchGateOut,
  useSalesDispatchEntries,
} from '@/modules/gate/api';
import { DateRangePicker, GateStatusBadge } from '@/modules/gate/components';
import { Button, Card, CardContent, Input } from '@/shared/components/ui';

export default function SalesDispatchDashboardPage() {
  const navigate = useNavigate();
  const { dateRange, dateRangeAsDateObjects, setDateRange } = useGlobalDateRange();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: entries = [], isFetching, refetch } = useSalesDispatchEntries({
    from_date: dateRange.from,
    to_date: dateRange.to,
    search: searchTerm.trim() || undefined,
  });

  const filteredEntries = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return entries;
    return entries.filter((entry) => buildSalesDispatchSearchText(entry).includes(query));
  }, [entries, searchTerm]);

  const completedCount = entries.filter((entry) => entry.status === 'DISPATCHED').length;
  const inProgressCount = entries.filter((entry) => (
    !['DISPATCHED', 'CANCELLED', 'REJECTED'].includes(entry.status)
  )).length;
  const cancelledCount = entries.filter((entry) => entry.status === 'CANCELLED').length;
  const pgiPostedCount = entries.filter(
    (entry) => ['GATEPASS_PRINTED', 'PRINT_COMMITTED', 'DISPATCHED'].includes(entry.status),
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Docking</h2>
          <p className="text-muted-foreground">
            Dock SAP invoices and stock transfers, verify truck documents, and print gatepasses
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
          <Button variant="outline" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {isFetching ? 'Refreshing' : 'Refresh'}
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
        <StatCard icon={<FileText className="h-5 w-5 text-violet-600" />} label="Gatepass Printed" value={pgiPostedCount} />
        <StatCard icon={<Clock className="h-5 w-5 text-red-600" />} label="Cancelled" value={cancelledCount} />
      </div>

      <section>
        <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Truck className="h-4 w-4" />
            Docking Entries
          </h3>
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search entry, document, customer, vehicle"
              className="pl-9"
            />
          </div>
        </div>

        {isFetching && entries.length === 0 ? (
          <EmptyState text="Loading docking entries" />
        ) : entries.length === 0 ? (
          <EmptyState text="No docking entries yet" />
        ) : filteredEntries.length === 0 ? (
          <EmptyState text="No docking entries match this search" />
        ) : (
          <DispatchTable entries={filteredEntries} />
        )}
      </section>
    </div>
  );
}

function DispatchTable({ entries }: { entries: SalesDispatchGateOut[] }) {
  const navigate = useNavigate();

  return (
    <div className="overflow-hidden rounded-md border">
      <div className="max-h-[520px] overflow-auto">
        <table className="w-full min-w-[1100px]">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 text-left text-sm font-medium">Entry No.</th>
              <th className="p-3 text-left text-sm font-medium">SAP Document</th>
              <th className="p-3 text-left text-sm font-medium">Customer</th>
              <th className="p-3 text-left text-sm font-medium">Items</th>
              <th className="p-3 text-left text-sm font-medium">Vehicle</th>
              <th className="p-3 text-left text-sm font-medium">Gate Out</th>
              <th className="p-3 text-left text-sm font-medium">Gatepass</th>
              <th className="p-3 text-left text-sm font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                key={entry.id}
                className="cursor-pointer border-t transition-colors hover:bg-muted/50"
                onClick={() => {
                  navigate(`/gate/sales-dispatch/${entry.id}`);
                }}
              >
                <td className="whitespace-nowrap p-3 text-sm font-medium">{entry.entry_no}</td>
                <td className="whitespace-nowrap p-3 text-sm">
                  <div>{entry.sap_doc_num || entry.sap_doc_entry}</div>
                  <div className="text-xs text-muted-foreground">{formatDocumentType(entry.document_type)}</div>
                </td>
                <td className="p-3 text-sm">
                  <div className="font-medium">{entry.customer_name || '-'}</div>
                  <div className="text-xs text-muted-foreground">
                    {entry.customer_code || entry.place_of_supply || '-'}
                  </div>
                </td>
                <td className="p-3 text-sm">{entry.item_summary || summarizeItems(entry.items)}</td>
                <td className="whitespace-nowrap p-3 text-sm">{entry.vehicle_no}</td>
                <td className="whitespace-nowrap p-3 text-sm">
                  {formatDateTime(entry.gate_out_date, entry.out_time)}
                </td>
                <td className="whitespace-nowrap p-3 text-sm">
                  <GateStatusBadge
                    status={entry.gatepass_no ? 'PRINTED' : 'PENDING'}
                    label={entry.gatepass_no || 'Pending'}
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

function buildSalesDispatchSearchText(entry: SalesDispatchGateOut) {
  return [
    entry.entry_no,
    entry.sap_doc_num,
    entry.sap_doc_entry,
    entry.customer_name,
    entry.customer_code,
    entry.vehicle_no,
    entry.driver_name,
    entry.transporter_name,
    entry.gatepass_no,
    entry.item_summary,
    entry.status,
  ].join(' ').toLowerCase();
}

function formatDocumentType(value: string) {
  return value === 'STOCK_TRANSFER' ? 'Stock Transfer' : 'A/R Invoice';
}

function formatDateTime(date?: string | null, time?: string | null) {
  if (!date && !time) return '-';
  return [date, time].filter(Boolean).join(' ');
}

function summarizeItems(items: SalesDispatchGateOut['items']) {
  if (!items.length) return '-';
  return items
    .slice(0, 2)
    .map((item) => `${item.item_code} (${item.quantity} ${item.uom})`)
    .join(', ');
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
