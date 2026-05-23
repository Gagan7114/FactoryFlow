import * as XLSX from 'xlsx';

const DEFAULT_EMPTY_VALUE = '-';
const DEFAULT_MIN_COLUMN_WIDTH = 10;
const DEFAULT_MAX_COLUMN_WIDTH = 60;
const EXCEL_SHEET_NAME_MAX_LENGTH = 31;

export type ExcelCellValue = string | number | boolean | Date;

export interface ExcelColumn<T> {
  header: string;
  value: keyof T | ((row: T, index: number) => unknown);
  format?: (value: unknown, row: T, index: number) => unknown;
  width?: number;
}

export interface ExcelWorksheetConfig<T> {
  rows: T[];
  columns: ExcelColumn<T>[];
  emptyValue?: ExcelCellValue;
  minColumnWidth?: number;
  maxColumnWidth?: number;
}

export interface ExcelWorkbookSheet {
  sheetName: string;
  worksheet: XLSX.WorkSheet;
}

export interface ExcelMetadataItem {
  label: string;
  value: unknown;
}

export interface CreateExcelWorkbookOptions {
  sheets: ExcelWorkbookSheet[];
  metadata?: ExcelMetadataItem[];
  includeExportedAt?: boolean;
  metadataSheetName?: string;
}

export interface DownloadExcelWorkbookOptions extends CreateExcelWorkbookOptions {
  fileName: string;
}

export interface DownloadExcelFromRowsOptions<T> extends ExcelWorksheetConfig<T> {
  fileName: string;
  sheetName: string;
  metadata?: ExcelMetadataItem[];
  includeExportedAt?: boolean;
  metadataSheetName?: string;
}

export function sanitizeExcelFileName(fileName: string): string {
  const trimmed = fileName.trim() || 'export';
  const withoutExtension = trimmed.replace(/\.xlsx$/i, '');
  const safeName = withoutExtension.replace(/[<>:"\/\\|?*\u0000-\u001F]/g, '_').slice(0, 180);

  return `${safeName || 'export'}.xlsx`;
}

export function sanitizeExcelSheetName(sheetName: string, fallback = 'Sheet1'): string {
  const safeName = sheetName
    .replace(/[\[\]:*?\/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return (safeName || fallback).slice(0, EXCEL_SHEET_NAME_MAX_LENGTH);
}

export function formatExcelCellValue(value: unknown, emptyValue: ExcelCellValue = DEFAULT_EMPTY_VALUE): ExcelCellValue {
  if (value === null || value === undefined || value === '') return emptyValue;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? emptyValue : value;
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    const joinedValue = value
      .map((item) => formatExcelCellValue(item, ''))
      .filter((item) => item !== '')
      .join(', ');

    return joinedValue || emptyValue;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function createExcelWorksheet<T>(config: ExcelWorksheetConfig<T>): XLSX.WorkSheet {
  const {
    rows,
    columns,
    emptyValue = DEFAULT_EMPTY_VALUE,
    minColumnWidth = DEFAULT_MIN_COLUMN_WIDTH,
    maxColumnWidth = DEFAULT_MAX_COLUMN_WIDTH,
  } = config;

  const headerRow = columns.map((column) => column.header);
  const dataRows = rows.map((row, rowIndex) =>
    columns.map((column) => formatExcelCellValue(resolveColumnValue(row, column, rowIndex), emptyValue)),
  );
  const sheetRows = [headerRow, ...dataRows];
  const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);

  worksheet['!cols'] = columns.map((column, columnIndex) => ({
    wch: column.width ?? getAutoColumnWidth(sheetRows, columnIndex, minColumnWidth, maxColumnWidth),
  }));

  return worksheet;
}

export function createExcelWorkbook(options: CreateExcelWorkbookOptions): XLSX.WorkBook {
  const { sheets, metadata, includeExportedAt, metadataSheetName = 'Export Details' } = options;

  if (sheets.length === 0) {
    throw new Error('At least one worksheet is required to create an Excel workbook.');
  }

  const workbook = XLSX.utils.book_new();
  const usedSheetNames = new Set<string>();
  const metadataEntries = [...(metadata ?? [])];
  const shouldIncludeExportedAt = includeExportedAt ?? metadataEntries.length > 0;

  if (shouldIncludeExportedAt) {
    metadataEntries.unshift({
      label: 'Exported At',
      value: new Date(),
    });
  }

  if (metadataEntries.length > 0) {
    XLSX.utils.book_append_sheet(
      workbook,
      createMetadataWorksheet(metadataEntries),
      getUniqueSheetName(metadataSheetName, usedSheetNames),
    );
  }

  sheets.forEach((sheet) => {
    XLSX.utils.book_append_sheet(
      workbook,
      sheet.worksheet,
      getUniqueSheetName(sheet.sheetName, usedSheetNames),
    );
  });

  return workbook;
}

export function downloadExcelWorkbook(options: DownloadExcelWorkbookOptions): void {
  const workbook = createExcelWorkbook(options);
  XLSX.writeFile(workbook, sanitizeExcelFileName(options.fileName), { bookType: 'xlsx' });
}

export function downloadExcelFromRows<T>(options: DownloadExcelFromRowsOptions<T>): void {
  const {
    fileName,
    sheetName,
    metadata,
    includeExportedAt,
    metadataSheetName,
    rows,
    columns,
    emptyValue,
    minColumnWidth,
    maxColumnWidth,
  } = options;

  const worksheet = createExcelWorksheet({
    rows,
    columns,
    emptyValue,
    minColumnWidth,
    maxColumnWidth,
  });

  downloadExcelWorkbook({
    fileName,
    sheets: [{ sheetName, worksheet }],
    metadata,
    includeExportedAt,
    metadataSheetName,
  });
}

function resolveColumnValue<T>(row: T, column: ExcelColumn<T>, index: number): unknown {
  const rawValue = typeof column.value === 'function' ? column.value(row, index) : row[column.value];
  return column.format ? column.format(rawValue, row, index) : rawValue;
}

function getAutoColumnWidth(
  rows: ExcelCellValue[][],
  columnIndex: number,
  minColumnWidth: number,
  maxColumnWidth: number,
): number {
  const maxContentLength = rows.reduce((maxLength, row) => {
    const value = row[columnIndex];
    const displayValue = value instanceof Date ? value.toLocaleString('en-IN') : String(value ?? '');
    return Math.max(maxLength, displayValue.length);
  }, minColumnWidth);

  return Math.min(Math.max(maxContentLength + 2, minColumnWidth), maxColumnWidth);
}

function createMetadataWorksheet(metadata: ExcelMetadataItem[]): XLSX.WorkSheet {
  return createExcelWorksheet({
    rows: metadata,
    columns: [
      { header: 'Field', value: 'label', width: 24 },
      { header: 'Value', value: (row) => row.value, width: 48 },
    ],
    emptyValue: '',
  });
}

function getUniqueSheetName(sheetName: string, usedSheetNames: Set<string>): string {
  const safeName = sanitizeExcelSheetName(sheetName);
  let candidate = safeName;
  let counter = 2;

  while (usedSheetNames.has(candidate)) {
    const suffix = ` ${counter}`;
    candidate = `${safeName.slice(0, EXCEL_SHEET_NAME_MAX_LENGTH - suffix.length)}${suffix}`;
    counter += 1;
  }

  usedSheetNames.add(candidate);
  return candidate;
}
