import * as XLSX from 'xlsx';
import type { DatasetState } from '../../types/dataset';
import { matrixToDataset } from './headerUtils';

export interface ExcelWorkbookInfo {
  sheetNames: string[];
}

export interface ExcelSheetParseResult {
  state: DatasetState;
  sheetNames: string[];
  selectedSheet: string;
}

/**
 * Inspects an Excel (.xlsx / .xls) ArrayBuffer and returns its available worksheet names.
 */
export function getExcelSheetNames(buffer: ArrayBuffer): string[] {
  const workbook = XLSX.read(buffer, { type: 'array', bookSheets: true });
  return workbook.SheetNames;
}

/**
 * Parses a specific worksheet (or the first worksheet by default) from an Excel ArrayBuffer.
 */
export function parseExcelBuffer(
  buffer: ArrayBuffer,
  requestedSheetName?: string
): ExcelSheetParseResult {
  const workbook = XLSX.read(buffer, {
    type: 'array',
    cellDates: true,
    raw: true,
  });

  const sheetNames = workbook.SheetNames;
  if (sheetNames.length === 0) {
    return {
      state: { columns: [], rows: [] },
      sheetNames: [],
      selectedSheet: '',
    };
  }

  const selectedSheet =
    requestedSheetName && sheetNames.includes(requestedSheetName)
      ? requestedSheetName
      : (sheetNames[0] ?? '');

  const worksheet = workbook.Sheets[selectedSheet];
  if (!worksheet) {
    return {
      state: { columns: [], rows: [] },
      sheetNames,
      selectedSheet,
    };
  }

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: '',
    blankrows: true,
    raw: true,
  });

  // Trim trailing completely empty rows that Excel sometimes pads at the bottom of used range,
  // while keeping internal empty rows so the user can inspect/clean them.
  while (matrix.length > 1) {
    const tail = matrix[matrix.length - 1];
    const isAllBlank = !tail || tail.every((cell) => cell === '' || cell === null || cell === undefined);
    if (isAllBlank) {
      matrix.pop();
    } else {
      break;
    }
  }

  const state = matrixToDataset(matrix);

  return {
    state,
    sheetNames,
    selectedSheet,
  };
}
