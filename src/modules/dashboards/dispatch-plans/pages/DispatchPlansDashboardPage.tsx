import { RefreshCw } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { DASHBOARDS_PERMISSIONS } from '@/config/permissions';
import type { ApiError } from '@/core/api';
import { usePermission } from '@/core/auth';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { ExcelExportButton } from '@/shared/components/dashboard/ExcelExportButton';
import { Button } from '@/shared/components/ui';

import { SAPUnavailableBanner } from '../../sap-plan/components/SAPUnavailableBanner';
import { dispatchPlansApi, useDispatchBills, useUpdateDispatchPlan } from '../api';
import {
  DispatchPlanEditSheet,
  DispatchPlanFilters,
  DispatchPlanMetaCards,
  DispatchPlanTable,
} from '../components';
import { createDefaultDispatchPlanFilters } from '../constants';
import type {
  DispatchBill,
  DispatchPlanFilters as DispatchPlanFiltersType,
  DispatchPlanUpdatePayload,
} from '../types';
import { exportDispatchPlansDashboard } from '../utils/exportDispatchPlans';

function isSAPError(error: unknown): error is ApiError {
  const status = (error as ApiError)?.status;
  return status === 502 || status === 503;
}

export default function DispatchPlansDashboardPage() {
  const [filters, setFilters] = useState<DispatchPlanFiltersType>(createDefaultDispatchPlanFilters);
  const [selectedBill, setSelectedBill] = useState<DispatchBill | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const { hasPermission } = usePermission();
  const canEdit = hasPermission(DASHBOARDS_PERMISSIONS.EDIT_DISPATCH_PLANS);

  const billsQuery = useDispatchBills(filters);
  const updatePlanMutation = useUpdateDispatchPlan();

  const handleEdit = useCallback((bill: DispatchBill) => {
    setSelectedBill(bill);
    setIsSheetOpen(true);
  }, []);

  const handleSave = useCallback(
    async (docEntry: number, payload: DispatchPlanUpdatePayload) => {
      try {
        await updatePlanMutation.mutateAsync({ docEntry, payload });
        toast.success('Dispatch plan saved');
        setIsSheetOpen(false);
        setSelectedBill(null);
      } catch {
        toast.error('Failed to save dispatch plan');
      }
    },
    [updatePlanMutation],
  );

  const sapError = billsQuery.error;
  const sapApiError = isSAPError(sapError) ? sapError : null;
  const bills = billsQuery.data?.data ?? [];

  const handleExport = useCallback(async () => {
    if (!billsQuery.data?.data.length) return;

    setIsExporting(true);
    try {
      const exportLimit = Math.max(
        billsQuery.data.meta?.total_bills ?? 0,
        billsQuery.data.data.length,
        filters.limit ?? 500,
      );
      const exportFilters = { ...filters, limit: exportLimit };
      const exportData = await dispatchPlansApi.getBills(exportFilters);

      exportDispatchPlansDashboard({
        bills: exportData.data,
        filters: exportFilters,
        meta: exportData.meta,
      });
    } catch {
      toast.error('Failed to export dispatch plans');
    } finally {
      setIsExporting(false);
    }
  }, [billsQuery.data, filters]);

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Dispatch Plans"
        description="SAP dispatch bills and planning handoff dates"
      >
        <ExcelExportButton
          onExport={handleExport}
          isLoading={isExporting}
          disabled={Boolean(sapApiError) || bills.length === 0}
          disabledReason="No dispatch bills to export"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => billsQuery.refetch()}
          disabled={billsQuery.isFetching}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </DashboardHeader>

      <DispatchPlanFilters
        filters={filters}
        onFiltersChange={setFilters}
        isFetching={billsQuery.isFetching}
      />

      {sapApiError && <SAPUnavailableBanner error={sapApiError} onRetry={billsQuery.refetch} />}

      {!sapApiError && (
        <>
          <DispatchPlanMetaCards meta={billsQuery.data?.meta} />
          <DispatchPlanTable
            bills={bills}
            isLoading={billsQuery.isLoading || billsQuery.isFetching}
            canEdit={canEdit}
            onEdit={handleEdit}
          />
        </>
      )}

      <DispatchPlanEditSheet
        key={selectedBill?.doc_entry ?? 'empty'}
        bill={selectedBill}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        onSave={handleSave}
        isSaving={updatePlanMutation.isPending}
      />
    </div>
  );
}
