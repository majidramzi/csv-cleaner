import type {
  CellValue,
  DataRow,
  DatasetState,
  DuplicateRemovalOptions,
  DuplicateRemovalResult,
} from '../../types/dataset';

function serializeCellForDuplicateCheck(
  value: CellValue,
  caseSensitive: boolean,
  trimBeforeCompare: boolean
): string {
  if (value === null || value === undefined || value === '') {
    return '__EMPTY__';
  }

  let str = String(value);
  if (trimBeforeCompare) {
    str = str.trim();
  }
  if (!caseSensitive) {
    str = str.toLowerCase();
  }
  const typeTag = typeof value === 'number' ? 'N' : typeof value === 'boolean' ? 'B' : 'S';
  // If case-insensitive or trimmed, treat equivalent string/number representations consistently
  return trimBeforeCompare || !caseSensitive ? `V:${str}` : `${typeTag}:${str}`;
}

export function buildRowSignature(
  row: DataRow,
  targetColumnIds: string[],
  caseSensitive: boolean,
  trimBeforeCompare: boolean
): string {
  return targetColumnIds
    .map((colId) =>
      serializeCellForDuplicateCheck(row.cells[colId] ?? null, caseSensitive, trimBeforeCompare)
    )
    .join('\u001F');
}

/**
 * Removes duplicate rows according to selected columns and comparison rules.
 */
export function removeDuplicateRows(
  state: DatasetState,
  options: DuplicateRemovalOptions
): DuplicateRemovalResult {
  const targetColumnIds =
    options.columnIds.length > 0
      ? options.columnIds.filter((id) => state.columns.some((c) => c.id === id))
      : state.columns.map((c) => c.id);

  if (targetColumnIds.length === 0 || state.rows.length <= 1) {
    return {
      state,
      removedCount: 0,
      removedRowIds: [],
    };
  }

  const seen = new Set<string>();
  const removedRowIds: string[] = [];

  if (options.keep === 'last') {
    const keptReversed: DataRow[] = [];
    for (let i = state.rows.length - 1; i >= 0; i--) {
      const row = state.rows[i];
      if (!row) continue;
      const sig = buildRowSignature(
        row,
        targetColumnIds,
        options.caseSensitive,
        options.trimBeforeCompare
      );
      if (seen.has(sig)) {
        removedRowIds.push(row.id);
      } else {
        seen.add(sig);
        keptReversed.push(row);
      }
    }
    keptReversed.reverse();
    removedRowIds.reverse();
    return {
      state: {
        columns: state.columns,
        rows: keptReversed,
      },
      removedCount: removedRowIds.length,
      removedRowIds,
    };
  }

  const keptRows: DataRow[] = [];
  for (const row of state.rows) {
    const sig = buildRowSignature(
      row,
      targetColumnIds,
      options.caseSensitive,
      options.trimBeforeCompare
    );
    if (seen.has(sig)) {
      removedRowIds.push(row.id);
    } else {
      seen.add(sig);
      keptRows.push(row);
    }
  }

  return {
    state: {
      columns: state.columns,
      rows: keptRows,
    },
    removedCount: removedRowIds.length,
    removedRowIds,
  };
}

/**
 * Counts how many duplicate rows exist without mutating or cloning rows unnecessarily.
 */
export function countDuplicateRows(
  state: DatasetState,
  options?: Partial<DuplicateRemovalOptions>
): number {
  const resolved: DuplicateRemovalOptions = {
    columnIds: options?.columnIds ?? [],
    caseSensitive: options?.caseSensitive ?? true,
    trimBeforeCompare: options?.trimBeforeCompare ?? false,
    keep: options?.keep ?? 'first',
  };
  return removeDuplicateRows(state, resolved).removedCount;
}
