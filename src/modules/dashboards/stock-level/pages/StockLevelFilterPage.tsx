import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Factory,
  Layers3,
  ListChecks,
  Package,
  RotateCcw,
  Search,
  Shapes,
  Warehouse,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { Button, Input } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import {
  ALL_MATERIAL_TYPES_VALUE,
  DEFAULT_MATERIAL_TYPE_NAME,
  findDefaultMaterialGroup,
  isPackingMaterialGroup,
} from '../../utils/itemGroupDefaults';
import { useStockLevelFilterOptions } from '../api';
import {
  DEFAULT_STOCK_MOVEMENT_FILTER,
  DEFAULT_STOCK_STATUS_FILTER,
} from '../constants';
import type {
  StockDashboardFilterOption,
  StockDashboardFilters,
} from '../types';
import {
  countActiveStockFilters,
  filtersFromSearchParams,
  filtersToSearchParams,
} from '../utils/stockLevelFilterParams';

type FlowStepKey = 'material' | 'variety' | 'sub_group' | 'size' | 'warehouse' | 'review';
type ArrayFilterKey = 'variety' | 'sub_group' | 'sku' | 'warehouse';
type SlideDirection = 'forward' | 'backward';

interface FlowStep {
  key: FlowStepKey;
  title: string;
  eyebrow: string;
  caption: string;
  icon: LucideIcon;
  accent: string;
  pageBackground: string;
  stageBackground: string;
  sidePanel: string;
  sideIcon: string;
  sideMuted: string;
}

interface ReviewRow {
  label: string;
  value: string;
}

const EMPTY_OPTIONS: StockDashboardFilterOption[] = [];
const TOP_PM_SUBGROUPS: StockDashboardFilterOption[] = [
  { value: 'CARTON', label: 'Carton' },
  { value: 'POUCH', label: 'Pouch' },
  { value: 'HDPE', label: 'HDPE' },
  { value: 'PET', label: 'PET' },
  { value: 'CAP', label: 'Cap' },
  { value: 'SHRINK', label: 'Shrink' },
];

const FLOW_STEPS: FlowStep[] = [
  {
    key: 'material',
    title: 'Material Type',
    eyebrow: 'Start here',
    caption: 'Choose the SAP material family before anything else loads.',
    icon: Factory,
    accent: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
    pageBackground: 'bg-sky-50/70 dark:bg-sky-950/20',
    stageBackground:
      'border-sky-200/80 bg-sky-50/45 dark:border-sky-900/60 dark:bg-sky-950/10',
    sidePanel:
      'border-sky-200 bg-sky-50 text-sky-950 shadow-sky-100/80 dark:border-sky-900 dark:bg-sky-950/80 dark:text-sky-100',
    sideIcon: 'text-sky-700 dark:text-sky-300',
    sideMuted: 'text-sky-700/75 dark:text-sky-300/75',
  },
  {
    key: 'variety',
    title: 'Variety',
    eyebrow: 'Choose the product lane',
    caption: 'Pick the SAP variety, like canola, cold press, refined, or any maintained item variant.',
    icon: Shapes,
    accent: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
    pageBackground: 'bg-rose-50/70 dark:bg-rose-950/20',
    stageBackground:
      'border-rose-200/80 bg-rose-50/45 dark:border-rose-900/60 dark:bg-rose-950/10',
    sidePanel:
      'border-rose-200 bg-rose-50 text-rose-950 shadow-rose-100/80 dark:border-rose-900 dark:bg-rose-950/80 dark:text-rose-100',
    sideIcon: 'text-rose-700 dark:text-rose-300',
    sideMuted: 'text-rose-700/75 dark:text-rose-300/75',
  },
  {
    key: 'sub_group',
    title: 'PM Sub Group',
    eyebrow: 'Narrow the family',
    caption: 'Pick the packaging lane, like carton, pouch, HDPE, PET, cap, or shrink.',
    icon: Layers3,
    accent: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
    pageBackground: 'bg-violet-50/70 dark:bg-violet-950/20',
    stageBackground:
      'border-violet-200/80 bg-violet-50/45 dark:border-violet-900/60 dark:bg-violet-950/10',
    sidePanel:
      'border-violet-200 bg-violet-50 text-violet-950 shadow-violet-100/80 dark:border-violet-900 dark:bg-violet-950/80 dark:text-violet-100',
    sideIcon: 'text-violet-700 dark:text-violet-300',
    sideMuted: 'text-violet-700/75 dark:text-violet-300/75',
  },
  {
    key: 'size',
    title: 'Size',
    eyebrow: 'Choose the pack size',
    caption: 'Select the SAP SKU value, for example 1 ltr, 2 ltr, 3 ltr, or any maintained pack size.',
    icon: Package,
    accent: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300',
    pageBackground: 'bg-cyan-50/70 dark:bg-cyan-950/20',
    stageBackground:
      'border-cyan-200/80 bg-cyan-50/45 dark:border-cyan-900/60 dark:bg-cyan-950/10',
    sidePanel:
      'border-cyan-200 bg-cyan-50 text-cyan-950 shadow-cyan-100/80 dark:border-cyan-900 dark:bg-cyan-950/80 dark:text-cyan-100',
    sideIcon: 'text-cyan-700 dark:text-cyan-300',
    sideMuted: 'text-cyan-700/75 dark:text-cyan-300/75',
  },
  {
    key: 'warehouse',
    title: 'Warehouse',
    eyebrow: 'Choose stock locations',
    caption: 'Only the selected warehouses will feed the final stock benchmark list.',
    icon: Warehouse,
    accent: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    pageBackground: 'bg-emerald-50/70 dark:bg-emerald-950/20',
    stageBackground:
      'border-emerald-200/80 bg-emerald-50/45 dark:border-emerald-900/60 dark:bg-emerald-950/10',
    sidePanel:
      'border-emerald-200 bg-emerald-50 text-emerald-950 shadow-emerald-100/80 dark:border-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-100',
    sideIcon: 'text-emerald-700 dark:text-emerald-300',
    sideMuted: 'text-emerald-700/75 dark:text-emerald-300/75',
  },
  {
    key: 'review',
    title: 'Review Filters',
    eyebrow: 'Ready for the list',
    caption: 'Confirm the applied filters, then load the dashboard table.',
    icon: ListChecks,
    accent: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    pageBackground: 'bg-amber-50/70 dark:bg-amber-950/20',
    stageBackground:
      'border-amber-200/80 bg-amber-50/45 dark:border-amber-900/60 dark:bg-amber-950/10',
    sidePanel:
      'border-amber-200 bg-amber-50 text-amber-950 shadow-amber-100/80 dark:border-amber-900 dark:bg-amber-950/80 dark:text-amber-100',
    sideIcon: 'text-amber-700 dark:text-amber-300',
    sideMuted: 'text-amber-700/75 dark:text-amber-300/75',
  },
];

