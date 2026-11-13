import React from 'react';
import { FileSpreadsheet, Layers, Settings2, Sparkles } from 'lucide-react';
import type { DelimiterOption, LoadedFileMeta } from '../types/dataset';
import { SAMPLE_DATASETS } from '../data/sampleDatasets';

interface FileSourceBarProps {
  fileMeta: LoadedFileMeta;
  onChangeDelimiter: (delimiter: DelimiterOption) => void;
  onChangeWorksheet: (sheetName: string) => void;
  onSwitchSample: (presetId: string) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function describeDelimiter(delim?: string): string {
  if (!delim) return 'Comma (,)';
  if (delim === ',') return 'Comma (,)';
  if (delim === ';') return 'Semicolon (;)';
  if (delim === '\t') return 'Tab (\\t)';
  if (delim === '|') return 'Pipe (|)';
  return delim;
}

export const FileSourceBar: React.FC<FileSourceBarProps> = ({
  fileMeta,
  onChangeDelimiter,
  onChangeWorksheet,
  onSwitchSample,
}) => {
  const isCsvLike = fileMeta.fileFormat === 'csv' || fileMeta.fileFormat === 'sample';
  const isExcel = fileMeta.fileFormat === 'xlsx' || fileMeta.fileFormat === 'xls';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      {/* File Identity */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <span className="text-sm font-semibold text-slate-900 dark:text-white">
            {fileMeta.fileName}
          </span>
        </div>

        <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {fileMeta.fileFormat}
        </span>

        <span className="text-xs text-slate-500 tabular-nums dark:text-slate-400">
          {formatBytes(fileMeta.fileSize)}
        </span>
      </div>

      {/* Format-Specific Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {isCsvLike && fileMeta.rawCsvText !== undefined && (
          <div className="flex items-center gap-2 text-xs">
            <Settings2 className="h-3.5 w-3.5 text-slate-400" />
            <label
              htmlFor="csv-delimiter-select"
              className="font-medium text-slate-600 dark:text-slate-300"
            >
              Delimiter:
            </label>
            <select
              id="csv-delimiter-select"
              value={fileMeta.selectedDelimiter ?? 'auto'}
              onChange={(e) => onChangeDelimiter(e.target.value as DelimiterOption)}
              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="auto">
                Auto-Detect ({describeDelimiter(fileMeta.detectedDelimiter)})
              </option>
              <option value=",">Comma (,)</option>
              <option value=";">Semicolon (;)</option>
              <option value={'\t'}>Tab (\t)</option>
              <option value="|">Pipe (|)</option>
            </select>
          </div>
        )}

        {isExcel && fileMeta.sheetNames && fileMeta.sheetNames.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Layers className="h-3.5 w-3.5 text-indigo-500" />
            <span className="font-medium text-slate-600 dark:text-slate-300">
              Worksheet ({fileMeta.sheetNames.length}):
            </span>
            <div className="flex flex-wrap items-center gap-1">
              {fileMeta.sheetNames.map((sheet) => {
                const active = sheet === fileMeta.selectedSheet;
                return (
                  <button
                    key={sheet}
                    type="button"
                    onClick={() => onChangeWorksheet(sheet)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                      active
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    {sheet}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {fileMeta.fileFormat === 'sample' && (
          <div className="flex items-center gap-1.5 text-xs">
            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
            <span className="text-slate-500 dark:text-slate-400">Sample:</span>
            {SAMPLE_DATASETS.map((preset) => {
              const isCurrent = preset.fileName === fileMeta.fileName;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onSwitchSample(preset.id)}
                  disabled={isCurrent}
                  className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition ${
                    isCurrent
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
                >
                  {preset.id === 'crm-orders' ? 'Orders' : 'Employees'}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
