import type {
  CalculatedColumnOptions,
  CellValue,
  ColumnMeta,
  DataRow,
  DatasetState,
} from '../../types/dataset';
import { compileFormula } from './formulaEngine';

/**
 * Renames a column while guaranteeing non-empty, unique column headers.
 */
export function renameColumn(
  state: DatasetState,
  columnId: string,
  rawNewName: string
): DatasetState {
  const trimmed = rawNewName.trim();
  if (!trimmed) {
    throw new Error('Column name cannot be empty.');
  }

  const target = state.columns.find((c) => c.id === columnId);
  if (!target || target.name === trimmed) {
    return state;
  }

  const duplicateExists = state.columns.some(
    (c) => c.id !== columnId && c.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (duplicateExists) {
    throw new Error(`A column named "${trimmed}" already exists.`);
  }

  return {
    columns: state.columns.map((col) =>
      col.id === columnId ? { ...col, name: trimmed } : col
    ),
    rows: state.rows,
  };
}

/**
 * Deletes one or more columns by ID from both column definitions and row cell maps.
 */
export function deleteColumns(state: DatasetState, columnIdsToDelete: string[]): DatasetState {
  const deleteSet = new Set(columnIdsToDelete);
  if (deleteSet.size === 0) return state;

  const nextColumns = state.columns.filter((col) => !deleteSet.has(col.id));
  if (nextColumns.length === state.columns.length) {
    return state;
  }

  const nextRows: DataRow[] = state.rows.map((row) => {
    const nextCells: Record<string, CellValue> = {};
    for (const [colId, val] of Object.entries(row.cells)) {
      if (!deleteSet.has(colId)) {
        nextCells[colId] = val;
      }
    }
    return {
      id: row.id,
      cells: nextCells,
    };
  });

  return {
    columns: nextColumns,
    rows: nextRows,
  };
}

/**
 * Reorders columns according to a new ordered array of column IDs.
 */
export function reorderColumns(state: DatasetState, orderedColumnIds: string[]): DatasetState {
  const colMap = new Map<string, ColumnMeta>(state.columns.map((c) => [c.id, c]));
  const reordered: ColumnMeta[] = [];
  const used = new Set<string>();

  for (const id of orderedColumnIds) {
    const found = colMap.get(id);
    if (found && !used.has(id)) {
      reordered.push(found);
      used.add(id);
    }
  }

  // Append any remaining columns not listed in orderedColumnIds
  for (const col of state.columns) {
    if (!used.has(col.id)) {
      reordered.push(col);
    }
  }

  return {
    columns: reordered,
    rows: state.rows,
  };
}

/**
 * Moves a single column one step left ('up') or right ('down').
 */
export function moveColumnStep(
  state: DatasetState,
  columnId: string,
  direction: 'left' | 'right'
): DatasetState {
  const index = state.columns.findIndex((c) => c.id === columnId);
  if (index === -1) return state;

  const targetIndex = direction === 'left' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= state.columns.length) {
    return state;
  }

  const nextColumns = [...state.columns];
  const current = nextColumns[index];
  const swapWith = nextColumns[targetIndex];
  if (!current || !swapWith) return state;

  nextColumns[index] = swapWith;
  nextColumns[targetIndex] = current;

  return {
    columns: nextColumns,
    rows: state.rows,
  };
}

/**
 * Previews the first `limit` calculated values for a formula expression before committing.
 */
export function previewCalculatedColumn(
  state: DatasetState,
  expression: string,
  limit = 5
): { values: CellValue[]; error: string | null } {
  try {
    const compiled = compileFormula(expression, state.columns);
    const sampleRows = state.rows.slice(0, limit);
    const values = sampleRows.map((row) => compiled.evaluate(row));
    return { values, error: null };
  } catch (err) {
    return {
      values: [],
      error: err instanceof Error ? err.message : 'Invalid formula',
    };
  }
}

/**
 * Adds a new calculated column evaluated across all rows.
 */
export function addCalculatedColumn(
  state: DatasetState,
  options: CalculatedColumnOptions
): DatasetState {
  const name = options.name.trim();
  if (!name) {
    throw new Error('Calculated column name is required.');
  }
  if (state.columns.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
    throw new Error(`A column named "${name}" already exists.`);
  }

  const compiled = compileFormula(options.expression, state.columns);

  const uniqueSuffix = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const newColId = `calc_${uniqueSuffix}`;

  const newColumn: ColumnMeta = {
    id: newColId,
    name,
    isCalculated: true,
    formula: options.expression.trim(),
  };

  const nextRows: DataRow[] = state.rows.map((row) => ({
    id: row.id,
    cells: {
      ...row.cells,
      [newColId]: compiled.evaluate(row),
    },
  }));

  return {
    columns: [...state.columns, newColumn],
    rows: nextRows,
  };
}

/**
 * Updates a single cell value directly (e.g. inline spreadsheet cell edit).
 */
export function updateCellValue(
  state: DatasetState,
  rowId: string,
  columnId: string,
  newValue: CellValue
): DatasetState {
  return {
    columns: state.columns,
    rows: state.rows.map((row) =>
      row.id === rowId
        ? {
            id: row.id,
            cells: {
              ...row.cells,
              [columnId]: newValue,
            },
          }
        : row
    ),
  };
}
