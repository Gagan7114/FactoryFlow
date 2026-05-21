import type { ProductionMovementFilters } from '../types';

export const PRODUCTION_MOVEMENT_STALE_TIME = 3 * 60 * 1000;

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
  const from = new Date(to);
  from.setDate(from.getDate() - 30);

  return {
    date_from: toDateInput(from),
    date_to: toDateInput(to),
    direction: 'all',
    production_only: true,
    limit: 500,
  };
}
