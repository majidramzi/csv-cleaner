export type CellValue = string | number | boolean | null;

export interface ColumnMeta {
  id: string;
  name: string;
  isCalculated?: boolean;
  formula?: string;
}

export interface DataRow {
  id: string;
  cells: Record<string, CellValue>;
}

export interface DatasetState {
  columns: ColumnMeta[];
  rows: DataRow[];
}

export type FileFormat = 'csv' | 'xlsx' | 'xls' | 'sample';

export type DelimiterOption = 'auto' | ',' | ';' | '\t' | '|';

export interface LoadedFileMeta {
  fileName: string;
  fileFormat: FileFormat;
  fileSize: number;
  importedAt: number;
  // CSV-specific options
  rawCsvText?: string;
  detectedDelimiter?: string;
  selectedDelimiter?: DelimiterOption;
  // Excel-specific options
  rawExcelBuffer?: ArrayBuffer;
  sheetNames?: string[];
  selectedSheet?: string;
}

export type OperationCategory =
  | 'import'
  | 'duplicates'
  | 'empty'
  | 'text'
  | 'columns'
  | 'filter';

export interface CleaningOperationLog {
  id: string;
  category: OperationCategory;
  title: string;
  summary: string;
  affectedCount: number;
  timestamp: number;
}

export interface HistorySnapshot {
  state: DatasetState;
  operation: CleaningOperationLog;
}

export type DuplicateKeepStrategy = 'first' | 'last';

export interface DuplicateRemovalOptions {
  columnIds: string[]; // empty array means all columns
  caseSensitive: boolean;
  trimBeforeCompare: boolean;
  keep: DuplicateKeepStrategy;
}

export interface DuplicateRemovalResult {
  state: DatasetState;
  removedCount: number;
  removedRowIds: string[];
}

export type EmptyRowRemovalMode = 'any' | 'all';

export interface RemoveEmptyRowsOptions {
  mode: EmptyRowRemovalMode;
  columnIds?: string[]; // optional subset of columns to inspect
  treatWhitespaceAsEmpty?: boolean;
}

export interface FillEmptyCellsOptions {
  fillValue: CellValue;
  columnIds?: string[]; // empty or undefined = all columns
  treatWhitespaceAsEmpty?: boolean;
}

export type TextCaseMode = 'none' | 'upper' | 'lower' | 'title';

export interface TextCleaningOptions {
  columnIds?: string[]; // empty or undefined = all columns
  trimWhitespace?: boolean;
  collapseSpaces?: boolean;
  caseMode?: TextCaseMode;
  normalizeUnicode?: boolean; // NFC + smart quotes + NBSP cleanup + control char removal
  stripAccents?: boolean; // NFD diacritic stripping
}

export interface CalculatedColumnOptions {
  name: string;
  expression: string;
}

export type TextFilterOperator =
  | 'contains'
  | 'not_contains'
  | 'equals'
  | 'starts_with'
  | 'ends_with'
  | 'is_empty'
  | 'is_not_empty';

export interface TextColumnFilter {
  id: string;
  columnId: string;
  operator: TextFilterOperator;
  value: string;
  caseSensitive: boolean;
}

export interface NumericRangeFilter {
  id: string;
  columnId: string;
  min?: number;
  max?: number;
}

export interface ActiveFilters {
  globalSearch: string;
  textFilters: TextColumnFilter[];
  numericFilters: NumericRangeFilter[];
}

export type PreviewMode = 'cleaned' | 'original' | 'diff';

export interface DatasetMetrics {
  rowCount: number;
  columnCount: number;
  totalCells: number;
  emptyCells: number;
  emptyRowsAll: number;
  emptyRowsAny: number;
  emptyColumnIds: string[];
  duplicateRowsCount: number;
  modifiedCellsCount: number;
  completenessPercent: number;
  emptyByColumn: Record<string, number>;
  inferredTypeByColumn: Record<string, 'number' | 'boolean' | 'text' | 'empty' | 'mixed'>;
}

export interface ExportOptions {
  format: 'csv' | 'xlsx';
  fileName: string;
  delimiter?: ',' | ';' | '\t' | '|';
  includeBom?: boolean;
  sheetName?: string;
  onlyFilteredRows?: boolean;
}

export interface ExportSummary {
  fileName: string;
  format: 'csv' | 'xlsx';
  finalRowCount: number;
  finalColumnCount: number;
  originalRowCount: number;
  originalColumnCount: number;
  rowsRemovedDelta: number;
  modifiedCellsCount: number;
  estimatedBytes: number;
}
