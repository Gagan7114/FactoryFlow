import type { ExcelMetadataItem, ExcelWorkbookSheet } from './excelExport';
import { createExcelWorksheet } from './excelExport';

export type DashboardExcelRecord = Record<string, unknown>;

export function createRecordSheet(
  sheetName: string,
  rows: DashboardExcelRecord[],
): ExcelWorkbookSheet | null {
  if (rows.length === 0) return null;
  const firstRow = rows[0];
  if (!firstRow) return null;
  const headers = Object.keys(firstRow);

  return {
    sheetName,
    worksheet: createExcelWorksheet({
      rows,
      columns: headers.map((header) => ({ header, value: header })),
    }),
  };
}

export function createFilterMetadata(
  filters: object,
  labels: Record<string, string> = {},
): ExcelMetadataItem[] {
  return Object.entries(filters as Record<string, unknown>)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => ({
      label: labels[key] ?? titleCase(key),
      value: formatExportValue(value),
    }));
}

export function compactExportValue(value: unknown, fallback = '-'): string {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

export function formatYesNo(value: boolean | undefined): string {
  if (value === undefined) return '-';
  return value ? 'Yes' : 'No';
}

export function formatPercent(value: number | null | undefined, fractionDigits = 0): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '-';
  return `${(value * 100).toFixed(fractionDigits)}%`;
}

export function joinExportValues(value: unknown[] | undefined): string {
  if (!value || value.length === 0) return 'All';
  return value.map((item) => compactExportValue(item)).join(', ');
}

function formatExportValue(value: unknown): string | number | boolean | Date {
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return joinExportValues(value);
  if (typeof value === 'boolean') return formatYesNo(value);
  if (typeof value === 'number' || typeof value === 'string') return value;

  try {
    return JSON.stringify(value);
  } catch {
    return compactExportValue(value);
  }
}

function titleCase(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1));
}
