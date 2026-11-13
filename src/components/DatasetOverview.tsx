import React, { useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Columns3,
  Copy,
  Rows3,
  Sparkles,
} from 'lucide-react';
import type { ColumnMeta, DatasetMetrics } from '../types/dataset';

interface DatasetOverviewProps {
  metrics: DatasetMetrics;
  columns: ColumnMeta[];
  originalRowCount: number;
  originalColCount: number;
  filteredRowCount: number;
  isFiltered: boolean;
  highlightModified: boolean;
  onToggleHighlightModified: () => void;
}

export const DatasetOverview: React.FC<DatasetOverviewProps> = ({
  metrics,
  columns,
  originalRowCount,
  originalColCount,
  filteredRowCount,
  isFiltered,
  highlightModified,
  onToggleHighlightModified,
}) => {
  const [showProfiler, setShowProfiler] = useState(false);

  const rowDelta = metrics.rowCount - originalRowCount;
  const colDelta = metrics.columnCount - originalColCount;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {/* Rows */}
        <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Rows</span>
            <Rows3 className="h-3.5 w-3.5 text-indigo-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">
              {isFiltered
                ? `${filteredRowCount.toLocaleString()} / ${metrics.rowCount.toLocaleString()}`
                : metrics.rowCount.toLocaleString()}
            </span>
            {rowDelta !== 0 && (
              <span
                className={`rounded px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
                  rowDelta < 0
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300'
                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
                }`}
              >
                {rowDelta > 0 ? `+${rowDelta}` : rowDelta}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
            Original: {originalRowCount.toLocaleString()} rows
          </p>
        </div>

        {/* Columns */}
        <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Columns</span>
            <Columns3 className="h-3.5 w-3.5 text-indigo-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">
              {metrics.columnCount}
            </span>
            {colDelta !== 0 && (
              <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300">
                {colDelta > 0 ? `+${colDelta}` : colDelta}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
            {metrics.emptyColumnIds.length > 0
              ? `${metrics.emptyColumnIds.length} completely empty`
              : `Original: ${originalColCount} cols`}
          </p>
        </div>

        {/* Empty Cells & Completeness */}
        <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Empty Cells</span>
            <AlertCircle
              className={`h-3.5 w-3.5 ${
                metrics.emptyCells > 0 ? 'text-amber-500' : 'text-emerald-500'
              }`}
            />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">
              {metrics.emptyCells.toLocaleString()}
            </span>
            <span className="text-xs font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
              {metrics.completenessPercent}% full
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${Math.min(100, Math.max(0, metrics.completenessPercent))}%` }}
            />
          </div>
        </div>

        {/* Duplicate Rows */}
        <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Exact Duplicates</span>
            <Copy
              className={`h-3.5 w-3.5 ${
                metrics.duplicateRowsCount > 0 ? 'text-rose-500' : 'text-emerald-500'
              }`}
            />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">
              {metrics.duplicateRowsCount.toLocaleString()}
            </span>
            <span
              className={`text-[11px] font-medium ${
                metrics.duplicateRowsCount > 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {metrics.duplicateRowsCount > 0 ? 'Needs review' : 'Clean'}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
            Across all columns
          </p>
        </div>

        {/* Modified Cells + Column Profiler Toggle */}
        <div className="col-span-2 flex flex-col justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:col-span-1">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Modified Cells</span>
            <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">
              {metrics.modifiedCellsCount.toLocaleString()}
            </span>
            <button
              type="button"
              onClick={onToggleHighlightModified}
              className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition ${
                highlightModified
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {highlightModified ? 'Highlighted' : 'Highlight Off'}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowProfiler((s) => !s)}
            className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            <BarChart3 className="h-3 w-3" />
            <span>Column Profile</span>
            {showProfiler ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {/* Expandable Column Quality & Type Profiler */}
      {showProfiler && (
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Column Health &amp; Inferred Data Types
            </h3>
            <button
              type="button"
              onClick={() => setShowProfiler(false)}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Hide
            </button>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {columns.map((col) => {
              const emptyCount = metrics.emptyByColumn[col.id] ?? 0;
              const colType = metrics.inferredTypeByColumn[col.id] ?? 'text';
              const filledPct =
                metrics.rowCount === 0
                  ? 100
                  : Math.round(((metrics.rowCount - emptyCount) / metrics.rowCount) * 100);

              return (
                <div
                  key={col.id}
                  className="rounded-lg border border-slate-100 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-800/40"
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span
                      className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200"
                      title={col.name}
                    >
                      {col.name}
                    </span>
                    <span className="shrink-0 rounded bg-slate-200/80 px-1.5 py-0.5 font-mono text-[10px] uppercase text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                      {colType}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>{emptyCount} empty</span>
                    <span className="tabular-nums">{filledPct}% filled</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
