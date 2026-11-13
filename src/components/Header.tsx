import React from 'react';
import {
  Download,
  FileSpreadsheet,
  Moon,
  Redo2,
  RotateCcw,
  ShieldCheck,
  Sun,
  Undo2,
  Upload,
} from 'lucide-react';
import type { ThemeMode } from '../hooks/useTheme';

interface HeaderProps {
  hasDataset: boolean;
  canUndo: boolean;
  canRedo: boolean;
  historyCount: number;
  theme: ThemeMode;
  onUndo: () => void;
  onRedo: () => void;
  onResetOriginal: () => void;
  onOpenExport: () => void;
  onOpenPrivacy: () => void;
  onNewUploadClick: () => void;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  hasDataset,
  canUndo,
  canRedo,
  historyCount,
  theme,
  onUndo,
  onRedo,
  onResetOriginal,
  onOpenExport,
  onOpenPrivacy,
  onNewUploadClick,
  onToggleTheme,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        {/* Brand + Privacy Pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                  CSV Cleaner
                </h1>
                <span className="hidden rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 sm:inline-block">
                  v1.0
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                CSV &amp; Excel Data Cleaning Workbench
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenPrivacy}
            title="View Local Privacy Guarantee"
            className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/90 px-2.5 py-1 text-xs font-medium text-emerald-800 transition hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/50 md:inline-flex"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>100% Local Browser Processing</span>
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {hasDataset && (
            <>
              <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800/80">
                <button
                  type="button"
                  onClick={onUndo}
                  disabled={!canUndo}
                  title="Undo last operation (Ctrl+Z)"
                  className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-white hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <Undo2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Undo</span>
                </button>
                <button
                  type="button"
                  onClick={onRedo}
                  disabled={!canRedo}
                  title="Redo operation (Ctrl+Y)"
                  className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-white hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <Redo2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Redo</span>
                </button>
                {historyCount > 1 && (
                  <button
                    type="button"
                    onClick={onResetOriginal}
                    disabled={!canUndo}
                    title="Reset dataset back to original imported state"
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-white hover:text-rose-600 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-rose-400"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span className="hidden lg:inline">Reset</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={onNewUploadClick}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <Upload className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Load File</span>
              </button>

              <button
                type="button"
                onClick={onOpenExport}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onOpenPrivacy}
            aria-label="Privacy Information"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-emerald-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-emerald-400 dark:hover:bg-slate-700 md:hidden"
          >
            <ShieldCheck className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
