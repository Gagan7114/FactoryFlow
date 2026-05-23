import { useCallback, useMemo, useState } from 'react';

import type { ApiError } from '@/core/api';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { ExcelExportButton } from '@/shared/components/dashboard/ExcelExportButton';
import { Badge } from '@/shared/components/ui';

import { usePlanProcurement, usePlanSummary } from '../api';
import {
  PlanDashboardFilters,
  ProcurementTable,
  SAPUnavailableBanner,
  SKUSummaryTable,
  SummaryMetaCards,
} from '../components';
import type { PlanDashboardFilters as Filters } from '../types';
import {
  exportSAPPlanProcurementDashboard,
  exportSAPPlanSummaryDashboard,
} from '../utils/exportSAPPlan';

type ActiveTab = 'summary' | 'procurement';

const TABS: { label: string; value: ActiveTab }[] = [
  { label: 'SKU Summary', value: 'summary' },
  { label: 'Procurement', value: 'procurement' },
];

function isSAPError(err: unknown): err is ApiError {
  const status = (err as ApiError)?.status;
  return status === 502 || status === 503;
}

export default function SAPPlanDashboardPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('summary');
  const [filters, setFilters] = useState<Filters>({});

  const handleFiltersChange = useCallback((f: Filters) => setFilters(f), []);

  const summaryQuery = usePlanSummary(filters);
  const procurementQuery = usePlanProcurement(filters, activeTab === 'procurement');

  const activeError = activeTab === 'summary' ? summaryQuery.error : procurementQuery.error;
  const activeApiError = isSAPError(activeError) ? activeError : null;
  const isFetching =
    activeTab === 'summary' ? summaryQuery.isFetching : procurementQuery.isFetching;
  const summaryRows = useMemo(
    () =>
      filters.status?.length
        ? (summaryQuery.data?.data ?? []).filter((order) => filters.status!.includes(order.status))
        : (summaryQuery.data?.data ?? []),
    [filters.status, summaryQuery.data],
  );
  const procurementRows = useMemo(() => procurementQuery.data?.data ?? [], [procurementQuery.data]);
  const activeRowCount = activeTab === 'summary' ? summaryRows.length : procurementRows.length;

  const handleExport = useCallback(() => {
    if (activeTab === 'summary') {
      if (summaryRows.length === 0) return;
      exportSAPPlanSummaryDashboard({
        orders: summaryQuery.data?.data ?? [],
        filters,
        meta: summaryQuery.data?.meta,
      });
      return;
    }

    if (procurementRows.length === 0) return;
    exportSAPPlanProcurementDashboard({
      items: procurementRows,
      filters,
      meta: procurementQuery.data?.meta,
    });
  }, [activeTab, filters, procurementQuery.data?.meta, procurementRows, summaryQuery.data, summaryRows]);

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="SAP Material Plan"
        description="Production order shortfall, BOM component detail & procurement requirements"
      >
        <ExcelExportButton
          onExport={handleExport}
          disabled={Boolean(activeApiError) || activeRowCount === 0 || isFetching}
          disabledReason="No SAP material plan rows to export"
        />
      </DashboardHeader>

      <PlanDashboardFilters onFiltersChange={handleFiltersChange} isFetching={isFetching} />

      {/* Tab switcher */}
      <div className="flex items-center gap-2">
        {TABS.map((tab) => (
          <Badge
            key={tab.value}
            variant={activeTab === tab.value ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setActiveTab(tab.value)}
          >
            {tab.label}
          </Badge>
        ))}
      </div>

      {/* SAP-level error banner (502/503) */}
      {activeApiError && (
        <SAPUnavailableBanner
          error={activeApiError}
          onRetry={
            activeTab === 'summary' ? summaryQuery.refetch : procurementQuery.refetch
          }
        />
      )}

      {/* Tab content */}
      {activeTab === 'summary' && !activeApiError && (
        <>
          <SummaryMetaCards meta={summaryQuery.data?.meta} />
          <SKUSummaryTable
            orders={summaryQuery.data?.data ?? []}
            isLoading={summaryQuery.isLoading || summaryQuery.isFetching}
            statusFilter={filters.status}
          />
        </>
      )}

      {activeTab === 'procurement' && !activeApiError && (
        <ProcurementTable
          items={procurementQuery.data?.data ?? []}
          isLoading={procurementQuery.isLoading || procurementQuery.isFetching}
        />
      )}
    </div>
  );
}