function normalizeKey(value: string): string {
  return value.replace(/[\s_-]+/g, '').toLowerCase();
}

function withAllOption(options: StockDashboardFilterOption[]): StockDashboardFilterOption[] {
  return [{ value: ALL_MATERIAL_TYPES_VALUE, label: 'All material types' }, ...options];
}

function optionLabel(options: StockDashboardFilterOption[], value?: string): string {
  if (value === undefined) return 'Not selected';
  const option = options.find((item) => item.value === value);
  return option?.label || value || 'All material types';
}

function labelsForValues(options: StockDashboardFilterOption[], values?: string[]): string {
  if (!values?.length) return 'Not selected';
  const labels = values.map((value) => optionLabel(options, value));
  if (labels.length <= 3) return labels.join(', ');
  return `${labels.slice(0, 3).join(', ')} +${labels.length - 3} more`;
}

function getArrayFilter(filters: StockDashboardFilters, key: ArrayFilterKey): string[] {
  return filters[key] ?? [];
}

function toggleValue(values: string[] = [], value: string): string[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function prioritizeTopPmSubgroups(options: StockDashboardFilterOption[]): StockDashboardFilterOption[] {
  const byNormalized = new Map(options.map((option) => [normalizeKey(option.value), option]));
  const top = TOP_PM_SUBGROUPS.map((pinned) => {
    return byNormalized.get(normalizeKey(pinned.value)) ?? pinned;
  });
  const topKeys = new Set(TOP_PM_SUBGROUPS.map((option) => normalizeKey(option.value)));
  const rest = options.filter((option) => !topKeys.has(normalizeKey(option.value)));
  return [...top, ...rest];
}

function flowFiltersFromSearchParams(
  params: URLSearchParams,
  defaultItemGroup: string,
): StockDashboardFilters {
  const filters = filtersFromSearchParams(params, defaultItemGroup, {
    defaultWarehouse: false,
    defaultStatus: false,
    defaultMovement: false,
  });
  return { ...filters, unit: [], uom: [] };
}

function stepIndexFromSearchParams(params: URLSearchParams): number {
  const requestedStep = params.get('step') as FlowStepKey | null;
  const requestedIndex = FLOW_STEPS.findIndex((step) => step.key === requestedStep);
  return requestedIndex >= 0 ? requestedIndex : 0;
}

function optionScopeForStep(
  draft: StockDashboardFilters,
  stepKey: FlowStepKey,
  defaultItemGroup: string,
): StockDashboardFilters {
  const scoped: StockDashboardFilters = {
    item_group: draft.item_group ?? defaultItemGroup,
  };

  if (
    (stepKey === 'sub_group' || stepKey === 'size' || stepKey === 'warehouse' || stepKey === 'review') &&
    draft.variety?.length
  ) {
    scoped.variety = draft.variety;
  }

  if (
    (stepKey === 'size' || stepKey === 'warehouse' || stepKey === 'review') &&
    draft.sub_group?.length
  ) {
    scoped.sub_group = draft.sub_group;
  }

  if ((stepKey === 'warehouse' || stepKey === 'review') && draft.sku?.length) {
    scoped.sku = draft.sku;
  }

  return scoped;
}

function OptionLoadingGrid() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 animate-in fade-in-0 duration-300">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="flex min-h-20 items-center justify-between gap-3 rounded-lg border bg-background px-4 py-3 shadow-sm"
        >
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-24 animate-pulse rounded bg-muted/70" />
          </div>
          <div className="h-7 w-7 shrink-0 animate-pulse rounded-full bg-muted" />
        </div>
      ))}
    </div>
  );
}

