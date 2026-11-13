import type { CellValue, DataRow, DatasetState, TextCleaningOptions } from '../../types/dataset';

/**
 * Converts a string to Title Case while preserving word boundaries cleanly.
 */
export function toTitleCase(input: string): string {
  return input
    .toLowerCase()
    .replace(/(?:^|[\s\-_/([{"'])(\p{L})/gu, (match) => match.toUpperCase());
}

/**
 * Cleans an individual string value according to the selected text cleaning rules.
 */
export function cleanStringText(input: string, options: TextCleaningOptions): string {
  let result = input;

  if (options.normalizeUnicode) {
    // Normalize compatibility characters & canonical composition
    result = result.normalize('NFC');
    // Replace non-breaking spaces and exotic spaces with standard space
    result = result.replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ');
    // Remove zero-width characters and non-printable ASCII control chars (except \t, \n, \r)
    result = result.replace(/[\u200B-\u200D\uFEFF]/g, '');
    // eslint-disable-next-line no-control-regex
    result = result.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
    // Normalize smart quotes and dashes
    result = result
      .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
      .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
      .replace(/[\u2013\u2014]/g, '-');
  }

  if (options.stripAccents) {
    result = result.normalize('NFD').replace(/[\u0300-\u036f]/g, '').normalize('NFC');
  }

  if (options.collapseSpaces) {
    // Collapse multiple consecutive spaces/tabs into a single space
    result = result.replace(/[ \t]{2,}/g, ' ');
  }

  if (options.trimWhitespace) {
    result = result.trim();
  }

  if (options.caseMode === 'upper') {
    result = result.toUpperCase();
  } else if (options.caseMode === 'lower') {
    result = result.toLowerCase();
  } else if (options.caseMode === 'title') {
    result = toTitleCase(result);
  }

  return result;
}

export interface CleanTextResult {
  state: DatasetState;
  modifiedCellsCount: number;
}

/**
 * Applies text cleaning operations across selected (or all) columns of a DatasetState.
 */
export function cleanDatasetText(
  state: DatasetState,
  options: TextCleaningOptions
): CleanTextResult {
  const targetColumnIds =
    options.columnIds && options.columnIds.length > 0
      ? options.columnIds.filter((id) => state.columns.some((c) => c.id === id))
      : state.columns.map((c) => c.id);

  if (targetColumnIds.length === 0 || state.rows.length === 0) {
    return { state, modifiedCellsCount: 0 };
  }

  let modifiedCellsCount = 0;

  const updatedRows: DataRow[] = state.rows.map((row) => {
    let rowChanged = false;
    const nextCells: Record<string, CellValue> = { ...row.cells };

    for (const colId of targetColumnIds) {
      const current = nextCells[colId];
      if (typeof current === 'string' && current.length > 0) {
        const cleaned = cleanStringText(current, options);
        if (cleaned !== current) {
          nextCells[colId] = cleaned;
          rowChanged = true;
          modifiedCellsCount++;
        }
      }
    }

    return rowChanged ? { id: row.id, cells: nextCells } : row;
  });

  if (modifiedCellsCount === 0) {
    return { state, modifiedCellsCount: 0 };
  }

  return {
    state: {
      columns: state.columns,
      rows: updatedRows,
    },
    modifiedCellsCount,
  };
}
