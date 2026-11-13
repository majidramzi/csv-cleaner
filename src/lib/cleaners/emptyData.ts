import type {
  CellValue,
  DataRow,
  DatasetState,
  FillEmptyCellsOptions,
  RemoveEmptyRowsOptions,
} from '../../types/dataset';

export function isCellEmpty(
  value: CellValue | undefined,
  treatWhitespaceAsEmpty = false
): boolean {
  if (value === null || value === undefined || value === '') {
    return true;
  }
  if (treatWhitespaceAsEmpty && typeof value === 'string' && value.trim() === '') {
    return true;
  }
  return false;
}

export interface RemoveEmptyRowsResult {
  state: DatasetState;
  removedCount: number;
}

/**
 * Removes rows where either ANY or ALL inspected columns contain empty values.
 */
export function removeEmptyRows(
  state: DatasetState,
  options: RemoveEmptyRowsOptions
): RemoveEmptyRowsResult {
  const targetColumnIds =
    options.columnIds && options.columnIds.length > 0
      ? options.columnIds.filter((id) => state.columns.some((c) => c.id === id))
      : state.columns.map((c) => c.id);

  if (targetColumnIds.length === 0 || state.rows.length === 0) {
    return { state, removedCount: 0 };
  }

  const treatWs = options.treatWhitespaceAsEmpty ?? false;
  const keptRows: DataRow[] = [];
  let removedCount = 0;

  for (const row of state.rows) {
    const shouldRemove =
      options.mode === 'any'
        ? targetColumnIds.some((colId) => isCellEmpty(row.cells[colId], treatWs))
        : targetColumnIds.every((colId) => isCellEmpty(row.cells[colId], treatWs));

    if (shouldRemove) {
      removedCount++;
    } else {
      keptRows.push(row);
    }
  }

  if (removedCount === 0) {
    return { state, removedCount: 0 };
  }

  return {
    state: {
      columns: state.columns,
      rows: keptRows,
    },
    removedCount,
  };
}

export interface RemoveEmptyColumnsResult {
  state: DatasetState;
  removedColumnIds: string[];
  removedColumnNames: string[];
}

/**
 * Removes columns where every row has an empty value (when at least 1 row exists, or if 0 rows does nothing).
 */
export function removeEmptyColumns(
  state: DatasetState,
  treatWhitespaceAsEmpty = false
): RemoveEmptyColumnsResult {
  if (state.columns.length === 0 || state.rows.length === 0) {
    return { state, removedColumnIds: [], removedColumnNames: [] };
  }

  const removedColumnIds: string[] = [];
  const removedColumnNames: string[] = [];

  const keptColumns = state.columns.filter((col) => {
    const allEmpty = state.rows.every((row) =>
      isCellEmpty(row.cells[col.id], treatWhitespaceAsEmpty)
    );
    if (allEmpty) {
      removedColumnIds.push(col.id);
      removedColumnNames.push(col.name);
      return false;
    }
    return true;
  });

  if (removedColumnIds.length === 0) {
    return { state, removedColumnIds: [], removedColumnNames: [] };
  }

  const removedSet = new Set(removedColumnIds);
  const updatedRows: DataRow[] = state.rows.map((row) => {
    const nextCells: Record<string, CellValue> = {};
    for (const [colId, val] of Object.entries(row.cells)) {
      if (!removedSet.has(colId)) {
        nextCells[colId] = val;
      }
    }
    return {
      id: row.id,
      cells: nextCells,
    };
  });

  return {
    state: {
      columns: keptColumns,
      rows: updatedRows,
    },
    removedColumnIds,
    removedColumnNames,
  };
}

export interface FillEmptyCellsResult {
  state: DatasetState;
  replacedCount: number;
}

/**
 * Replaces empty cells across target (or all) columns with a user-defined value.
 */
export function fillEmptyCells(
  state: DatasetState,
  options: FillEmptyCellsOptions
): FillEmptyCellsResult {
  const targetColumnIds =
    options.columnIds && options.columnIds.length > 0
      ? options.columnIds.filter((id) => state.columns.some((c) => c.id === id))
      : state.columns.map((c) => c.id);

  if (targetColumnIds.length === 0 || state.rows.length === 0) {
    return { state, replacedCount: 0 };
  }

  const treatWs = options.treatWhitespaceAsEmpty ?? false;
  let replacedCount = 0;

  const updatedRows: DataRow[] = state.rows.map((row) => {
    let rowMutated = false;
    const nextCells: Record<string, CellValue> = { ...row.cells };

    for (const colId of targetColumnIds) {
      if (isCellEmpty(nextCells[colId], treatWs)) {
        // Avoid counting if fillValue is already identical
        if (nextCells[colId] !== options.fillValue) {
          nextCells[colId] = options.fillValue;
          rowMutated = true;
          replacedCount++;
        }
      }
    }

    return rowMutated ? { id: row.id, cells: nextCells } : row;
  });

  if (replacedCount === 0) {
    return { state, replacedCount: 0 };
  }

  return {
    state: {
      columns: state.columns,
      rows: updatedRows,
    },
    replacedCount,
  };
}
