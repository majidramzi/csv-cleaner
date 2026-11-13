import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { detectCsvDelimiter, parseCsvContent } from '../lib/parsers/csvParser';
import { parseExcelBuffer } from '../lib/parsers/excelParser';

describe('CSV and Excel File Parsing', () => {
  it('auto-detects semicolon, tab, pipe, and comma delimiters accurately', () => {
    expect(detectCsvDelimiter('a;b;c\n1;2;3\n4;5;6')).toBe(';');
    expect(detectCsvDelimiter('a\tb\tc\n1\t2\t3')).toBe('\t');
    expect(detectCsvDelimiter('a|b|c\n1|2|3')).toBe('|');
    expect(detectCsvDelimiter('a,b,c\n"1,000",2,3')).toBe(',');
  });

  it('parses UTF-8 CSV with BOM, quoted values, embedded commas, and leading-zero IDs', () => {
    const csv = `\uFEFFZIP Code,Full Name,Bio,Score\n00501,"Doe, Jane","Says ""Hello, World!""",98.5\n90210,"Élodie Moreau","Line 1",100\n`;
    const res = parseCsvContent(csv, 'auto');

    expect(res.detectedDelimiter).toBe(',');
    expect(res.state.columns.map((c) => c.name)).toEqual([
      'ZIP Code',
      'Full Name',
      'Bio',
      'Score',
    ]);
    expect(res.state.rows).toHaveLength(2);
    // Preserves leading zero ZIP string instead of coercing to 501
    expect(res.state.rows[0]?.cells.col_0).toBe('00501');
    // Handles embedded comma and escaped quotes
    expect(res.state.rows[0]?.cells.col_1).toBe('Doe, Jane');
    expect(res.state.rows[0]?.cells.col_2).toBe('Says "Hello, World!"');
    expect(res.state.rows[0]?.cells.col_3).toBe(98.5);
    // Preserves UTF-8 characters
    expect(res.state.rows[1]?.cells.col_1).toBe('Élodie Moreau');
  });

  it('respects manual delimiter selection', () => {
    const pipeData = 'ID|City, State|Population\n1|Austin, TX|974447';
    const res = parseCsvContent(pipeData, '|');

    expect(res.detectedDelimiter).toBe('|');
    expect(res.state.columns).toHaveLength(3);
    expect(res.state.rows[0]?.cells.col_1).toBe('Austin, TX');
    expect(res.state.rows[0]?.cells.col_2).toBe(974447);
  });

  it('parses multi-worksheet Excel buffers, lists sheets, and handles empty cells & mixed types', () => {
    const wb = XLSX.utils.book_new();
    const sheet1 = XLSX.utils.aoa_to_sheet([
      ['Product', 'InStock', 'Price'],
      ['Laptop', true, 1299.99],
      ['Cable', false, ''],
    ]);
    const sheet2 = XLSX.utils.aoa_to_sheet([
      ['Region', 'Revenue'],
      ['Nordics', 45000],
    ]);

    XLSX.utils.book_append_sheet(wb, sheet1, 'Inventory');
    XLSX.utils.book_append_sheet(wb, sheet2, 'RegionalSummary');

    const arrayOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;

    const firstSheetParsed = parseExcelBuffer(arrayOut);
    expect(firstSheetParsed.sheetNames).toEqual(['Inventory', 'RegionalSummary']);
    expect(firstSheetParsed.selectedSheet).toBe('Inventory');
    expect(firstSheetParsed.state.rows).toHaveLength(2);
    expect(firstSheetParsed.state.rows[0]?.cells.col_1).toBe(true);
    expect(firstSheetParsed.state.rows[1]?.cells.col_2).toBe('');

    const secondSheetParsed = parseExcelBuffer(arrayOut, 'RegionalSummary');
    expect(secondSheetParsed.selectedSheet).toBe('RegionalSummary');
    expect(secondSheetParsed.state.columns.map((c) => c.name)).toEqual(['Region', 'Revenue']);
    expect(secondSheetParsed.state.rows[0]?.cells.col_1).toBe(45000);
  });
});
