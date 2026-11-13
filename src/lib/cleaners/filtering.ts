import type {
  ActiveFilters,
  CellValue,
  DataRow,
  DatasetState,
  NumericRangeFilter,
  TextColumnFilter,
} from '../../types/dataset';
import { isCellEmpty } from './emptyData';

function parseCellNumber(value: CellValue): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const cleaned = value.trim().replace(/,/g, '');
    if (cleaned === '') return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function matchesTextFilter(row: DataRow, filter: TextColumnFilter): boolean {
  const raw = row.cells[filter.columnId] ?? null;

  if (filter.operator === 'is_empty') {
    return isCellEmpty(raw, true);
  }
  if (filter.operator === 'is_not_empty') {
    return !isCellEmpty(raw, true);
  }

  const cellText = raw === null || raw === undefined ? '' : String(raw);
  const needle = filter.value;
  if (needle === '') return true;

  const hay = filter.caseSensitive ? cellText : cellText.toLowerCase();
  const target = filter.caseSensitive ? needle : needle.toLowerCase();

  switch (filter.operator) {
    case 'contains':
      return hay.includes(target);
    case 'not_contains':
      return !hay.includes(target);
    case 'equals':
      return hay === target;
    case 'starts_with':
      return hay.startsWith(target);
    case 'ends_with':
      return hay.endsWith(target);
    default:
      return true;
  }
}

function matchesNumericFilter(row: DataRow, filter: NumericRangeFilter): boolean {
  if (filter.min === undefined && filter.max === undefined) {
    return true;
  }
  const num = parseCellNumber(row.cells[filter.columnId] ?? null);
  if (num === null) {
    return false;
  }
  if (filter.min !== undefined && !Number.isNaN(filter.min) && num < filter.min) {
    return false;
  }
  if (filter.max !== undefined && !Number.isNaN(filter.max) && num > filter.max) {
    return false;
  }
  return true;
}

/**
 * Returns the subset of rows matching global search, column text filters, and numeric range filters.
 */
export function filterDatasetRows(state: DatasetState, filters: ActiveFilters): DataRow[] {
  const hasGlobal = filters.globalSearch.trim().length > 0;
  const globalNeedle = filters.globalSearch.trim().toLowerCase();
  const activeText = filters.textFilters.filter(
    (f) => f.operator === 'is_empty' || f.operator === 'is_not_empty' || f.value !== ''
  );
  const activeNumeric = filters.numericFilters.filter(
    (f) =>
      (f.min !== undefined && !Number.isNaN(f.min)) ||
      (f.max !== undefined && !Number.isNaN(f.max))
  );

  if (!hasGlobal && activeText.length === 0 && activeNumeric.length === 0) {
    return state.rows;
  }

  const colIds = state.columns.map((c) => c.id);

  return state.rows.filter((row) => {
    if (hasGlobal) {
      let matchedAnyCol = false;
      for (const colId of colIds) {
        const val = row.cells[colId];
        if (val !== null && val !== undefined && String(val).toLowerCase().includes(globalNeedle)) {
          matchedAnyCol = true;
          break;
        }
      }
      if (!matchedAnyCol) return false;
    }

    for (const tf of activeText) {
      if (!matchesTextFilter(row, tf)) return false;
    }

    for (const nf of activeNumeric) {
      if (!matchesNumericFilter(row, nf)) return false;
    }

    return true;
  });
}

export function hasAnyActiveFilters(filters: ActiveFilters): boolean {
  if (filters.globalSearch.trim().length > 0) return true;
  if (
    filters.textFilters.some(
      (f) => f.operator === 'is_empty' || f.operator === 'is_not_empty' || f.value !== ''
    )
  ) {
    return true;
  }
  if (
    filters.numericFilters.some(
      (f) =>
        (f.min !== undefined && !Number.isNaN(f.min)) ||
        (f.max !== undefined && !Number.isNaN(f.max))
    )
  ) {
    return true;
  }
  return false;
}
