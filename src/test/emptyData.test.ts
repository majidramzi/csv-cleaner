import { describe, expect, it } from 'vitest';
import type { DatasetState } from '../types/dataset';
import {
  fillEmptyCells,
  isCellEmpty,
  removeEmptyColumns,
  removeEmptyRows,
} from '../lib/cleaners/emptyData';

const datasetWithEmpties: DatasetState = {
  columns: [
    { id: 'c1', name: 'Name' },
    { id: 'c2', name: 'Department' },
    { id: 'c3', name: 'EmptyNotes' },
  ],
  rows: [
    { id: 'r1', cells: { c1: 'Alice', c2: 'Engineering', c3: '' } },
    { id: 'r2', cells: { c1: 'Bob', c2: null, c3: null } },
    { id: 'r3', cells: { c1: '', c2: '   ', c3: '' } },
  ],
};

describe('Empty Cell Handling', () => {
  it('identifies empty and whitespace-only cells accurately', () => {
    expect(isCellEmpty(null)).toBe(true);
    expect(isCellEmpty('')).toBe(true);
    expect(isCellEmpty('   ', false)).toBe(false);
    expect(isCellEmpty('   ', true)).toBe(true);
    expect(isCellEmpty(0)).toBe(false);
    expect(isCellEmpty(false)).toBe(false);
  });

  it('removes rows where ALL columns are empty (including whitespace when configured)', () => {
    const res = removeEmptyRows(datasetWithEmpties, {
      mode: 'all',
      treatWhitespaceAsEmpty: true,
    });
    expect(res.removedCount).toBe(1);
    expect(res.state.rows.map((r) => r.id)).toEqual(['r1', 'r2']);
  });

  it('removes rows where ANY targeted column is empty', () => {
    const res = removeEmptyRows(datasetWithEmpties, {
      mode: 'any',
      columnIds: ['c1', 'c2'],
      treatWhitespaceAsEmpty: true,
    });
    expect(res.removedCount).toBe(2);
    expect(res.state.rows.map((r) => r.id)).toEqual(['r1']);
  });

  it('removes columns that contain only empty values', () => {
    const res = removeEmptyColumns(datasetWithEmpties, true);
    expect(res.removedColumnIds).toEqual(['c3']);
    expect(res.removedColumnNames).toEqual(['EmptyNotes']);
    expect(res.state.columns.map((c) => c.id)).toEqual(['c1', 'c2']);
    expect(res.state.rows[0]?.cells).not.toHaveProperty('c3');
  });

  it('replaces empty cells with a user-defined value across selected or all columns', () => {
    const res = fillEmptyCells(datasetWithEmpties, {
      fillValue: 'Unassigned',
      columnIds: ['c2'],
      treatWhitespaceAsEmpty: true,
    });

    expect(res.replacedCount).toBe(2);
    expect(res.state.rows[1]?.cells.c2).toBe('Unassigned');
    expect(res.state.rows[2]?.cells.c2).toBe('Unassigned');
    // Untargeted empty column remains untouched
    expect(res.state.rows[0]?.cells.c3).toBe('');
  });
});
