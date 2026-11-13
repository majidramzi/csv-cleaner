import { describe, expect, it } from 'vitest';
import type { DatasetState } from '../types/dataset';
import {
  buildExportSummary,
  generateCsvContent,
  generateXlsxBuffer,
  prepareExportMatrix,
} from '../lib/exporters/exportData';
import { parseExcelBuffer } from '../lib/parsers/excelParser';

const originalState: DatasetState = {
  columns: [
    { id: 'c1', name: 'ID' },
    { id: 'c2', name: 'Customer' },
    { id: 'c3', name: 'Total' },
  ],
  rows: [
    { id: 'r1', cells: { c1: 'A1', c2: 'Alice, Inc.', c3: 250 } },
    { id: 'r2', cells: { c1: 'A1', c2: 'Alice, Inc.', c3: 250 } },
    { id: 'r3', cells: { c1: 'B2', c2: 'Bob Co', c3: null } },
  ],
};

// Reordered & renamed & deduplicated state
const cleanedState: DatasetState = {
  columns: [
    { id: 'c2', name: 'Client Name' },
    { id: 'c1', name: 'Order Code' },
    { id: 'c3', name: 'Amount USD' },
  ],
  rows: [
    { id: 'r1', cells: { c1: 'A1', c2: 'Alice, Inc.', c3: 250 } },
    { id: 'r3', cells: { c1: 'B2', c2: 'Bob Co', c3: 0 } },
  ],
};

describe('Export Preparation (CSV & XLSX)', () => {
  it('preserves exact column order, renamed headers, and cleaned values in export matrix', () => {
    const matrix = prepareExportMatrix(cleanedState);
    expect(matrix.headers).toEqual(['Client Name', 'Order Code', 'Amount USD']);
    expect(matrix.rows).toEqual([
      ['Alice, Inc.', 'A1', 250],
      ['Bob Co', 'B2', 0],
    ]);
  });

  it('generates valid CSV quoting values with embedded commas and optional BOM', () => {
    const csv = generateCsvContent(cleanedState, { delimiter: ',', includeBom: false });
    expect(csv).toContain('Client Name,Order Code,Amount USD');
    expect(csv).toContain('"Alice, Inc.",A1,250');

    const csvWithBom = generateCsvContent(cleanedState, { delimiter: ';', includeBom: true });
    expect(csvWithBom.charCodeAt(0)).toBe(0xfeff);
    expect(csvWithBom).toContain('Client Name;Order Code;Amount USD');
  });

  it('generates a valid XLSX binary buffer that roundtrips headers and typed values', () => {
    const bytes = generateXlsxBuffer(cleanedState, { sheetName: 'FinalOrders' });
    expect(bytes.byteLength).toBeGreaterThan(100);

    const roundtrip = parseExcelBuffer(bytes.buffer as ArrayBuffer, 'FinalOrders');
    expect(roundtrip.selectedSheet).toBe('FinalOrders');
    expect(roundtrip.state.columns.map((c) => c.name)).toEqual([
      'Client Name',
      'Order Code',
      'Amount USD',
    ]);
    expect(roundtrip.state.rows[0]?.cells).toEqual({
      col_0: 'Alice, Inc.',
      col_1: 'A1',
      col_2: 250,
    });
  });

  it('computes accurate export summary counts and byte estimates', () => {
    const summary = buildExportSummary(cleanedState, originalState, 1, {
      format: 'csv',
      fileName: 'sales_report.csv',
      delimiter: ',',
      includeBom: true,
    });

    expect(summary.fileName).toBe('sales_report.csv');
    expect(summary.finalRowCount).toBe(2);
    expect(summary.finalColumnCount).toBe(3);
    expect(summary.originalRowCount).toBe(3);
    expect(summary.rowsRemovedDelta).toBe(1);
    expect(summary.modifiedCellsCount).toBe(1);
    expect(summary.estimatedBytes).toBeGreaterThan(30);
  });
});
