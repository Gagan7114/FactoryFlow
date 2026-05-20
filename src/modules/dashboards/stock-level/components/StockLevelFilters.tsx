import { Loader2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';

import {
  Button,
  Input,
  Label,
  MultiSelect,
  NativeSelect as Select,
  SelectOption,
} from '@/shared/components/ui';

import { ALL_MATERIAL_TYPES_VALUE } from '../../utils/itemGroupDefaults';
import {
  DEFAULT_STOCK_MOVEMENT_FILTER,
  DEFAULT_STOCK_STATUS_FILTER,
  DEFAULT_STOCK_WAREHOUSE_FILTER,
  STOCK_MOVEMENT_FILTER_OPTIONS,
  STOCK_STATUS_FILTER_OPTIONS,
} from '../constants';
import type { StockDashboardFilters } from '../types';

const TEXT_DEBOUNCE_MS = 500;

function normalizeSearch(value?: string): string | undefined {
  const search = value?.trim();
  return search ? search.toUpperCase() : undefined;
}

interface StockLevelFiltersProps {
  onFiltersChange: (filters: StockDashboardFilters) => void;
  isFetching?: boolean;
  defaultValues?: StockDashboardFilters;
  warehouses?: string[];
  itemGroups?: string[];
  defaultItemGroup?: string;
  externalResetSignal?: number;
}

interface FiltersForm {
  search: string;
  item_group: string;
  warehouse: string[];
  status: string[];
  movement_status: string[];
}

function buildFilters(values: Partial<FiltersForm>): StockDashboardFilters {
  const filters: StockDashboardFilters = {};
  const search = normalizeSearch(values.search);
  if (search) filters.search = search;
  filters.item_group = values.item_group ?? ALL_MATERIAL_TYPES_VALUE;
  if (values.warehouse?.length) filters.warehouse = values.warehouse;
  filters.status = (values.status ?? []) as StockDashboardFilters['status'];
  filters.movement_status = (values.movement_status ??
    []) as StockDashboardFilters['movement_status'];
  return filters;
}

function formDefaultsFromFilters(
  defaultValues?: StockDashboardFilters,
  defaultItemGroup?: string,
): FiltersForm {
  return {
    search: defaultValues?.search ?? '',
    item_group: defaultValues?.item_group ?? defaultItemGroup ?? ALL_MATERIAL_TYPES_VALUE,
    warehouse: defaultValues?.warehouse ?? [...DEFAULT_STOCK_WAREHOUSE_FILTER],
    status: defaultValues?.status ?? [...DEFAULT_STOCK_STATUS_FILTER],
    movement_status: defaultValues?.movement_status ?? [...DEFAULT_STOCK_MOVEMENT_FILTER],
  };
}

export function StockLevelFilters({
  onFiltersChange,
  isFetching,
  defaultValues,
  warehouses = [],
  itemGroups = [],
  defaultItemGroup,
  externalResetSignal = 0,
}: StockLevelFiltersProps) {
  const { register, watch, reset, control, setValue } = useForm<FiltersForm>({
    defaultValues: formDefaultsFromFilters(defaultValues, defaultItemGroup),
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestFormDefaultsRef = useRef<FiltersForm>(
    formDefaultsFromFilters(defaultValues, defaultItemGroup),
  );

  useEffect(() => {
    latestFormDefaultsRef.current = formDefaultsFromFilters(defaultValues, defaultItemGroup);
  }, [defaultItemGroup, defaultValues]);

  useEffect(() => {
    if (externalResetSignal === 0) return;
    reset(latestFormDefaultsRef.current);
  }, [externalResetSignal, reset]);

  useEffect(() => {
    setValue(
      'item_group',
      defaultValues?.item_group ?? defaultItemGroup ?? ALL_MATERIAL_TYPES_VALUE,
    );
  }, [defaultItemGroup, defaultValues?.item_group, setValue]);

  useEffect(() => {
    const subscription = watch((values, { name }) => {
      const isTextField = name === 'search';

      if (isTextField) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          onFiltersChange(buildFilters(values));
        }, TEXT_DEBOUNCE_MS);
      } else {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        onFiltersChange(buildFilters(values));
      }
    });
    return () => {
      subscription.unsubscribe();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [watch, onFiltersChange]);

  function handleReset() {
    const resetValues = {
      search: '',
      item_group: defaultItemGroup ?? ALL_MATERIAL_TYPES_VALUE,
      warehouse: [...DEFAULT_STOCK_WAREHOUSE_FILTER],
      status: [...DEFAULT_STOCK_STATUS_FILTER],
      movement_status: [...DEFAULT_STOCK_MOVEMENT_FILTER],
    };
    reset(resetValues);
    onFiltersChange(buildFilters(resetValues));
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
      {/* Search */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="stock-filter-search" className="text-xs">
          Search
        </Label>
        <Input
          id="stock-filter-search"
          type="text"
          placeholder="Item code, name, or warehouse"
          className="w-64"
          {...register('search')}
        />
      </div>

      {/* Material Type */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="stock-filter-material-type" className="text-xs">
          Material Type
        </Label>
        <Select id="stock-filter-material-type" className="w-44" {...register('item_group')}>
          <SelectOption value={ALL_MATERIAL_TYPES_VALUE}>All</SelectOption>
          {itemGroups.map((group) => (
            <SelectOption key={group} value={group}>
              {group}
            </SelectOption>
          ))}
        </Select>
      </div>

      {/* Warehouse */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="stock-filter-warehouse" className="text-xs">
          Warehouse
        </Label>
        <Controller
          name="warehouse"
          control={control}
          render={({ field }) => (
            <MultiSelect
              id="stock-filter-warehouse"
              options={warehouses.map((w) => ({ label: w, value: w }))}
              selected={field.value}
              onChange={field.onChange}
              placeholder="All"
              className="w-44"
            />
          )}
        />
      </div>

      {/* Status */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="stock-filter-status" className="text-xs">
          Status
        </Label>
        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <MultiSelect
              id="stock-filter-status"
              options={STOCK_STATUS_FILTER_OPTIONS.filter((o) => o.value !== 'all').map((o) => ({
                label: o.label,
                value: o.value,
              }))}
              selected={field.value}
              onChange={field.onChange}
              placeholder="All"
              className="w-36"
            />
          )}
        />
      </div>

      {/* Movement */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="stock-filter-movement" className="text-xs">
          Movement
        </Label>
        <Controller
          name="movement_status"
          control={control}
          render={({ field }) => (
            <MultiSelect
              id="stock-filter-movement"
              options={STOCK_MOVEMENT_FILTER_OPTIONS.map((o) => ({
                label: o.label,
                value: o.value,
              }))}
              selected={field.value}
              onChange={field.onChange}
              placeholder="All"
              className="w-44"
            />
          )}
        />
      </div>

      {/* Reset */}
      <Button variant="outline" size="sm" onClick={handleReset} className="mb-0.5">
        Reset
      </Button>

      {/* Fetch indicator */}
      {isFetching && (
        <div className="mb-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading…
        </div>
      )}
    </div>
  );
}
