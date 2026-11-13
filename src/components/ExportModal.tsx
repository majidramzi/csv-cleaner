import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Download, FileSpreadsheet, FileText, X } from 'lucide-react';
import type { DataRow, DatasetState, ExportOptions } from '../types/dataset';
import {
  buildExportSummary,
  triggerExportDownload,
} from '../lib/exporters/exportData';

interface ExportModalProps {
  isOpen: boolean;
  defaultBaseName: string;
  currentState: DatasetState;
  originalState: DatasetState;
  filteredSortedRows: DataRow[];
  isFiltered: boolean;
  modifiedCellsCount: number;
  onClose: () => void;
  onExportSuccess: (downloadedFileName: string) => void;
}

function formatByteSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  defaultBaseName,
  currentState,
  originalState,
  filteredSortedRows,
  isFiltered,
  modifiedCellsCount,
  onClose,
  onExportSuccess,
}) => {
  const [format, setFormat] = useState<'csv' | 'xlsx'>('csv');
  const [fileName, setFileName] = useState<string>('');
  const [delimiter, setDelimiter] = useState<',' | ';' | '\t' | '|'>(',');
  const [includeBom, setIncludeBom] = useState<boolean>(true);
  const [sheetName, setSheetName] = useState<string>('Cleaned Data');
  const [onlyFilteredRows, setOnlyFilteredRows] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      const cleanBase = defaultBaseName
        .replace(/\.(csv|xlsx|xls|tsv|txt)$/i, '')
        .trim();
      setFileName(`${cleanBase || 'dataset'}_cleaned`);
      setOnlyFilteredRows(false);
    }
  }, [isOpen, defaultBaseName]);

  const exportOptions: ExportOptions = useMemo(
    () => ({
      format,
      fileName,
      delimiter,
      includeBom,
      sheetName,
      onlyFilteredRows,
    }),
    [format, fileName, delimiter, includeBom, sheetName, onlyFilteredRows]
  );

  const summary = useMemo(() => {
    if (!isOpen) return null;
    return buildExportSummary(
      currentState,
      originalState,
      modifiedCellsCount,
      exportOptions,
      filteredSortedRows
    );
  }, [
    isOpen,
    currentState,
    originalState,
    modifiedCellsCount,
    exportOptions,
    filteredSortedRows,
  ]);

  if (!isOpen || !summary) return null;

  const handleDownload = (e: React.FormEvent) => {
    e.preventDefault();
    const savedAs = triggerExportDownload(
      currentState,
      exportOptions,
      onlyFilteredRows ? filteredSortedRows : currentState.rows
    );
    onExportSuccess(savedAs);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
    >
      <form
        onSubmit={handleDownload}
        className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h2
              id="export-modal-title"
              className="text-base font-bold text-slate-900 dark:text-white"
            >
              Export Cleaned Dataset
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Generated locally in your browser — column order, headers, and values preserved
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close export modal"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-5 text-xs">
          {/* Format Selection */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormat('csv')}
              className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition ${
                format === 'csv'
                  ? 'border-indigo-500 bg-indigo-50/70 ring-1 ring-indigo-500 dark:border-indigo-500 dark:bg-indigo-950/40'
                  : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50'
              }`}
            >
              <FileText className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">CSV (.csv)</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Universal UTF-8 text table
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setFormat('xlsx')}
              className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition ${
                format === 'xlsx'
                  ? 'border-indigo-500 bg-indigo-50/70 ring-1 ring-indigo-500 dark:border-indigo-500 dark:bg-indigo-950/40'
                  : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50'
              }`}
            >
              <FileSpreadsheet className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  Excel (.xlsx)
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Native workbook with typed cells
                </div>
              </div>
            </button>
          </div>

          {/* File Name */}
          <div className="space-y-1.5">
            <label
              htmlFor="export-filename-input"
              className="block font-semibold text-slate-700 dark:text-slate-300"
            >
              Output File Name
            </label>
            <div className="flex items-center">
              <input
                id="export-filename-input"
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="w-full rounded-l-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <span className="rounded-r-lg border border-l-0 border-slate-200 bg-slate-100 px-3 py-2 font-mono text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300">
                .{format}
              </span>
            </div>
          </div>

          {/* Format-Specific Settings */}
          {format === 'csv' ? (
            <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/30 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="block font-medium text-slate-600 dark:text-slate-300">
                  CSV Delimiter
                </label>
                <select
                  value={delimiter}
                  onChange={(e) => setDelimiter(e.target.value as ',' | ';' | '\t' | '|')}
                  className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value=",">Comma (,)</option>
                  <option value=";">Semicolon (;)</option>
                  <option value={'\t'}>Tab (\t)</option>
                  <option value="|">Pipe (|)</option>
                </select>
              </div>
              <div className="flex items-end pb-1">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={includeBom}
                    onChange={(e) => setIncludeBom(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600"
                  />
                  <span className="text-slate-700 dark:text-slate-300">
                    Include UTF-8 BOM (Excel-friendly)
                  </span>
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/30">
              <label className="block font-medium text-slate-600 dark:text-slate-300">
                Worksheet Name
              </label>
              <input
                type="text"
                maxLength={31}
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          )}

          {isFiltered && (
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 dark:border-indigo-900/50 dark:bg-indigo-950/30">
              <input
                type="checkbox"
                checked={onlyFilteredRows}
                onChange={(e) => setOnlyFilteredRows(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600"
              />
              <span className="text-slate-800 dark:text-slate-200">
                Export only currently filtered rows ({filteredSortedRows.length} of{' '}
                {currentState.rows.length} rows)
              </span>
            </label>
          )}

          {/* Export Summary Card */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Export Summary
              </span>
              <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                ~{formatByteSize(summary.estimatedBytes)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Final Rows</div>
                <div className="mt-0.5 text-base font-bold tabular-nums text-slate-900 dark:text-white">
                  {summary.finalRowCount.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Final Columns</div>
                <div className="mt-0.5 text-base font-bold tabular-nums text-slate-900 dark:text-white">
                  {summary.finalColumnCount}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Rows Removed</div>
                <div className="mt-0.5 text-base font-bold tabular-nums text-amber-600 dark:text-amber-400">
                  {Math.max(0, summary.rowsRemovedDelta).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Cells Cleaned</div>
                <div className="mt-0.5 text-base font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {summary.modifiedCellsCount.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="mt-3 border-t border-slate-200/80 pt-2.5 dark:border-slate-700/70">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Preserved Column Order ({currentState.columns.length}):
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {currentState.columns.map((c, idx) => (
                  <span
                    key={c.id}
                    className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                  >
                    {idx + 1}. {c.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-slate-200 px-6 py-3.5 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download {summary.fileName}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
