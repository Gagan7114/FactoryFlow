import { CheckCircle2, Clock, PackageCheck, Search, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
} from '@/modules/gate/pages/customerSalesFlow/customerSalesFlow.storage';
import { Badge, Card, CardContent, Input } from '@/shared/components/ui';

export default function CustomerReturnQCDashboardPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const entries = useMemo(
    () => readCustomerFlowEntries(CUSTOMER_RETURN_KEY)
      .filter((entry) => ['PENDING_QC', 'PENDING_SAP_GR', 'QC_ACCEPTED', 'QC_PARTIAL', 'QC_REJECTED'].includes(entry.status)),
    [],
  );
  const filteredEntries = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return entries;
    return entries.filter((entry) => buildCustomerFlowSearchText(entry).toLowerCase().includes(query));
  }, [entries, searchTerm]);

  const pendingCount = entries.filter((entry) => entry.status === 'PENDING_QC').length;
  const acceptedCount = entries.filter((entry) => ['PENDING_SAP_GR', 'QC_ACCEPTED', 'QC_PARTIAL'].includes(entry.status)).length;
  const awaitingFactoryHeadCount = entries.filter(isCustomerReturnAwaitingFactoryHead).length;
  const finalRejectedCount = entries.filter((entry) => (
    entry.status === 'QC_REJECTED' && !isCustomerReturnAwaitingFactoryHead(entry)
  )).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Customer Return QC</h2>
        <p className="text-muted-foreground">
          Verify returned finished goods before credit note creation
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<Clock className="h-5 w-5 text-amber-600" />} label="Pending QC" value={pendingCount} />
        <StatCard icon={<CheckCircle2 className="h-5 w-5 text-green-600" />} label="Accepted" value={acceptedCount} />
        <StatCard icon={<ShieldCheck className="h-5 w-5 text-blue-600" />} label="Awaiting Factory Head" value={awaitingFactoryHeadCount} />
        <StatCard icon={<ShieldCheck className="h-5 w-5 text-red-600" />} label="Final Rejected" value={finalRejectedCount} />
        <StatCard icon={<ShieldCheck className="h-5 w-5 text-blue-600" />} label="Total Returns" value={entries.length} />
      </div>

      <section>
        <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <PackageCheck className="h-4 w-4" />
            Return QC Entries
          </h3>
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search return, dispatch, customer"
              className="pl-9"
            />
          </div>
        </div>

        {entries.length === 0 ? (
          <EmptyState text="No customer returns available for QC" />
        ) : filteredEntries.length === 0 ? (
          <EmptyState text="No customer return QC entries match this search" />
        ) : (
          <div className="overflow-hidden rounded-md border">
            <div className="max-h-[520px] overflow-auto">
              <table className="w-full min-w-[1040px]">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-3 text-left text-sm font-medium">Return Entry</th>
                    <th className="p-3 text-left text-sm font-medium">Dispatch</th>
                    <th className="p-3 text-left text-sm font-medium">Customer</th>
                    <th className="p-3 text-left text-sm font-medium">Items</th>
                    <th className="p-3 text-left text-sm font-medium">Gate In</th>
                    <th className="p-3 text-left text-sm font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="cursor-pointer border-t transition-colors hover:bg-muted/50"
                      onClick={() => navigate(`/qc/customer-returns/${entry.id}`)}
                    >
                      <td className="whitespace-nowrap p-3 text-sm font-medium">{entry.entryNo}</td>
                      <td className="whitespace-nowrap p-3 text-sm">{getCustomerFlowValue(entry, 'dispatchEntry')}</td>
                      <td className="p-3 text-sm">{getCustomerFlowValue(entry, 'customerName')}</td>
                      <td className="p-3 text-sm">{buildCustomerFlowItemSummary(entry.items)}</td>
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
        )}
      </section>
    </div>
  );
}

function StatusBadge({ entry }: { entry: CustomerFlowEntry }) {
  if (entry.status === 'PENDING_QC') return <Badge variant="warning">PENDING QC</Badge>;
  if (entry.status === 'PENDING_SAP_GR') return <Badge variant="warning">PENDING SAP GR</Badge>;
  if (entry.status === 'QC_REJECTED') {
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
