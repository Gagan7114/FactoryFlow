import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';

import {
  createExcelWorkbook,
  createExcelWorksheet,
  formatExcelCellValue,
  sanitizeExcelFileName,
  sanitizeExcelSheetName,
  type ExcelColumn,
} from '../../utils/excelExport';

interface ExportRow {
  entryNo: string;
  quantity: number;
  missingValue?: string | null;
  tags: string[];
}

describe('excelExport utilities', () => {
  it('creates a worksheet from rows and column definitions', () => {
    const rows: ExportRow[] = [
      {
        entryNo: 'DOCK-20260519-0004',
        quantity: 3,
        missingValue: null,
        tags: ['pending', 'gatepass'],
      },
    ];
    const columns: ExcelColumn<ExportRow>[] = [
      { header: 'Entry No.', value: 'entryNo' },
      { header: 'Quantity', value: 'quantity' },
      { header: 'Missing', value: 'missingValue' },
      { header: 'Tags', value: 'tags' },
      { header: 'Row No.', value: (_row, index) => index + 1 },
    ];

    const worksheet = createExcelWorksheet({ rows, columns });
    const sheetRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

    expect(sheetRows[0]).toEqual(['Entry No.', 'Quantity', 'Missing', 'Tags', 'Row No.']);
    expect(sheetRows[1]).toEqual(['DOCK-20260519-0004', 3, '-', 'pending, gatepass', 1]);
    expect(worksheet['!cols']?.[0]?.wch).toBeGreaterThan('Entry No.'.length);
  });

  it('applies column formatters before writing cell values', () => {
    const worksheet = createExcelWorksheet({
      rows: [{ quantity: 12.5 }],
      columns: [
        {
          header: 'Quantity',
          value: 'quantity',
          format: (value) => `${value} KG`,
        },
      ],
    });
    const sheetRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

    expect(sheetRows[1]).toEqual(['12.5 KG']);
  });

  it('sanitizes Excel filenames and sheet names', () => {
    expect(sanitizeExcelFileName('Gate: Dashboard/Dispatch')).toBe('Gate_ Dashboard_Dispatch.xlsx');
    expect(sanitizeExcelFileName('Docking.xlsx')).toBe('Docking.xlsx');
    expect(sanitizeExcelSheetName('Gate: Dispatch / Docking * Pending')).toBe(
      'Gate Dispatch Docking Pending',
    );
    expect(sanitizeExcelSheetName('A very long dashboard sheet name that exceeds Excel limits')).toHaveLength(31);
  });

  it('normalizes empty, array, object, and date values', () => {
    const date = new Date('2026-05-23T10:30:00');

    expect(formatExcelCellValue(null)).toBe('-');
    expect(formatExcelCellValue(['A', null, 'B'])).toBe('A, B');
    expect(formatExcelCellValue({ status: 'DONE' })).toBe('{"status":"DONE"}');
    expect(formatExcelCellValue(date)).toBe(date);
  });

  it('creates a workbook with metadata and unique sheet names', () => {
    const worksheetOne = createExcelWorksheet({
      rows: [{ name: 'First' }],
      columns: [{ header: 'Name', value: 'name' }],
    });
    const worksheetTwo = createExcelWorksheet({
      rows: [{ name: 'Second' }],
      columns: [{ header: 'Name', value: 'name' }],
    });

    const workbook = createExcelWorkbook({
      metadata: [{ label: 'Date Range', value: '2026-05-01 to 2026-05-23' }],
      includeExportedAt: false,
      sheets: [
        { sheetName: 'Dashboard', worksheet: worksheetOne },
        { sheetName: 'Dashboard', worksheet: worksheetTwo },
      ],
    });

    expect(workbook.SheetNames).toEqual(['Export Details', 'Dashboard', 'Dashboard 2']);
  });
});
