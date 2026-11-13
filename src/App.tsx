import { useCallback, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Info, ShieldCheck, X } from 'lucide-react';
import type {
  ActiveFilters,
  CellValue,
  DataRow,
  DelimiterOption,
  LoadedFileMeta,
  PreviewMode,
} from './types/dataset';
import { useTheme } from './hooks/useTheme';
import { useDatasetHistory } from './hooks/useDatasetHistory';
import { importBrowserFile } from './lib/parsers/fileImporter';
import { parseCsvContent } from './lib/parsers/csvParser';
import { parseExcelBuffer } from './lib/parsers/excelParser';
import { loadSampleDataset } from './data/sampleDatasets';
import { filterDatasetRows, hasAnyActiveFilters } from './lib/cleaners/filtering';
import { computeDatasetMetrics, createOriginalLookup } from './lib/cleaners/metrics';
import { updateCellValue } from './lib/cleaners/columnOperations';
import { Header } from './components/Header';
import { FileDropzone } from './components/FileDropzone';
import { FileSourceBar } from './components/FileSourceBar';
import { DatasetOverview } from './components/DatasetOverview';
import { CleaningPanel } from './components/CleaningPanel';
import { DataTablePreview } from './components/DataTablePreview';
import { ExportModal } from './components/ExportModal';
import { PrivacyModal } from './components/PrivacyModal';

interface ToastBanner {
  id: number;
  message: string;
  tone: 'success' | 'info' | 'warning';
}

const EMPTY_FILTERS: ActiveFilters = {
  globalSearch: '',
  textFilters: [],
  numericFilters: [],
};

