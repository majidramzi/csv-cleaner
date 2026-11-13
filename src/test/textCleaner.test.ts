import { describe, expect, it } from 'vitest';
import type { DatasetState } from '../types/dataset';
import { cleanDatasetText, cleanStringText } from '../lib/cleaners/textCleaner';

describe('Text Normalization and Cleaning', () => {
  it('trims leading/trailing whitespace and collapses duplicate internal spaces', () => {
    const out = cleanStringText('   hello    world   from   csv  ', {
      trimWhitespace: true,
      collapseSpaces: true,
    });
    expect(out).toBe('hello world from csv');
  });

  it('converts text to uppercase, lowercase, and title case', () => {
    expect(cleanStringText('alice johnson', { caseMode: 'upper' })).toBe('ALICE JOHNSON');
    expect(cleanStringText('ALICE JOHNSON', { caseMode: 'lower' })).toBe('alice johnson');
    expect(cleanStringText('mARIA-elena o\'connor', { caseMode: 'title' })).toBe(
      "Maria-Elena O'Connor"
    );
  });

  it('normalizes Unicode, smart quotes, non-breaking spaces, and strips accents when enabled', () => {
    const messy = '“Émilie\u00A0\u200BDupré” — Crème';
    const normalized = cleanStringText(messy, {
      normalizeUnicode: true,
      stripAccents: true,
      collapseSpaces: true,
      trimWhitespace: true,
    });
    expect(normalized).toBe('"Emilie Dupre" - Creme');
  });

  it('cleans text across dataset rows and leaves numeric/boolean cells intact', () => {
    const state: DatasetState = {
      columns: [
        { id: 'c1', name: 'Customer' },
        { id: 'c2', name: 'Amount' },
      ],
      rows: [
        { id: 'r1', cells: { c1: '  john   doe ', c2: 42.5 } },
        { id: 'r2', cells: { c1: 'JANE   SMITH', c2: 100 } },
      ],
    };

    const res = cleanDatasetText(state, {
      trimWhitespace: true,
      collapseSpaces: true,
      caseMode: 'title',
    });

    expect(res.modifiedCellsCount).toBe(2);
    expect(res.state.rows[0]?.cells.c1).toBe('John Doe');
    expect(res.state.rows[1]?.cells.c1).toBe('Jane Smith');
    expect(res.state.rows[0]?.cells.c2).toBe(42.5);
  });
});
