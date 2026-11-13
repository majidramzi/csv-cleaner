import type { DatasetState, DelimiterOption, FileFormat, LoadedFileMeta } from '../../types/dataset';
import { parseCsvContent } from './csvParser';
import { parseExcelBuffer } from './excelParser';

export interface ImportedFilePayload {
  meta: LoadedFileMeta;
  state: DatasetState;
  warnings: string[];
}

export function detectFileFormat(fileName: string): FileFormat | null {
  const lower = fileName.toLowerCase().trim();
  if (lower.endsWith('.csv') || lower.endsWith('.tsv') || lower.endsWith('.txt')) {
    return 'csv';
  }
  if (lower.endsWith('.xlsx')) {
    return 'xlsx';
  }
  if (lower.endsWith('.xls')) {
    return 'xls';
  }
  return null;
}

function readFileAsText(file: File): Promise<string> {
  if (typeof file.text === 'function') {
    return file.text();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error(`Failed to read text file "${file.name}".`));
    reader.readAsText(file, 'UTF-8');
  });
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === 'function') {
    return file.arrayBuffer();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error(`Failed to read binary workbook "${file.name}".`));
      }
    };
    reader.onerror = () => reject(new Error(`Failed to read binary workbook "${file.name}".`));
    reader.readAsArrayBuffer(file);
  });
}

export async function importBrowserFile(
  file: File,
  options?: { delimiter?: DelimiterOption; sheetName?: string }
): Promise<ImportedFilePayload> {
  const format = detectFileFormat(file.name);
  if (!format) {
    throw new Error(
      `Unsupported file type for "${file.name}". Please upload a .csv, .xlsx, or .xls file.`
    );
  }

  if (format === 'csv') {
    const rawCsvText = await readFileAsText(file);
    const delimiterPref: DelimiterOption = options?.delimiter ?? 'auto';
    const parsed = parseCsvContent(rawCsvText, delimiterPref);

    return {
      meta: {
        fileName: file.name,
        fileFormat: 'csv',
        fileSize: file.size,
        importedAt: Date.now(),
        rawCsvText,
        detectedDelimiter: parsed.detectedDelimiter,
        selectedDelimiter: delimiterPref,
      },
      state: parsed.state,
      warnings: parsed.warnings,
    };
  }

  const rawExcelBuffer = await readFileAsArrayBuffer(file);
  const parsedExcel = parseExcelBuffer(rawExcelBuffer, options?.sheetName);

  return {
    meta: {
      fileName: file.name,
      fileFormat: format,
      fileSize: file.size,
      importedAt: Date.now(),
      rawExcelBuffer,
      sheetNames: parsedExcel.sheetNames,
      selectedSheet: parsedExcel.selectedSheet,
    },
    state: parsedExcel.state,
    warnings: [],
  };
}