export function App() {
  const { theme, toggleTheme } = useTheme();
  const {
    hasDataset,
    history,
    currentIndex,
    originalState,
    currentState,
    canUndo,
    canRedo,
    initializeDataset,
    pushOperation,
    undo,
    redo,
    jumpToStep,
    resetToOriginal,
  } = useDatasetHistory();

  const [fileMeta, setFileMeta] = useState<LoadedFileMeta | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState<boolean>(false);
  const [importError, setImportError] = useState<string | null>(null);

  const [filters, setFilters] = useState<ActiveFilters>(EMPTY_FILTERS);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('cleaned');
  const [highlightModified, setHighlightModified] = useState<boolean>(true);
  const [sortedFilteredRows, setSortedFilteredRows] = useState<DataRow[]>([]);

  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastBanner | null>(null);

  const hiddenFileInputRef = useRef<HTMLInputElement | null>(null);

  const notify = useCallback(
    (message: string, tone: 'success' | 'info' | 'warning' = 'info') => {
      const id = Date.now();
      setToast({ id, message, tone });
      window.setTimeout(() => {
        setToast((prev) => (prev?.id === id ? null : prev));
      }, 4000);
    },
    []
  );

  const handleFileSelected = useCallback(
    async (file: File) => {
      setIsLoadingFile(true);
      setImportError(null);
      try {
        const imported = await importBrowserFile(file);
        setFileMeta(imported.meta);
        setFilters(EMPTY_FILTERS);
        setPreviewMode('cleaned');
        initializeDataset(
          imported.state,
          `Loaded "${imported.meta.fileName}" (${imported.state.rows.length} rows × ${imported.state.columns.length} cols)`
        );
        notify(
          `Loaded "${imported.meta.fileName}" locally (${imported.state.rows.length.toLocaleString()} rows).`,
          'success'
        );
      } catch (err) {
        setImportError(err instanceof Error ? err.message : 'Failed to parse file.');
      } finally {
        setIsLoadingFile(false);
      }
    },
    [initializeDataset, notify]
  );

  const handleLoadSample = useCallback(
    (presetId: string) => {
      setImportError(null);
      const sample = loadSampleDataset(presetId);
      setFileMeta(sample.meta);
      setFilters(EMPTY_FILTERS);
      setPreviewMode('cleaned');
      initializeDataset(
        sample.state,
        `Loaded sample "${sample.meta.fileName}" (${sample.state.rows.length} rows × ${sample.state.columns.length} cols)`
      );
      notify(`Loaded sample dataset "${sample.meta.fileName}".`, 'success');
    },
    [initializeDataset, notify]
  );

  const handleChangeDelimiter = useCallback(
    (delimiter: DelimiterOption) => {
      if (!fileMeta || fileMeta.rawCsvText === undefined) return;
      const reparsed = parseCsvContent(fileMeta.rawCsvText, delimiter);
      setFileMeta({
        ...fileMeta,
        selectedDelimiter: delimiter,
        detectedDelimiter: reparsed.detectedDelimiter,
      });
      setFilters(EMPTY_FILTERS);
      setPreviewMode('cleaned');
      initializeDataset(
        reparsed.state,
        `Re-parsed "${fileMeta.fileName}" with delimiter "${reparsed.detectedDelimiter === '\t' ? '\\t' : reparsed.detectedDelimiter}"`
      );
      notify('Re-parsed CSV with selected delimiter.', 'info');
    },
    [fileMeta, initializeDataset, notify]
  );

  const handleChangeWorksheet = useCallback(
    (sheetName: string) => {
      if (!fileMeta || !fileMeta.rawExcelBuffer) return;
      const parsed = parseExcelBuffer(fileMeta.rawExcelBuffer, sheetName);
      setFileMeta({
        ...fileMeta,
        selectedSheet: parsed.selectedSheet,
        sheetNames: parsed.sheetNames,
      });
      setFilters(EMPTY_FILTERS);
      setPreviewMode('cleaned');
      initializeDataset(
        parsed.state,
        `Switched to worksheet "${parsed.selectedSheet}" (${parsed.state.rows.length} rows × ${parsed.state.columns.length} cols)`
      );
      notify(`Loaded worksheet "${parsed.selectedSheet}".`, 'info');
    },
    [fileMeta, initializeDataset, notify]
  );

  const originalLookup = useMemo(
    () => createOriginalLookup(originalState),
    [originalState]
  );

  const metrics = useMemo(
    () => computeDatasetMetrics(currentState, originalLookup),
    [currentState, originalLookup]
  );

  const filteredRows = useMemo(
    () => filterDatasetRows(currentState, filters),
    [currentState, filters]
  );

  const isFiltered = useMemo(() => hasAnyActiveFilters(filters), [filters]);

  const handleCommitFilteredRows = useCallback(() => {
    const removedCount = currentState.rows.length - filteredRows.length;
    if (removedCount <= 0) return;

    pushOperation(
      {
        columns: currentState.columns,
        rows: filteredRows,
      },
      {
        category: 'filter',
        title: 'Kept Filtered Rows',
        summary: `Kept ${filteredRows.length} matching rows and removed ${removedCount} unmatched rows`,
        affectedCount: removedCount,
      }
    );
    setFilters(EMPTY_FILTERS);
    notify(`Kept ${filteredRows.length} rows and removed ${removedCount} rows.`, 'success');
  }, [currentState.columns, currentState.rows.length, filteredRows, notify, pushOperation]);

  const handleInlineEditCell = useCallback(
    (rowId: string, columnId: string, newValue: CellValue) => {
      const colName = currentState.columns.find((c) => c.id === columnId)?.name ?? columnId;
      const next = updateCellValue(currentState, rowId, columnId, newValue);
      pushOperation(next, {
        category: 'text',
        title: 'Edited Cell Value',
        summary: `Updated cell in column "${colName}"`,
        affectedCount: 1,
      });
    },
    [currentState, pushOperation]
  );

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      {/* Hidden global file input for "Load File" button when dataset is active */}
      <input
        ref={hiddenFileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls,.tsv,.txt"
        className="hidden"
        onChange={(e) => {
          const selected = e.target.files?.[0];
          if (selected) handleFileSelected(selected);
          e.target.value = '';
        }}
      />

      <Header
        hasDataset={hasDataset}
        canUndo={canUndo}
        canRedo={canRedo}
        historyCount={history.length}
        theme={theme}
        onUndo={undo}
        onRedo={redo}
        onResetOriginal={() => {
          resetToOriginal();
          notify('Reset dataset back to original imported state.', 'info');
        }}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenPrivacy={() => setIsPrivacyOpen(true)}
        onNewUploadClick={() => hiddenFileInputRef.current?.click()}
        onToggleTheme={toggleTheme}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-40 flex max-w-sm items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-medium text-slate-800 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
          {toast.tone === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
          ) : (
            <Info className="h-4 w-4 shrink-0 text-indigo-500" />
          )}
          <span className="flex-1">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1">
        {!hasDataset || !fileMeta ? (
          <FileDropzone
            onFileSelected={handleFileSelected}
            onLoadSample={handleLoadSample}
            isLoading={isLoadingFile}
            error={importError}
          />
        ) : (
          <div className="mx-auto max-w-[1600px] space-y-3.5 px-4 py-4 sm:px-6">
            {importError && (
              <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-300">
                <span>{importError}</span>
                <button type="button" onClick={() => setImportError(null)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <FileSourceBar
              fileMeta={fileMeta}
              onChangeDelimiter={handleChangeDelimiter}
              onChangeWorksheet={handleChangeWorksheet}
              onSwitchSample={handleLoadSample}
            />

            <DatasetOverview
              metrics={metrics}
              columns={currentState.columns}
              originalRowCount={originalState.rows.length}
              originalColCount={originalState.columns.length}
              filteredRowCount={filteredRows.length}
              isFiltered={isFiltered}
              highlightModified={highlightModified}
              onToggleHighlightModified={() => setHighlightModified((h) => !h)}
            />

            {/* Workbench Split Grid: Cleaning Sidebar + Data Table */}
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[390px_minmax(0,1fr)]">
              <CleaningPanel
                state={currentState}
                metrics={metrics}
                filters={filters}
                filteredRowCount={filteredRows.length}
                history={history}
                currentHistoryIndex={currentIndex}
                onApplyOperation={pushOperation}
                onChangeFilters={setFilters}
                onCommitFilteredRows={handleCommitFilteredRows}
                onJumpToHistory={jumpToStep}
                onResetOriginal={() => {
                  resetToOriginal();
                  notify('Reset dataset back to original imported state.', 'info');
                }}
                onNotify={notify}
              />

              <DataTablePreview
                cleanedState={currentState}
                filteredRows={filteredRows}
                originalState={originalState}
                originalLookup={originalLookup}
                previewMode={previewMode}
                highlightModified={highlightModified}
                globalSearch={filters.globalSearch}
                onChangePreviewMode={setPreviewMode}
                onToggleHighlightModified={() => setHighlightModified((h) => !h)}
                onChangeGlobalSearch={(val) =>
                  setFilters((prev) => ({ ...prev, globalSearch: val }))
                }
                onEditCell={handleInlineEditCell}
                onSortedRowsChange={setSortedFilteredRows}
              />
            </div>
          </div>
        )}
      </main>

      {/* Persistent Footer Privacy Bar */}
      <footer className="border-t border-slate-200/80 bg-white/80 px-4 py-3 text-xs text-slate-500 dark:border-slate-800/80 dark:bg-slate-900/80 dark:text-slate-400">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>
              <strong>Local-Only Privacy:</strong> Files are processed 100% inside your browser and
              never uploaded to any server.
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsPrivacyOpen(true)}
              className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            >
              Privacy Policy
            </button>
            <span>•</span>
            <span>MIT License • CSV Cleaner</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <ExportModal
        isOpen={isExportOpen}
        defaultBaseName={fileMeta?.fileName ?? 'dataset'}
        currentState={currentState}
        originalState={originalState}
        filteredSortedRows={sortedFilteredRows.length > 0 ? sortedFilteredRows : filteredRows}
        isFiltered={isFiltered}
        modifiedCellsCount={metrics.modifiedCellsCount}
        onClose={() => setIsExportOpen(false)}
        onExportSuccess={(savedAs) =>
          notify(`Exported "${savedAs}" to your downloads.`, 'success')
        }
      />

      <PrivacyModal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
      />
    </div>
  );
}

export default App;
