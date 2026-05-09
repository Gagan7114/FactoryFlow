import { CheckCircle2, Clock, FileText, Lock, Plus, RefreshCw, Search, Truck, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  type SalesDispatchGateOut,
  useDispatchGateLock,
  useSalesDispatchGateOuts,
} from '@/modules/gate/api';
import { Badge, Button, Card, CardContent, Input } from '@/shared/components/ui';

function toDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function hasRequiredWeighment(entry: SalesDispatchGateOut) {
  return Number(entry.gross_weight || 0) > 0 && Number(entry.tare_weight || -1) >= 0;
}

function nextPathForEntry(entry: SalesDispatchGateOut) {
  if (entry.status !== 'IN_PROGRESS') return `/gate/sales-dispatch/${entry.id}`;
  if (!hasRequiredWeighment(entry)) return `/gate/sales-dispatch/new/weighment?entryId=${entry.id}`;
  if (!entry.dock_photo || !entry.gatepass_document) return `/gate/sales-dispatch/new/attachments?entryId=${entry.id}`;
  return `/gate/sales-dispatch/new/attachments?entryId=${entry.id}`;
}

function statusVariant(status: string) {
  if (status === 'COMPLETED') return 'success';
  if (status === 'CANCELLED' || status === 'REJECTED') return 'destructive';
  return 'warning';
}

export default function SalesDispatchDashboardPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const params = useMemo(() => ({
    from_date: toDateInputValue(addDays(new Date(), -30)),
    to_date: toDateInputValue(new Date()),
    search: searchTerm,
  }), [searchTerm]);

  const { data: lock } = useDispatchGateLock();
  const { data: entries = [], isFetching, refetch } = useSalesDispatchGateOuts(params);

  const completedCount = entries.filter((entry) => entry.status === 'COMPLETED').length;
  const inProgressCount = entries.filter((entry) => entry.status === 'IN_PROGRESS').length;
  const cancelledCount = entries.filter((entry) => entry.status === 'CANCELLED').length;
  const rejectedCount = entries.filter((entry) => entry.status === 'REJECTED').length;
  const committedCount = entries.filter((entry) => entry.print_commit).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Sales Dispatch Out</h2>
          <p className="text-muted-foreground">
            Verify SAP invoices, loading documents, weighment, and printed gate passes
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => navigate('/gate/sales-dispatch/new')}>
            {lock?.locked ? <Lock className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
            New Entry
          </Button>
        </div>
      </div>

      {lock?.locked ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm font-medium text-amber-900">
          {lock.reason || 'Sales dispatch gate-out is currently locked.'}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<Truck className="h-5 w-5 text-blue-600" />} label="In Progress" value={inProgressCount} />
        <StatCard icon={<CheckCircle2 className="h-5 w-5 text-green-600" />} label="Completed" value={completedCount} />
        <StatCard icon={<FileText className="h-5 w-5 text-violet-600" />} label="Print Committed" value={committedCount} />
        <StatCard icon={<XCircle className="h-5 w-5 text-red-600" />} label="Cancelled / Rejected" value={cancelledCount + rejectedCount} />
      </div>

      <section>
        <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Clock className="h-4 w-4" />
            Customer Dispatch Entries
          </h3>
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search entry, invoice, customer, vehicle"
              className="pl-9"
            />
          </div>
        </div>

        {entries.length === 0 ? (
          <EmptyState text={isFetching ? 'Loading sales dispatch entries...' : 'No sales dispatch entries found'} />
        ) : (
          <DispatchTable entries={entries} />
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
              <th className="p-3 text-left text-sm font-medium">Invoice</th>
              <th className="p-3 text-left text-sm font-medium">Customer</th>
              <th className="p-3 text-left text-sm font-medium">Vehicle</th>
              <th className="p-3 text-left text-sm font-medium">Gate Out</th>
              <th className="p-3 text-left text-sm font-medium">Qty</th>
              <th className="p-3 text-left text-sm font-medium">Gate Pass</th>
              <th className="p-3 text-left text-sm font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                key={entry.id}
                className="cursor-pointer border-t transition-colors hover:bg-muted/50"
                onClick={() => navigate(nextPathForEntry(entry))}
              >
                <td className="whitespace-nowrap p-3 text-sm font-medium">{entry.entry_no}</td>
                <td className="whitespace-nowrap p-3 text-sm">{entry.sap_invoice_doc_num || entry.sap_invoice_doc_entry}</td>
                <td className="p-3 text-sm">
                  <div className="font-medium">{entry.customer_name || '-'}</div>
                  <div className="text-xs text-muted-foreground">{entry.customer_code || '-'}</div>
                </td>
                <td className="p-3 text-sm">
                  <div className="font-medium">{entry.vehicle_number}</div>
                  <div className="text-xs text-muted-foreground">{entry.driver_name}</div>
                </td>
                <td className="whitespace-nowrap p-3 text-sm">
                  {entry.gate_out_date} {entry.out_time?.slice(0, 5)}
                </td>
                <td className="whitespace-nowrap p-3 text-sm">
                  {entry.physical_quantity || '-'} {entry.physical_uom || ''}
                </td>
                <td className="whitespace-nowrap p-3 text-sm">
                  <Badge variant={entry.print_commit ? 'success' : entry.gate_printed ? 'warning' : 'secondary'}>
                    {entry.print_commit ? 'COMMITTED' : entry.gate_printed ? 'PRINTED' : 'PENDING'}
                  </Badge>
                </td>
                <td className="whitespace-nowrap p-3 text-sm">
                  <Badge variant={statusVariant(entry.status)}>{entry.status}</Badge>
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
