import { useCallback, useMemo, useState } from 'react';

import type { ApiError } from '@/core/api';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { ExcelExportButton } from '@/shared/components/dashboard/ExcelExportButton';

import { SAPUnavailableBanner } from '../../sap-plan/components/SAPUnavailableBanner';
import {
  DEFAULT_MATERIAL_TYPE_NAME,
  findDefaultMaterialGroup,
} from '../../utils/itemGroupDefaults';
import { useInventoryAgeFilterOptions, useInventoryAgeReport } from '../api';
import {
  InventoryAgeFilters,
  InventoryAgeMetaCards,
  InventoryAgeTable,
  InventoryAgeWarehouseSummary,
} from '../components';
import type {
  InventoryAgeFilters as InventoryAgeFiltersType,
  InventoryAgeMeta,
  WarehouseSummary,
} from '../types';
import { exportInventoryAgeDashboard } from '../utils/exportInventoryAge';

function isSAPError(err: unknown): err is ApiError {
  const status = (err as ApiError)?.status;
  return status === 502 || status === 503;
}

export default function InventoryAgeDashboardPage() {
  const [filters, setFilters] = useState<InventoryAgeFiltersType>({});

  const handleFiltersChange = useCallback((f: InventoryAgeFiltersType) => setFilters(f), []);

  const optionsQuery = useInventoryAgeFilterOptions();
  const defaultItemGroup = useMemo(() => {
    const itemGroups = optionsQuery.data?.item_groups ?? [];
    return (
      findDefaultMaterialGroup(itemGroups, (group) => group.item_group_name)?.item_group_name ??
      DEFAULT_MATERIAL_TYPE_NAME
    );
  }, [optionsQuery.data]);

  const materialTypesResolved = Boolean(optionsQuery.data) || optionsQuery.isError;

  const effectiveFilters = useMemo<InventoryAgeFiltersType>(
    () => ({
      ...filters,
      item_group: filters.item_group ?? defaultItemGroup,
    }),
    [defaultItemGroup, filters],
  );

  const reportQuery = useInventoryAgeReport(effectiveFilters, materialTypesResolved);

  const sapError = reportQuery.error ?? optionsQuery.error;
  const sapApiError = isSAPError(sapError) ? sapError : null;

  const filteredItems = useMemo(() => {
    let result = reportQuery.data?.data ?? [];
    if (effectiveFilters.warehouse?.length) {
      result = result.filter((item) => effectiveFilters.warehouse!.includes(item.warehouse));
    }
    if (effectiveFilters.sub_group?.length) {
      result = result.filter((item) => effectiveFilters.sub_group!.includes(item.sub_group));
    }
    if (effectiveFilters.variety?.length) {
      result = result.filter((item) => effectiveFilters.variety!.includes(item.variety));
    }
    return result;
  }, [
    reportQuery.data,
    effectiveFilters.warehouse,
    effectiveFilters.sub_group,
    effectiveFilters.variety,
  ]);

  const filteredMeta = useMemo((): InventoryAgeMeta | undefined => {
    if (!reportQuery.data) return undefined;
    const whsSet = new Set(filteredItems.map((i) => i.warehouse));
    return {
      total_items: filteredItems.length,
      total_value: filteredItems.reduce((s, i) => s + i.in_stock_value, 0),
      total_quantity: filteredItems.reduce((s, i) => s + i.on_hand, 0),
      total_litres: filteredItems.reduce((s, i) => s + i.litres, 0),
      warehouse_count: whsSet.size,
      fetched_at: reportQuery.data.meta.fetched_at,
    };
  }, [reportQuery.data, filteredItems]);

  const filteredWarehouseSummary = useMemo((): WarehouseSummary[] => {
    const map = new Map<string, WarehouseSummary>();
    for (const item of filteredItems) {
      const existing = map.get(item.warehouse);
      if (existing) {
        existing.item_count += 1;
        existing.total_value += item.in_stock_value;
        existing.total_quantity += item.on_hand;
        existing.total_litres += item.litres;
      } else {
        map.set(item.warehouse, {
          warehouse: item.warehouse,
          item_count: 1,
          total_value: item.in_stock_value,
          total_quantity: item.on_hand,
          total_litres: item.litres,
        });
      }
    }
    return [...map.values()];
  }, [filteredItems]);

  const handleExport = useCallback(() => {
    if (filteredItems.length === 0) return;

    exportInventoryAgeDashboard({
      items: filteredItems,
      filters: effectiveFilters,
      meta: filteredMeta,
      warehouseSummary: filteredWarehouseSummary,
    });
  }, [effectiveFilters, filteredItems, filteredMeta, filteredWarehouseSummary]);

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Inventory"
        description="Stock present across warehouses — age, valuation, and group breakdown"
      >
        <ExcelExportButton
          onExport={handleExport}
          disabled={filteredItems.length === 0 || reportQuery.isLoading || reportQuery.isFetching}
          disabledReason="No inventory rows to export"
        />
      </DashboardHeader>

      <InventoryAgeFilters
        onFiltersChange={handleFiltersChange}
        isFetching={optionsQuery.isFetching || reportQuery.isFetching}
        filterOptions={optionsQuery.data}
        defaultValues={effectiveFilters}
        defaultItemGroup={defaultItemGroup}
      />

      {sapApiError && (
        <SAPUnavailableBanner error={sapApiError} onRetry={reportQuery.refetch} />
      )}

      {!materialTypesResolved && !reportQuery.data && (
        <div className="rounded-lg border bg-card p-12 text-center">
          <p className="text-sm text-muted-foreground">Loading material types.</p>
        </div>
      )}

      {materialTypesResolved && !sapApiError && (
        <>
          <InventoryAgeMetaCards meta={filteredMeta} />
          <InventoryAgeWarehouseSummary data={filteredWarehouseSummary} />
          <InventoryAgeTable
            items={filteredItems}
            isLoading={reportQuery.isLoading || reportQuery.isFetching}
          />
        </>
      )}
    </div>
  );
}
