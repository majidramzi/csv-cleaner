import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type {
  CellValue,
  DataRow,
  DatasetState,
  ExportOptions,
  ExportSummary,
} from '../../types/dataset';

export interface PreparedTableExport {
  headers: string[];
  rows: CellValue[][];
}

/**
 * Converts DatasetState (and an optional custom row slice, e.g. filtered/sorted rows)
 * into ordered headers and 2D row arrays preserving exact column order, header names, and values.
 */
export function prepareExportMatrix(
  state: DatasetState,
  overrideRows?: DataRow[]
): PreparedTableExport {
  const headers = state.columns.map((col) => col.name);
  const targetRows = overrideRows ?? state.rows;

  const rows: CellValue[][] = targetRows.map((row) =>
    state.columns.map((col) => {
      const val = row.cells[col.id];
      return val === undefined || val === null ? '' : val;
    })
  );

  return { headers, rows };
}

/**
 * Serializes DatasetState into a valid CSV string using PapaParse.
 */
export function generateCsvContent(
  state: DatasetState,
  options?: {
    delimiter?: ',' | ';' | '\t' | '|';
    includeBom?: boolean;
    overrideRows?: DataRow[];
  }
): string {
  const { headers, rows } = prepareExportMatrix(state, options?.overrideRows);
  const delimiter = options?.delimiter ?? ',';

  if (headers.length === 0) {
    return '';
  }

  const csvBody = Papa.unparse(
    {
      fields: headers,
      data: rows,
    },
    {
      delimiter,
      quotes: false,
      newline: '\r\n',
    }
  );

  return options?.includeBom ? `\uFEFF${csvBody}` : csvBody;
}

/**
 * Serializes DatasetState into an XLSX workbook ArrayBuffer using SheetJS,
 * preserving numbers, booleans, strings, header names, and column widths.
 */
export function generateXlsxBuffer(
  state: DatasetState,
  options?: {
    sheetName?: string;
    overrideRows?: DataRow[];
  }
): Uint8Array {
  const { headers, rows } = prepareExportMatrix(state, options?.overrideRows);
  const aoa: CellValue[][] = headers.length > 0 ? [headers, ...rows] : [];

  const worksheet = XLSX.utils.aoa_to_sheet(aoa);

  // Set sensible column widths based on header & sample cell lengths
  if (headers.length > 0) {
    worksheet['!cols'] = headers.map((header, colIdx) => {
      let maxChars = header.length;
      const sampleCount = Math.min(rows.length, 100);
      for (let r = 0; r < sampleCount; r++) {
        const cell = rows[r]?.[colIdx];
        const cellLen = cell === null || cell === undefined ? 0 : String(cell).length;
        if (cellLen > maxChars) maxChars = cellLen;
      }
      return { wch: Math.min(Math.max(maxChars + 3, 10), 48) };
    });
  }

  const workbook = XLSX.utils.book_new();
  const safeSheetName = (options?.sheetName ?? 'Cleaned Data')
    .replace(/[\\/?*[\]:]/g, '_')
    .slice(0, 31) || 'Cleaned Data';

  XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);

  const out = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  return new Uint8Array(out);
}

/**
 * Computes an ExportSummary previewing exact row/column counts and byte size.
 */
export function buildExportSummary(
  currentState: DatasetState,
  originalState: DatasetState,
  modifiedCellsCount: number,
  options: ExportOptions,
  overrideRows?: DataRow[]
): ExportSummary {
  const targetRows = options.onlyFilteredRows && overrideRows ? overrideRows : currentState.rows;
  const normalizedName = normalizeExportFileName(options.fileName, options.format);

  let estimatedBytes = 0;
  if (options.format === 'csv') {
    const csv = generateCsvContent(currentState, {
      delimiter: options.delimiter,
      includeBom: options.includeBom,
      overrideRows: targetRows,
    });
    estimatedBytes = new TextEncoder().encode(csv).byteLength;
  } else {
    const xlsxBytes = generateXlsxBuffer(currentState, {
      sheetName: options.sheetName,
      overrideRows: targetRows,
    });
    estimatedBytes = xlsxBytes.byteLength;
  }

  return {
    fileName: normalizedName,
    format: options.format,
    finalRowCount: targetRows.length,
    finalColumnCount: currentState.columns.length,
    originalRowCount: originalState.rows.length,
    originalColumnCount: originalState.columns.length,
    rowsRemovedDelta: originalState.rows.length - targetRows.length,
    modifiedCellsCount,
    estimatedBytes,
  };
}

export function normalizeExportFileName(rawName: string, format: 'csv' | 'xlsx'): string {
  const base = rawName
    .trim()
    .replace(/\.(csv|xlsx|xls|tsv|txt)$/i, '')
    .trim();
  const safeBase = base || 'cleaned-dataset';
  return `${safeBase}.${format}`;
}

/**
 * Triggers a local browser file download without any network call.
 */
export function triggerExportDownload(
  state: DatasetState,
  options: ExportOptions,
  overrideRows?: DataRow[]
): string {
  const targetRows = options.onlyFilteredRows && overrideRows ? overrideRows : state.rows;
  const finalFileName = normalizeExportFileName(options.fileName, options.format);

  let blob: Blob;
  if (options.format === 'csv') {
    const csvString = generateCsvContent(state, {
      delimiter: options.delimiter ?? ',',
      includeBom: options.includeBom ?? true,
      overrideRows: targetRows,
    });
    blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  } else {
    const bytes = generateXlsxBuffer(state, {
      sheetName: options.sheetName ?? 'Cleaned Data',
      overrideRows: targetRows,
    });
    blob = new Blob([bytes.buffer as ArrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = finalFileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1500);

  return finalFileName;
}
