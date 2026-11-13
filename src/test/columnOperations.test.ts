import { describe, expect, it } from 'vitest';
import type { DatasetState } from '../types/dataset';
import {
  addCalculatedColumn,
  deleteColumns,
  moveColumnStep,
  previewCalculatedColumn,
  renameColumn,
  reorderColumns,
} from '../lib/cleaners/columnOperations';

const baseState: DatasetState = {
  columns: [
    { id: 'c1', name: 'First Name' },
    { id: 'c2', name: 'Last Name' },
    { id: 'c3', name: 'Price' },
    { id: 'c4', name: 'Qty' },
  ],
  rows: [
    { id: 'r1', cells: { c1: 'Alice', c2: 'Johnson', c3: 19.5, c4: 3 } },
    { id: 'r2', cells: { c1: 'Bob', c2: 'Smith', c3: 10, c4: 5 } },
  ],
};

describe('Column Management Operations', () => {
  it('renames a column and rejects duplicate or blank names', () => {
    const renamed = renameColumn(baseState, 'c3', 'Unit Price');
    expect(renamed.columns[2]?.name).toBe('Unit Price');

    expect(() => renameColumn(baseState, 'c3', '   ')).toThrow();
    expect(() => renameColumn(baseState, 'c3', 'qty')).toThrow();
  });

  it('deletes columns cleanly from column definitions and row cell maps', () => {
    const afterDelete = deleteColumns(baseState, ['c2', 'c4']);
    expect(afterDelete.columns.map((c) => c.id)).toEqual(['c1', 'c3']);
    expect(afterDelete.rows[0]?.cells).toEqual({ c1: 'Alice', c3: 19.5 });
  });

  it('reorders columns explicitly and via step movements', () => {
    const reordered = reorderColumns(baseState, ['c4', 'c3', 'c1', 'c2']);
    expect(reordered.columns.map((c) => c.name)).toEqual([
      'Qty',
      'Price',
      'First Name',
      'Last Name',
    ]);

    const stepped = moveColumnStep(baseState, 'c2', 'left');
    expect(stepped.columns.map((c) => c.id)).toEqual(['c2', 'c1', 'c3', 'c4']);
  });

  it('evaluates arithmetic, string concatenation, and conditional calculated columns', () => {
    const withTotal = addCalculatedColumn(baseState, {
      name: 'Line Total',
      expression: 'ROUND([Price] * [Qty], 2)',
    });

    expect(withTotal.columns).toHaveLength(5);
    const totalColId = withTotal.columns[4]!.id;
    expect(withTotal.rows[0]?.cells[totalColId]).toBe(58.5);
    expect(withTotal.rows[1]?.cells[totalColId]).toBe(50);

    const withFullName = addCalculatedColumn(withTotal, {
      name: 'Full Name',
      expression: '[First Name] & " " & UPPER([Last Name])',
    });
    const fullNameId = withFullName.columns[5]!.id;
    expect(withFullName.rows[0]?.cells[fullNameId]).toBe('Alice JOHNSON');

    const withTier = addCalculatedColumn(withFullName, {
      name: 'Order Tier',
      expression: 'IF([Line Total] >= 55, "Priority", "Standard")',
    });
    const tierId = withTier.columns[6]!.id;
    expect(withTier.rows[0]?.cells[tierId]).toBe('Priority');
    expect(withTier.rows[1]?.cells[tierId]).toBe('Standard');
  });

  it('provides live preview values and clear validation errors for formulas', () => {
    const validPreview = previewCalculatedColumn(baseState, '[Price] + 5', 2);
    expect(validPreview.error).toBeNull();
    expect(validPreview.values).toEqual([24.5, 15]);

    const invalidPreview = previewCalculatedColumn(baseState, '[MissingColumn] * 2', 2);
    expect(invalidPreview.error).toContain('MissingColumn');
  });
});
