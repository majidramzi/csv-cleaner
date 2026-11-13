import Papa from 'papaparse';
import type { DatasetState, DelimiterOption } from '../../types/dataset';
import { matrixToDataset } from './headerUtils';

export interface CsvParseResult {
  state: DatasetState;
  detectedDelimiter: string;
  warnings: string[];
}

const COMMON_DELIMITERS = [',', ';', '\t', '|'] as const;

/**
 * Strips UTF-8 BOM if present at the start of text.
 */
export function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/**
 * Counts unquoted occurrences of candidate delimiters across sample lines
 * to reliably detect ',', ';', '\t', or '|' even with quoted commas.
 */
export function detectCsvDelimiter(rawText: string): string {
  const clean = stripBom(rawText);
  const sample = clean.slice(0, 16384);

  let bestDelimiter = ',';
  let bestScore = -1;

  for (const candidate of COMMON_DELIMITERS) {
    const preview = Papa.parse<string[]>(sample, {
      delimiter: candidate,
      preview: 15,
      skipEmptyLines: true,
    });

    const rows = preview.data;
    if (rows.length === 0) continue;

    const firstLen = rows[0]?.length ?? 0;
    if (firstLen <= 1) continue;

    // Measure consistency of column counts across rows
    let consistentRows = 0;
    for (const row of rows) {
      if (row.length === firstLen) {
        consistentRows++;
      }
    }

    const consistencyRatio = consistentRows / rows.length;
    const score = consistencyRatio * 100 + Math.min(firstLen, 50);

    if (score > bestScore) {
      bestScore = score;
      bestDelimiter = candidate;
    }
  }

  return bestDelimiter;
}

/**
 * Parses CSV text into a normalized DatasetState using PapaParse.
 */
export function parseCsvContent(
  rawText: string,
  delimiterOption: DelimiterOption = 'auto'
): CsvParseResult {
  const cleanedText = stripBom(rawText);
  if (cleanedText.trim() === '') {
    return {
      state: { columns: [], rows: [] },
      detectedDelimiter: delimiterOption === 'auto' ? ',' : delimiterOption,
      warnings: [],
    };
  }

  const effectiveDelimiter =
    delimiterOption === 'auto' ? detectCsvDelimiter(cleanedText) : delimiterOption;

  const parsed = Papa.parse<string[]>(cleanedText, {
    delimiter: effectiveDelimiter,
    quoteChar: '"',
    escapeChar: '"',
    header: false,
    skipEmptyLines: false,
  });

  // Remove a single trailing empty row caused by a final newline at EOF (`\n` at end of file)
  const rawRows = [...parsed.data];
  if (rawRows.length > 1) {
    const lastRow = rawRows[rawRows.length - 1];
    if (lastRow && lastRow.length === 1 && lastRow[0] === '') {
      rawRows.pop();
    }
  }

  const state = matrixToDataset(rawRows);
  const warnings = parsed.errors.map((err) =>
    err.row !== undefined ? `Row ${err.row + 1}: ${err.message}` : err.message
  );

  return {
    state,
    detectedDelimiter: effectiveDelimiter,
    warnings,
  };
}