export default function StockLevelFilterPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const baseOptionsQuery = useStockLevelFilterOptions();

  const baseItemGroups = baseOptionsQuery.data?.item_groups ?? EMPTY_OPTIONS;
  const defaultItemGroup =
    findDefaultMaterialGroup(baseItemGroups, (option) => option.value)?.value ||
    DEFAULT_MATERIAL_TYPE_NAME;

  const [stepIndex, setStepIndex] = useState(() => stepIndexFromSearchParams(searchParams));
  const [direction, setDirection] = useState<SlideDirection>('forward');
  const [optionSearch, setOptionSearch] = useState('');
  const [draft, setDraft] = useState<StockDashboardFilters>(() =>
    flowFiltersFromSearchParams(searchParams, defaultItemGroup),
  );

  useEffect(() => {
    setDraft(flowFiltersFromSearchParams(searchParams, defaultItemGroup));
  }, [defaultItemGroup, searchParams]);

  useEffect(() => {
    setStepIndex(stepIndexFromSearchParams(searchParams));
    setOptionSearch('');
  }, [searchParams]);

  const activeStep = FLOW_STEPS[stepIndex];
  const optionScopeFilters = useMemo(
    () => optionScopeForStep(draft, activeStep.key, defaultItemGroup),
    [activeStep.key, defaultItemGroup, draft],
  );
  const contextualOptionsQuery = useStockLevelFilterOptions(
    optionScopeFilters,
    Boolean(baseOptionsQuery.data) && activeStep.key !== 'material',
  );
  const flowOptions = contextualOptionsQuery.data;
  const materialOptions = withAllOption(baseOptionsQuery.data?.item_groups ?? EMPTY_OPTIONS);
  const isPackingMaterial = isPackingMaterialGroup(draft.item_group ?? defaultItemGroup);
  const subGroupOptions = isPackingMaterial
    ? prioritizeTopPmSubgroups(flowOptions?.sub_groups ?? EMPTY_OPTIONS)
    : flowOptions?.sub_groups ?? EMPTY_OPTIONS;
  const varietyOptions = flowOptions?.varieties ?? EMPTY_OPTIONS;
  const sizeOptions = flowOptions?.skus ?? EMPTY_OPTIONS;
  const warehouseOptions = flowOptions?.warehouses ?? EMPTY_OPTIONS;

  const ActiveIcon = activeStep.icon;
  const previousStep = stepIndex > 0 ? FLOW_STEPS[stepIndex - 1] : null;
  const nextStep = stepIndex < FLOW_STEPS.length - 1 ? FLOW_STEPS[stepIndex + 1] : null;
  const activeFilterCount = countActiveStockFilters(draft, defaultItemGroup);
  const canShowResults = Boolean(draft.warehouse?.length);
  const showResultsButtonClass =
    'bg-black text-white hover:bg-black/90 focus-visible:ring-black disabled:bg-black/40 disabled:text-white';
  const fromResults = searchParams.get('from_results') === '1';
  const backParams = new URLSearchParams(searchParams);
  backParams.delete('step');
  backParams.delete('from_results');
  backParams.set('show_results', '1');
  const backHref = fromResults
    ? `/dashboards/stock-levels?${backParams.toString()}`
    : '/dashboards';

  const reviewRows = useMemo<ReviewRow[]>(() => {
    const rows: ReviewRow[] = [
      {
        label: 'Material Type',
        value: optionLabel(materialOptions, draft.item_group ?? defaultItemGroup),
      },
      {
        label: 'Variety',
        value: labelsForValues(varietyOptions, draft.variety),
      },
      {
        label: 'PM Sub Group',
        value: labelsForValues(subGroupOptions, draft.sub_group),
      },
      {
        label: 'Size',
        value: labelsForValues(sizeOptions, draft.sku),
      },
      {
        label: 'Warehouse',
        value: labelsForValues(warehouseOptions, draft.warehouse),
      },
    ];

    if (draft.search) rows.push({ label: 'Search', value: draft.search });
    if (draft.as_of_date) rows.push({ label: 'As Of Date', value: draft.as_of_date });
    rows.push({
      label: 'Status',
      value: draft.status?.length ? draft.status.join(', ') : DEFAULT_STOCK_STATUS_FILTER.join(', '),
    });
    rows.push({
      label: 'Movement',
      value: draft.movement_status?.length
        ? draft.movement_status.join(', ')
        : DEFAULT_STOCK_MOVEMENT_FILTER.join(', '),
    });

    return rows;
  }, [
    defaultItemGroup,
    draft.as_of_date,
    draft.item_group,
    draft.movement_status,
    draft.search,
    draft.status,
    draft.sub_group,
    draft.sku,
    draft.variety,
    draft.warehouse,
    materialOptions,
    subGroupOptions,
    sizeOptions,
    varietyOptions,
    warehouseOptions,
  ]);

  function goToStep(nextIndex: number) {
    if (nextIndex < 0 || nextIndex >= FLOW_STEPS.length || nextIndex === stepIndex) return;
    setDirection(nextIndex > stepIndex ? 'forward' : 'backward');
    setStepIndex(nextIndex);
    setOptionSearch('');
  }

  function goNext() {
    goToStep(stepIndex + 1);
  }

  function goPrevious() {
    goToStep(stepIndex - 1);
  }

  function setMaterial(value: string) {
    setDraft((current) => ({
      ...current,
      item_group: value,
      sub_group: [],
      variety: [],
      sku: [],
      unit: [],
      uom: [],
      warehouse: [],
    }));
    goToStep(1);
  }

  function toggleArrayFilter(key: ArrayFilterKey, value: string) {
    setDraft((current) => {
      const next = {
        ...current,
        [key]: toggleValue(getArrayFilter(current, key), value),
      };

      if (key === 'variety') {
        return { ...next, sub_group: [], sku: [], unit: [], uom: [], warehouse: [] };
      }
      if (key === 'sub_group') {
        return { ...next, sku: [], unit: [], uom: [], warehouse: [] };
      }
      if (key === 'sku') {
        return { ...next, warehouse: [] };
      }
      return next;
    });
  }

  function clearStep(stepKey: FlowStepKey) {
    setDraft((current) => {
      if (stepKey === 'material') {
        return {
          ...current,
          item_group: defaultItemGroup,
          sub_group: [],
          variety: [],
          sku: [],
          unit: [],
          uom: [],
          warehouse: [],
        };
      }
      if (stepKey === 'variety') {
        return { ...current, variety: [], sub_group: [], sku: [], unit: [], uom: [], warehouse: [] };
      }
      if (stepKey === 'sub_group') {
        return { ...current, sub_group: [], sku: [], unit: [], uom: [], warehouse: [] };
      }
      if (stepKey === 'size') return { ...current, sku: [], warehouse: [] };
      if (stepKey === 'warehouse') return { ...current, warehouse: [] };
      return current;
    });
  }

  function resetFlow() {
    setDraft({
      item_group: defaultItemGroup,
      variety: [],
      sub_group: [],
      sku: [],
      unit: [],
      uom: [],
      warehouse: [],
      status: [],
      movement_status: [],
    });
    goToStep(0);
  }

  function applyFilters() {
    const params = filtersToSearchParams(draft);
    params.set('show_results', '1');
    navigate(`/dashboards/stock-levels?${params.toString()}`);
  }

  function canContinue(): boolean {
    if (activeStep.key === 'variety') return !varietyOptions.length || Boolean(draft.variety?.length);
    if (activeStep.key === 'sub_group') return !subGroupOptions.length || Boolean(draft.sub_group?.length);
    if (activeStep.key === 'size') return !sizeOptions.length || Boolean(draft.sku?.length);
    if (activeStep.key === 'warehouse') return Boolean(draft.warehouse?.length);
    return true;
  }

  function filteredOptions(options: StockDashboardFilterOption[]): StockDashboardFilterOption[] {
    const search = optionSearch.trim().toLowerCase();
    if (!search) return options;
    return options.filter((option) => {
      return `${option.label} ${option.value}`.toLowerCase().includes(search);
    });
  }

  function renderOptionGrid(
    options: StockDashboardFilterOption[],
    selectedValues: string[],
    onSelect: (value: string) => void,
    emptyText: string,
  ) {
    const visibleOptions = filteredOptions(options);
    const optionsAreLoading =
      activeStep.key === 'material' ? baseOptionsQuery.isLoading : contextualOptionsQuery.isLoading;

    return (
      <div className="space-y-4">
        {options.length > 8 && (
          <div className="relative mx-auto max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={optionSearch}
              onChange={(event) => setOptionSearch(event.target.value)}
              placeholder="Search options"
              className="h-11 pl-9"
            />
          </div>
        )}

        {optionsAreLoading ? (
          <OptionLoadingGrid />
        ) : visibleOptions.length ? (
          <div
            key={`${activeStep.key}-loaded-options`}
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 animate-in fade-in-0 slide-in-from-bottom-3 duration-500"
          >
            {visibleOptions.map((option, index) => {
              const isSelected = selectedValues.includes(option.value);
              return (
                <button
                  key={`${activeStep.key}-${option.value}`}
                  type="button"
                  onClick={() => onSelect(option.value)}
                  className={cn(
                    'group flex min-h-20 items-center justify-between gap-3 rounded-lg border bg-background px-4 py-3 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md animate-in fade-in-0 slide-in-from-bottom-2',
                    isSelected && 'border-primary bg-primary/10 ring-2 ring-primary/10',
                  )}
                  style={{
                    animationDelay: `${Math.min(300, index * 35)}ms`,
                    animationFillMode: 'both',
                  }}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{option.label}</span>
                    {option.count !== undefined && (
                      <span className="text-xs text-muted-foreground">
                        {option.count.toLocaleString('en-IN')} items
                      </span>
                    )}
                  </span>
                  <span
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors',
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-muted-foreground/30 group-hover:border-primary/60',
                    )}
                  >
                    {isSelected && <Check className="h-4 w-4" />}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
            {emptyText}
          </div>
        )}
      </div>
    );
  }

  function renderStepContent() {
    if (activeStep.key === 'material') {
      return renderOptionGrid(
        materialOptions,
        [draft.item_group ?? defaultItemGroup],
        setMaterial,
        'No SAP material types found.',
      );
    }

    if (activeStep.key === 'variety') {
      return renderOptionGrid(
        varietyOptions,
        draft.variety ?? [],
        (value) => toggleArrayFilter('variety', value),
        'No varieties found for this material type.',
      );
    }

    if (activeStep.key === 'sub_group') {
      return renderOptionGrid(
        subGroupOptions,
        draft.sub_group ?? [],
        (value) => toggleArrayFilter('sub_group', value),
        'No sub groups found for the selected variety.',
      );
    }

    if (activeStep.key === 'size') {
      return renderOptionGrid(
        sizeOptions,
        draft.sku ?? [],
        (value) => toggleArrayFilter('sku', value),
        'No size values found for the selected variety and sub group.',
      );
    }

    if (activeStep.key === 'warehouse') {
      return renderOptionGrid(
        warehouseOptions,
        draft.warehouse ?? [],
        (value) => toggleArrayFilter('warehouse', value),
        'No warehouses found for the selected filters.',
      );
    }

    return (
      <div className="mx-auto grid max-w-4xl gap-3 sm:grid-cols-2">
        {reviewRows.map((row) => (
          <div key={row.label} className="rounded-lg border bg-background p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-muted-foreground">{row.label}</p>
            <p className="mt-1 text-sm font-medium text-foreground">{row.value}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'min-h-full p-4 transition-colors duration-500 md:p-6',
        activeStep.pageBackground,
      )}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" asChild aria-label={fromResults ? 'Back to current results' : 'Back to dashboards'}>
              <Link to={backHref}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Stock Benchmark</p>
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Build Your Stock List
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={resetFlow}>
              <RotateCcw className="h-4 w-4" />
              Reset Flow
            </Button>
            <Button
              onClick={applyFilters}
              disabled={!canShowResults}
              className={showResultsButtonClass}
            >
              Show Results
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <section
          className={cn(
            'relative min-h-[640px] overflow-hidden rounded-xl border shadow-sm transition-colors duration-500',
            activeStep.stageBackground,
          )}
        >
          {previousStep && (
            <button
              type="button"
              onClick={goPrevious}
              className={cn(
                'absolute inset-y-10 left-3 z-10 hidden w-40 flex-col items-start justify-center rounded-xl border p-4 text-left shadow-lg transition-transform duration-300 hover:-translate-x-1 md:flex',
                previousStep.sidePanel,
              )}
              aria-label={`Go to ${previousStep.title}`}
            >
              <ChevronLeft className={cn('mb-3 h-5 w-5', previousStep.sideIcon)} />
              <span className={cn('text-xs font-semibold uppercase', previousStep.sideMuted)}>
                Previous
              </span>
              <span className="mt-1 text-sm font-semibold">{previousStep.title}</span>
            </button>
          )}

          {nextStep && (
            <button
              type="button"
              onClick={goNext}
              className={cn(
                'absolute inset-y-10 right-3 z-10 hidden w-40 flex-col items-end justify-center rounded-xl border p-4 text-right shadow-lg transition-transform duration-300 hover:translate-x-1 md:flex',
                nextStep.sidePanel,
              )}
              aria-label={`Go to ${nextStep.title}`}
            >
              <ChevronRight className={cn('mb-3 h-5 w-5', nextStep.sideIcon)} />
              <span className={cn('text-xs font-semibold uppercase', nextStep.sideMuted)}>
                Next
              </span>
              <span className="mt-1 text-sm font-semibold">{nextStep.title}</span>
            </button>
          )}

          {!nextStep && (
            <button
              type="button"
              onClick={applyFilters}
              disabled={!canShowResults}
              className="absolute inset-y-10 right-3 z-10 hidden w-40 flex-col items-end justify-center rounded-xl border border-black bg-black p-4 text-right text-white shadow-lg transition-transform duration-300 hover:translate-x-1 disabled:cursor-not-allowed disabled:bg-black/40 md:flex"
              aria-label="Show Stock Benchmark results"
            >
              <ArrowRight className="mb-3 h-5 w-5" />
              <span className="text-xs font-semibold uppercase text-white/70">Final</span>
              <span className="mt-1 text-sm font-semibold">Show Results</span>
            </button>
          )}

          <div
            key={activeStep.key}
            className={cn(
              'mx-auto flex min-h-[640px] max-w-5xl flex-col px-4 py-8 animate-in fade-in duration-500 md:px-12',
              direction === 'forward' ? 'slide-in-from-right-8' : 'slide-in-from-left-8',
            )}
          >
            <div className="mx-auto max-w-2xl text-center">
              <span className={cn('mx-auto flex h-14 w-14 items-center justify-center rounded-lg', activeStep.accent)}>
                <ActiveIcon className="h-7 w-7" />
              </span>
              <p className="mt-5 text-sm font-semibold uppercase text-muted-foreground">
                Step {stepIndex + 1} of {FLOW_STEPS.length} - {activeStep.eyebrow}
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">{activeStep.title}</h2>
              <p className="mt-3 text-sm text-muted-foreground md:text-base">
                {activeStep.caption}
              </p>
            </div>

            <div className="mt-8 flex-1">{renderStepContent()}</div>

            <div className="mt-8 flex flex-col gap-3 border-t pt-5 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {activeFilterCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border bg-background px-3 py-1">
                    <Package className="h-3.5 w-3.5" />
                    {activeFilterCount} applied filters
                  </span>
                )}
                {(contextualOptionsQuery.isFetching || baseOptionsQuery.isFetching) && (
                  <span className="inline-flex items-center rounded-full border bg-background px-3 py-1">
                    Refreshing SAP options
                  </span>
                )}
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={() => clearStep(activeStep.key)}>
                  <X className="h-4 w-4" />
                  Clear Step
                </Button>
                <Button variant="outline" onClick={goPrevious} disabled={!previousStep}>
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>
                {activeStep.key === 'review' ? (
                  <Button
                    onClick={applyFilters}
                    disabled={!canShowResults}
                    className={showResultsButtonClass}
                  >
                    Show Results
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={goNext} disabled={!canContinue()}>
                    Continue
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
