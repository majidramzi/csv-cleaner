import React, { useRef, useState } from 'react';
import {
  CheckCircle2,
  Columns3,
  FileSpreadsheet,
  Filter,
  ShieldCheck,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import { SAMPLE_DATASETS } from '../data/sampleDatasets';

interface FileDropzoneProps {
  onFileSelected: (file: File) => void;
  onLoadSample: (presetId: string) => void;
  isLoading: boolean;
  error: string | null;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  onFileSelected,
  onLoadSample,
  isLoading,
  error,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      onFileSelected(droppedFile);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      onFileSelected(selected);
    }
    e.target.value = '';
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Hero Header */}
      <div className="mb-8 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-medium text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>100% Client-Side • Free &amp; Open • No Registration Required</span>
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          Clean, Transform &amp; Inspect Spreadsheets Instantly
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400 sm:text-base">
          Drop any CSV or Excel workbook to deduplicate rows, handle missing values, standardize
          messy text, add calculated columns, inspect cell diffs, and export clean data — all
          inside your browser.
        </p>
      </div>

      {/* Upload Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={`group relative cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all sm:p-12 ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50/70 dark:border-indigo-400 dark:bg-indigo-950/40'
            : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-slate-50/70 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-500 dark:hover:bg-slate-800/50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.tsv,.txt"
          onChange={handleInputChange}
          className="hidden"
          aria-label="Upload CSV or Excel file"
        />

        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 transition group-hover:scale-105 group-hover:bg-indigo-100 dark:bg-indigo-950/80 dark:text-indigo-400">
          <UploadCloud className="h-7 w-7" />
        </div>

        <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
          {isLoading ? 'Parsing spreadsheet locally...' : 'Drag & drop your CSV or Excel file here'}
        </h3>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          or{' '}
          <span className="font-semibold text-indigo-600 underline decoration-indigo-300 underline-offset-2 dark:text-indigo-400">
            browse files from your computer
          </span>
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono font-medium dark:border-slate-700 dark:bg-slate-800">
            .CSV (UTF-8, Auto-Delimiter)
          </span>
          <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono font-medium dark:border-slate-700 dark:bg-slate-800">
            .XLSX (Multi-Sheet)
          </span>
          <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono font-medium dark:border-slate-700 dark:bg-slate-800">
            .XLS (Legacy Excel)
          </span>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-300"
        >
          {error}
        </div>
      )}

      {/* Sample Datasets Section */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No file handy? Try a realistic messy sample dataset:
            </h3>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {SAMPLE_DATASETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onLoadSample(preset.id)}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 text-left shadow-xs transition hover:border-indigo-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
                    <FileSpreadsheet className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    {preset.label}
                  </span>
                  <span className="rounded bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    Load Sample
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {preset.description}
                </p>
              </div>
              <div className="mt-3 font-mono text-[11px] text-slate-400 dark:text-slate-500">
                {preset.fileName}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Capabilities & Privacy Footer */}
      <div className="mt-10 grid gap-4 border-t border-slate-200 pt-8 dark:border-slate-800 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200/70 bg-white/60 p-4 dark:border-slate-800/80 dark:bg-slate-900/50">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Smart Deduplication &amp; Empty Cleanup</span>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Deduplicate across custom key columns, strip empty rows/columns, or impute missing
            values with live impact counts.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/70 bg-white/60 p-4 dark:border-slate-800/80 dark:bg-slate-900/50">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <Columns3 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>Column Operations &amp; Formulas</span>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Rename, reorder, delete, or compute calculated columns using expressions like{' '}
            <code className="font-mono text-[11px]">[Unit Price] * [Quantity]</code>.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/70 bg-white/60 p-4 dark:border-slate-800/80 dark:bg-slate-900/50">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <Filter className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span>Cell Diffs, Undo/Redo &amp; Export</span>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Compare original vs. cleaned cells side-by-side, step backward/forward anytime, and
            export pristine CSV or XLSX files.
          </p>
        </div>
      </div>

      {/* Explicit Privacy Banner */}
      <div className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-4 py-3 text-xs text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <p className="leading-relaxed">
          <strong>Privacy Notice:</strong> All uploaded files remain strictly inside your browser
          memory. No file contents, headers, or metrics are ever uploaded to any server or stored
          permanently unless you explicitly export a file to your device.
        </p>
      </div>
    </div>
  );
};
