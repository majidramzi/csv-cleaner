import { describe, expect, it } from 'vitest';
import type { DatasetState } from '../types/dataset';
import { countDuplicateRows, removeDuplicateRows } from '../lib/cleaners/duplicates';

const sampleDataset: DatasetState = {
  columns: [
    { id: 'col_0', name: 'ID' },
    { id: 'col_1', name: 'Email' },
    { id: 'col_2', name: 'Country' },
  ],
  rows: [
    { id: 'r1', cells: { col_0: '1', col_1: 'alice@example.com', col_2: 'USA' } },
    { id: 'r2', cells: { col_0: '1', col_1: 'alice@example.com', col_2: 'USA' } },
    { id: 'r3', cells: { col_0: '2', col_1: 'ALICE@EXAMPLE.COM', col_2: 'Canada' } },
    { id: 'r4', cells: { col_0: '3', col_1: '  bob@example.com ', col_2: 'UK' } },
    { id: 'r5', cells: { col_0: '4', col_1: 'bob@example.com', col_2: 'UK' } },
  ],
};

describe('Duplicate Removal', () => {
  it('removes exact duplicate rows across all columns and reports removedCount', () => {
    const res = removeDuplicateRows(sampleDataset, {
      columnIds: [],
      caseSensitive: true,
      trimBeforeCompare: false,
      keep: 'first',
    });

    expect(res.removedCount).toBe(1);
    expect(res.removedRowIds).toEqual(['r2']);
    expect(res.state.rows.map((r) => r.id)).toEqual(['r1', 'r3', 'r4', 'r5']);
  });

  it('supports deduplicating on a specific subset of columns (e.g. Email) case-insensitively and trimmed', () => {
    const res = removeDuplicateRows(sampleDataset, {
      columnIds: ['col_1'],
      caseSensitive: false,
      trimBeforeCompare: true,
      keep: 'first',
    });

    expect(res.removedCount).toBe(3);
    expect(res.state.rows.map((r) => r.id)).toEqual(['r1', 'r4']);
  });

  it('keeps the last occurrence when keep="last" is chosen', () => {
    const res = removeDuplicateRows(sampleDataset, {
      columnIds: ['col_1'],
      caseSensitive: false,
      trimBeforeCompare: true,
      keep: 'last',
    });

    expect(res.removedCount).toBe(3);
    expect(res.state.rows.map((r) => r.id)).toEqual(['r3', 'r5']);
  });

  it('counts duplicate rows accurately without mutating source state', () => {
    const count = countDuplicateRows(sampleDataset);
    expect(count).toBe(1);
    expect(sampleDataset.rows).toHaveLength(5);
  });
});
