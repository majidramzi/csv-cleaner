import type { CellValue, DataRow, DatasetMetrics, DatasetState } from '../../types/dataset';
import { countDuplicateRows } from './duplicates';
import { isCellEmpty } from './emptyData';

export interface OriginalCellLookup {
  rowMap: Map<string, DataRow>;
  columnIdSet: Set<string>;
}

export function createOriginalLookup(original: DatasetState): OriginalCellLookup {
  return {
    rowMap: new Map(original.rows.map((r) => [r.id, r])),
    columnIdSet: new Set(original.columns.map((c) => c.id)),
  };
}

export function isCellModified(
  rowId: string,
  colId: string,
  currentValue: CellValue,
  lookup: OriginalCellLookup
): { modified: boolean; originalValue: CellValue; isNewColumn: boolean } {
  if (!lookup.columnIdSet.has(colId)) {
    return { modified: true, originalValue: null, isNewColumn: true };
  }
  const origRow = lookup.rowMap.get(rowId);
  if (!origRow) {
    return { modified: false, originalValue: null, isNewColumn: false };
  }
  const origVal = origRow.cells[colId] ?? null;
  const normCurrent = currentValue === undefined ? null : currentValue;
  const normOrig = origVal === undefined ? null : origVal;

  // Treat null and '' as equivalent empty states unless one became non-empty
  if ((normCurrent === null || normCurrent === '') && (normOrig === null || normOrig === '')) {
    return { modified: false, originalValue: origVal, isNewColumn: false };
  }

  return {
    modified: normCurrent !== normOrig,
    originalValue: origVal,
    isNewColumn: false,
  };
}

/**
 * Computes comprehensive dataset health and quality metrics.
 */
export function computeDatasetMetrics(
  current: DatasetState,
  originalLookup: OriginalCellLookup
): DatasetMetrics {
  const rowCount = current.rows.length;
  const columnCount = current.columns.length;
  const totalCells = rowCount * columnCount;

  let emptyCells = 0;
  let emptyRowsAll = 0;
  let emptyRowsAny = 0;
  let modifiedCellsCount = 0;

  const emptyByColumn: Record<string, number> = {};
  const typeTrackers: Record<
    string,
    { num: number; bool: number; text: number; empty: number }
  > = {};

  for (const col of current.columns) {
    emptyByColumn[col.id] = 0;
    typeTrackers[col.id] = { num: 0, bool: 0, text: 0, empty: 0 };
  }

  for (const row of current.rows) {
    let rowEmptyCount = 0;

    for (const col of current.columns) {
      const val = row.cells[col.id] ?? null;
      const tracker = typeTrackers[col.id];

      if (isCellEmpty(val, false)) {
        emptyCells++;
        rowEmptyCount++;
        emptyByColumn[col.id] = (emptyByColumn[col.id] ?? 0) + 1;
        if (tracker) tracker.empty++;
      } else if (typeof val === 'number') {
        if (tracker) tracker.num++;
      } else if (typeof val === 'boolean') {
        if (tracker) tracker.bool++;
      } else {
        // Check if string looks cleanly numeric
        const trimmed = String(val).trim();
        if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(trimmed)) {
          if (tracker) tracker.num++;
        } else {
          if (tracker) tracker.text++;
        }
      }

      const diff = isCellModified(row.id, col.id, val, originalLookup);
      if (diff.modified) {
        modifiedCellsCount++;
      }
    }

    if (columnCount > 0 && rowEmptyCount === columnCount) {
      emptyRowsAll++;
    }
    if (rowEmptyCount > 0) {
      emptyRowsAny++;
    }
  }

  const emptyColumnIds: string[] = [];
  const inferredTypeByColumn: DatasetMetrics['inferredTypeByColumn'] = {};

  for (const col of current.columns) {
    const emptyColCount = emptyByColumn[col.id] ?? 0;
    if (rowCount > 0 && emptyColCount === rowCount) {
      emptyColumnIds.push(col.id);
    }

    const t = typeTrackers[col.id];
    if (!t || t.num + t.bool + t.text === 0) {
      inferredTypeByColumn[col.id] = 'empty';
    } else if (t.num > 0 && t.bool === 0 && t.text === 0) {
      inferredTypeByColumn[col.id] = 'number';
    } else if (t.bool > 0 && t.num === 0 && t.text === 0) {
      inferredTypeByColumn[col.id] = 'boolean';
    } else if (t.text > 0 && t.num === 0 && t.bool === 0) {
      inferredTypeByColumn[col.id] = 'text';
    } else {
      inferredTypeByColumn[col.id] = 'mixed';
    }
  }

  const duplicateRowsCount = countDuplicateRows(current, {
    columnIds: [],
    caseSensitive: true,
    trimBeforeCompare: false,
    keep: 'first',
  });

  const completenessPercent =
    totalCells === 0 ? 100 : Math.round(((totalCells - emptyCells) / totalCells) * 1000) / 10;

  return {
    rowCount,
    columnCount,
    totalCells,
    emptyCells,
    emptyRowsAll,
    emptyRowsAny,
    emptyColumnIds,
    duplicateRowsCount,
    modifiedCellsCount,
    completenessPercent,
    emptyByColumn,
    inferredTypeByColumn,
  };
}
