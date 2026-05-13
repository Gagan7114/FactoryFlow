import { FileText, IndianRupee, Plus, RefreshCw, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  buildCustomerFlowSearchText,
  CREDIT_NOTE_KEY,
  type CustomerFlowEntry,
  DEBIT_NOTE_KEY,
  formatCustomerFlowTimestamp,
  getCustomerFlowValue,
  readCustomerFlowEntries,
} from '@/modules/gate/pages/customerSalesFlow/customerSalesFlow.storage';
import { Badge, Button, Card, CardContent, Input } from '@/shared/components/ui';

type MemoType = 'credit' | 'debit';

interface FinanceMemoDashboardPageProps {
  memoType: MemoType;
}

const memoConfig = {
  credit: {
    title: 'Credit Notes',
    subtitle: 'Issue customer credits for QC-accepted returned goods',
    storageKey: CREDIT_NOTE_KEY,
    newPath: '/finance/credit-notes/new',
    detailBasePath: '/finance/credit-notes',
    searchPlaceholder: 'Search credit note, return, customer',
  },
  debit: {
    title: 'Debit Notes',
    subtitle: 'Issue customer debits for missed freight and additional charges',
    storageKey: DEBIT_NOTE_KEY,
    newPath: '/finance/debit-notes/new',
    detailBasePath: '/finance/debit-notes',
    searchPlaceholder: 'Search debit note, dispatch, customer',
  },
} satisfies Record<MemoType, {
  title: string;
  subtitle: string;
  storageKey: string;
  newPath: string;
  detailBasePath: string;
  searchPlaceholder: string;
}>;

export default function FinanceMemoDashboardPage({ memoType }: FinanceMemoDashboardPageProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const config = memoConfig[memoType];

  const entries = useMemo(() => {
    void refreshKey;
    return readCustomerFlowEntries(config.storageKey);
  }, [config.storageKey, refreshKey]);

  const filteredEntries = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return entries;
    return entries.filter((entry) => buildCustomerFlowSearchText(entry).toLowerCase().includes(query));
  }, [entries, searchTerm]);

  const postedCount = entries.filter((entry) => entry.status === 'POSTED').length;
  const totalAmount = entries.reduce((sum, entry) => sum + Number(getCustomerFlowValue(entry, 'totalAmount') || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{config.title}</h2>
          <p className="text-muted-foreground">{config.subtitle}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" onClick={() => setRefreshKey((key) => key + 1)}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => navigate(config.newPath)}>
            <Plus className="mr-2 h-4 w-4" />
            New Entry
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<FileText className="h-5 w-5 text-blue-600" />} label="Total Notes" value={entries.length} />
        <StatCard icon={<BadgeDot />} label="Posted" value={postedCount} />
        <StatCard icon={<IndianRupee className="h-5 w-5 text-green-600" />} label="Total Amount" value={totalAmount.toFixed(2)} />
      </div>

      <section>
        <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <FileText className="h-4 w-4" />
            {config.title}
          </h3>
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={config.searchPlaceholder}
              className="pl-9"
            />
          </div>
        </div>

        {entries.length === 0 ? (
          <EmptyState text={`No ${config.title.toLowerCase()} yet`} />
        ) : filteredEntries.length === 0 ? (
          <EmptyState text="No finance entries match this search" />
        ) : (
          <MemoTable
            entries={filteredEntries}
            memoType={memoType}
            detailBasePath={config.detailBasePath}
          />
        )}
      </section>
    </div>
  );
}

function MemoTable({
  entries,
  memoType,
  detailBasePath,
}: {
  entries: CustomerFlowEntry[];
  memoType: MemoType;
  detailBasePath: string;
}) {
  const navigate = useNavigate();

  return (
    <div className="overflow-hidden rounded-md border">
      <div className="max-h-[520px] overflow-auto">
        <table className="w-full min-w-[980px]">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 text-left text-sm font-medium">Entry No.</th>
              <th className="p-3 text-left text-sm font-medium">Customer</th>
              <th className="p-3 text-left text-sm font-medium">Reference</th>
              <th className="p-3 text-left text-sm font-medium">Reason</th>
              <th className="p-3 text-left text-sm font-medium">Amount</th>
              <th className="p-3 text-left text-sm font-medium">Created</th>
              <th className="p-3 text-left text-sm font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                key={entry.id}
                className="cursor-pointer border-t transition-colors hover:bg-muted/50"
                onClick={() => navigate(`${detailBasePath}/${entry.id}`)}
              >
                <td className="whitespace-nowrap p-3 text-sm font-medium">{entry.entryNo}</td>
                <td className="p-3 text-sm">{getCustomerFlowValue(entry, 'customerName')}</td>
                <td className="whitespace-nowrap p-3 text-sm">
                  {memoType === 'credit'
                    ? getCustomerFlowValue(entry, 'customerReturnEntry')
                    : getCustomerFlowValue(entry, 'dispatchEntry')}
                </td>
                <td className="p-3 text-sm">{getCustomerFlowValue(entry, 'reason')}</td>
                <td className="whitespace-nowrap p-3 text-sm">{getCustomerFlowValue(entry, 'totalAmount')}</td>
                <td className="whitespace-nowrap p-3 text-sm">{formatCustomerFlowTimestamp(entry.createdAt)}</td>
                <td className="whitespace-nowrap p-3 text-sm">
                  <Badge variant={entry.status === 'POSTED' ? 'success' : 'secondary'}>{entry.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BadgeDot() {
  return <FileText className="h-5 w-5 text-green-600" />;
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
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
