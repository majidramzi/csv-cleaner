import type { CellValue, ColumnMeta, DataRow, DatasetState } from '../../types/dataset';

/**
 * Normalizes raw header values into unique, non-empty ColumnMeta objects
 * while preserving original column header names as closely as possible.
 */
export function buildColumnsFromHeaders(rawHeaders: unknown[]): ColumnMeta[] {
  const seenCounts = new Map<string, number>();

  return rawHeaders.map((raw, index) => {
    const baseRaw =
      raw === null || raw === undefined || String(raw).trim() === ''
        ? `Column_${index + 1}`
        : String(raw);

    const count = seenCounts.get(baseRaw) ?? 0;
    seenCounts.set(baseRaw, count + 1);

    const uniqueName = count === 0 ? baseRaw : `${baseRaw} (${count + 1})`;

    return {
      id: `col_${index}`,
      name: uniqueName,
    };
  });
}

/**
 * Parses a raw string value into an appropriate primitive CellValue
 * without corrupting leading-zero codes (e.g. ZIP codes "00501", IDs "0123").
 */
export function coerceRawScalar(raw: unknown): CellValue {
  if (raw === null || raw === undefined) {
    return null;
  }
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : String(raw);
  }
  if (typeof raw === 'boolean') {
    return raw;
  }
  if (raw instanceof Date) {
    if (Number.isNaN(raw.getTime())) return null;
    return raw.toISOString().slice(0, 10);
  }

  const str = String(raw);
  if (str === '') {
    return '';
  }

  const trimmed = str.trim();
  if (trimmed === '') {
    // Preserve whitespace-only strings so the user can inspect & clean them!
    return str;
  }

  // Only coerce to number when there is no leading/trailing whitespace to preserve
  // (if there's leading/trailing whitespace, keep as string so "Trim whitespace" visibly cleans it!)
  if (trimmed === str) {
    // Avoid converting leading-zero strings like "0123" or "+44123"
    if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(str)) {
      const num = Number(str);
      if (Number.isSafeInteger(num) || (!Number.isInteger(num) && Number.isFinite(num) && str.length <= 15)) {
        return num;
      }
    }
    if (str === 'true') return true;
    if (str === 'false') return false;
  }

  return str;
}

/**
 * Converts a 2D matrix (first row = headers, subsequent rows = data) into DatasetState.
 */
export function matrixToDataset(matrix: unknown[][]): DatasetState {
  if (matrix.length === 0) {
    return { columns: [], rows: [] };
  }

  const headerRow = matrix[0] ?? [];
  const dataMatrix = matrix.slice(1);

  // Determine widest row in case data rows have extra trailing cells beyond header length
  let maxCols = headerRow.length;
  for (const row of dataMatrix) {
    if (row.length > maxCols) {
      maxCols = row.length;
    }
  }

  const paddedHeaders: unknown[] = Array.from({ length: maxCols }, (_, i) => headerRow[i] ?? '');
  const columns = buildColumnsFromHeaders(paddedHeaders);

  const rows: DataRow[] = dataMatrix.map((rawRow, rowIdx) => {
    const cells: Record<string, CellValue> = {};
    for (let colIdx = 0; colIdx < columns.length; colIdx++) {
      const col = columns[colIdx];
      if (!col) continue;
      const rawCell = colIdx < rawRow.length ? rawRow[colIdx] : '';
      cells[col.id] = coerceRawScalar(rawCell);
    }
    return {
      id: `row_${rowIdx}`,
      cells,
    };
  });

  return { columns, rows };
}
