import { useCallback, useMemo, useState } from 'react';

import type { ApiError } from '@/core/api';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';

import { SAPUnavailableBanner } from '../../sap-plan/components/SAPUnavailableBanner';
import { findDefaultMaterialGroup } from '../../utils/itemGroupDefaults';
import { useItemGroups, useNonMovingReport } from '../api';
import {
  NonMovingBranchSummary,
  NonMovingFilters,
  NonMovingMetaCards,
  NonMovingTable,
} from '../components';
import type {
  BranchSummary,
  NonMovingFilters as NonMovingFiltersType,
  ReportSummary,
} from '../types';

function isSAPError(err: unknown): err is ApiError {
  const status = (err as ApiError)?.status;
  return status === 502 || status === 503;
}

export default function NonMovingDashboardPage() {
  const itemGroupsQuery = useItemGroups();

  const [filters, setFilters] = useState<NonMovingFiltersType>({
    age: 45,
    item_group: 0,
  });
  const [hasSelectedMaterialType, setHasSelectedMaterialType] = useState(false);

  const materialTypesResolved = Boolean(itemGroupsQuery.data) || itemGroupsQuery.isError;

  const defaultItemGroupCode = useMemo(() => {
    const groups = itemGroupsQuery.data?.data ?? [];
    return findDefaultMaterialGroup(groups, (group) => group.item_group_name)?.item_group_code ?? 0;
  }, [itemGroupsQuery.data]);

  const effectiveFilters = useMemo<NonMovingFiltersType>(
    () => ({
      ...filters,
      item_group: hasSelectedMaterialType ? filters.item_group : defaultItemGroupCode,
    }),
    [defaultItemGroupCode, filters, hasSelectedMaterialType],
  );

  const reportQuery = useNonMovingReport(effectiveFilters, materialTypesResolved);

  const warehouses = useMemo(() => {
    const items = reportQuery.data?.data ?? [];
    return [...new Set(items.map((item) => item.warehouse).filter(Boolean))].sort();
  }, [reportQuery.data]);

  const subGroups = useMemo(() => {
    const items = reportQuery.data?.data ?? [];
    return [...new Set(items.map((item) => item.sub_group).filter(Boolean))].sort();
  }, [reportQuery.data]);

  const filteredItems = useMemo(() => {
    let result = reportQuery.data?.data ?? [];
    result = result.filter(
      (item) => item.days_since_last_movement >= effectiveFilters.age,
    );
    if (effectiveFilters.warehouse?.length) {
      result = result.filter((item) => effectiveFilters.warehouse!.includes(item.warehouse));
    }
    if (effectiveFilters.sub_group?.length) {
      result = result.filter((item) => effectiveFilters.sub_group!.includes(item.sub_group));
    }
    if (effectiveFilters.search) {
      const term = effectiveFilters.search.toLowerCase();
      result = result.filter(
        (item) =>
          item.item_code.toLowerCase().includes(term) ||
          item.item_name.toLowerCase().includes(term) ||
          item.branch.toLowerCase().includes(term) ||
          item.warehouse.toLowerCase().includes(term),
      );
    }
    return result;
  }, [
    reportQuery.data,
    effectiveFilters.age,
    effectiveFilters.warehouse,
    effectiveFilters.sub_group,
    effectiveFilters.search,
  ]);

  const filteredSummary = useMemo((): ReportSummary | undefined => {
    if (!reportQuery.data) return undefined;
    const branchMap = new Map<string, BranchSummary>();
    for (const item of filteredItems) {
      const existing = branchMap.get(item.branch);
      if (existing) {
        existing.item_count += 1;
        existing.total_value += item.value;
        existing.total_quantity += item.quantity;
      } else {
        branchMap.set(item.branch, {
          branch: item.branch,
          item_count: 1,
          total_value: item.value,
          total_quantity: item.quantity,
        });
      }
    }
    return {
      total_items: filteredItems.length,
      total_value: filteredItems.reduce((s, i) => s + i.value, 0),
      total_quantity: filteredItems.reduce((s, i) => s + i.quantity, 0),
      by_branch: [...branchMap.values()],
    };
  }, [reportQuery.data, filteredItems]);

  const handleFiltersChange = useCallback((f: NonMovingFiltersType) => {
    setHasSelectedMaterialType(true);
    setFilters(f);
  }, []);

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Non-Moving"
        description="Raw materials with no movement beyond the specified age threshold — identify dead stock and slow-moving inventory"
      />

      <NonMovingFilters
        onFiltersChange={handleFiltersChange}
        isFetching={reportQuery.isFetching}
        defaultValues={effectiveFilters}
        itemGroups={itemGroupsQuery.data?.data ?? []}
        isLoadingGroups={itemGroupsQuery.isLoading}
        warehouses={warehouses}
        subGroups={subGroups}
      />

      {reportQuery.error && isSAPError(reportQuery.error) && (
        <SAPUnavailableBanner error={reportQuery.error as ApiError} onRetry={reportQuery.refetch} />
      )}

      {!(reportQuery.error && isSAPError(reportQuery.error)) && materialTypesResolved && (
        <>
          <NonMovingMetaCards summary={filteredSummary} />
          <NonMovingBranchSummary branches={filteredSummary?.by_branch ?? []} />
          <NonMovingTable
            items={filteredItems}
            isLoading={reportQuery.isLoading || reportQuery.isFetching}
          />
        </>
      )}
    </div>
  );
}
