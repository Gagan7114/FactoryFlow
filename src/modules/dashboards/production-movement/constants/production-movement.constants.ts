import type { ProductionMovementFilters } from '../types';

export const PRODUCTION_MOVEMENT_STALE_TIME = 3 * 60 * 1000;

export type ProductionFlowRouteKind = 'transfer' | 'production';

export interface ProductionFlowRouteDefinition {
  id: string;
  label: string;
  fromCodes: string[];
  toCodes: string[];
  kind: ProductionFlowRouteKind;
}

export const PRODUCTION_FLOW_ROUTES: ProductionFlowRouteDefinition[] = [
  {
    id: 'pm-bs',
    label: 'PM to BS',
    fromCodes: ['BH-PM', 'GP-PM'],
    toCodes: ['BH-BS'],
    kind: 'transfer',
  },
  {
    id: 'bs-pc',
    label: 'BS to PC',
    fromCodes: ['BH-BS'],
    toCodes: ['BH-PC'],
    kind: 'transfer',
  },
  {
    id: 'pm-pc',
    label: 'PM to PC',
    fromCodes: ['BH-PM', 'GP-PM'],
    toCodes: ['BH-PC'],
    kind: 'transfer',
  },
  {
    id: 'pc-pf',
    label: 'PC to PF',
    fromCodes: ['BH-PC'],
    toCodes: ['BH-PF'],
    kind: 'production',
  },
  {
    id: 'pf-gpfg',
    label: 'PF to FG Gupta',
    fromCodes: ['BH-PF'],
    toCodes: ['GP-FG'],
    kind: 'transfer',
  },
  {
    id: 'pf-bhfg',
    label: 'PF to FG Basement',
    fromCodes: ['BH-PF'],
    toCodes: ['BH-FG'],
    kind: 'transfer',
  },
  {
    id: 'pf-bhec',
    label: 'PF to FG Ecom',
    fromCodes: ['BH-PF'],
    toCodes: ['BH-EC'],
    kind: 'transfer',
  },
];

export const DIRECTION_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'in', label: 'In' },
  { value: 'out', label: 'Out' },
] as const;

export const LIMIT_OPTIONS = [
  { value: 100, label: '100 rows' },
  { value: 250, label: '250 rows' },
  { value: 500, label: '500 rows' },
  { value: 1000, label: '1000 rows' },
] as const;

function toDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDefaultProductionMovementFilters(): ProductionMovementFilters {
  const to = new Date();

  return {
    date_from: toDateInput(to),
    date_to: toDateInput(to),
    direction: 'all',
    production_only: true,
    limit: 500,
  };
}
