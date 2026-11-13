import React, { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Calculator,
  Check,
  Columns3,
  Copy,
  Eraser,
  Filter,
  History,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Type,
  X,
} from 'lucide-react';
import type {
  ActiveFilters,
  DatasetMetrics,
  DatasetState,
  DuplicateKeepStrategy,
  EmptyRowRemovalMode,
  HistorySnapshot,
  NumericRangeFilter,
  OperationCategory,
  TextCaseMode,
  TextColumnFilter,
  TextFilterOperator,
} from '../types/dataset';
import { countDuplicateRows, removeDuplicateRows } from '../lib/cleaners/duplicates';
import {
  fillEmptyCells,
  isCellEmpty,
  removeEmptyColumns,
  removeEmptyRows,
} from '../lib/cleaners/emptyData';
import { cleanDatasetText } from '../lib/cleaners/textCleaner';
import {
  addCalculatedColumn,
  deleteColumns,
  moveColumnStep,
  previewCalculatedColumn,
  renameColumn,
} from '../lib/cleaners/columnOperations';
import { coerceRawScalar } from '../lib/parsers/headerUtils';

type CleaningTab = 'duplicates' | 'empty' | 'text' | 'columns' | 'filters' | 'history';

interface CleaningPanelProps {
  state: DatasetState;
  metrics: DatasetMetrics;
  filters: ActiveFilters;
  filteredRowCount: number;
  history: HistorySnapshot[];
  currentHistoryIndex: number;
  onApplyOperation: (
    nextState: DatasetState,
    meta: {
      category: OperationCategory;
      title: string;
      summary: string;
      affectedCount: number;
    }
  ) => void;
  onChangeFilters: (next: ActiveFilters) => void;
  onCommitFilteredRows: () => void;
  onJumpToHistory: (index: number) => void;
  onResetOriginal: () => void;
  onNotify: (message: string, tone?: 'success' | 'info' | 'warning') => void;
}

export const CleaningPanel: React.FC<CleaningPanelProps> = ({
  state,
  metrics,
  filters,
  filteredRowCount,
  history,
  currentHistoryIndex,
  onApplyOperation,
  onChangeFilters,
  onCommitFilteredRows,
  onJumpToHistory,
  onResetOriginal,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<CleaningTab>('duplicates');

  // --- 1. Duplicate Removal State ---
  const [dupSelectedCols, setDupSelectedCols] = useState<string[]>([]);
  const [dupCaseSensitive, setDupCaseSensitive] = useState<boolean>(true);
  const [dupTrimCompare, setDupTrimCompare] = useState<boolean>(false);
  const [dupKeep, setDupKeep] = useState<DuplicateKeepStrategy>('first');
  const [lastRemovedDuplicates, setLastRemovedDuplicates] = useState<number | null>(null);

  const validDupCols = useMemo(
    () => dupSelectedCols.filter((id) => state.columns.some((c) => c.id === id)),
    [dupSelectedCols, state.columns]
  );

  const previewDuplicatesCount = useMemo(
    () =>
      countDuplicateRows(state, {
        columnIds: validDupCols,
        caseSensitive: dupCaseSensitive,
        trimBeforeCompare: dupTrimCompare,
        keep: dupKeep,
      }),
    [state, validDupCols, dupCaseSensitive, dupTrimCompare, dupKeep]
  );

  // --- 2. Empty Data State ---
  const [emptyRowMode, setEmptyRowMode] = useState<EmptyRowRemovalMode>('all');
  const [emptyTargetCol, setEmptyTargetCol] = useState<string>('__ALL__');
  const [treatWsEmpty, setTreatWsEmpty] = useState<boolean>(true);
  const [fillValueInput, setFillValueInput] = useState<string>('N/A');
  const [fillTargetCol, setFillTargetCol] = useState<string>('__ALL__');

  const previewEmptyRowsCount = useMemo(() => {
    const colIds =
      emptyTargetCol === '__ALL__'
        ? []
        : state.columns.some((c) => c.id === emptyTargetCol)
        ? [emptyTargetCol]
        : [];
    return removeEmptyRows(state, {
      mode: emptyRowMode,
      columnIds: colIds,
      treatWhitespaceAsEmpty: treatWsEmpty,
    }).removedCount;
  }, [state, emptyRowMode, emptyTargetCol, treatWsEmpty]);

  const previewFillCellsCount = useMemo(() => {
    const targetCols =
      fillTargetCol === '__ALL__'
        ? state.columns.map((c) => c.id)
        : state.columns.some((c) => c.id === fillTargetCol)
        ? [fillTargetCol]
        : [];
    let count = 0;
    for (const row of state.rows) {
      for (const cid of targetCols) {
        if (isCellEmpty(row.cells[cid], treatWsEmpty)) count++;
      }
    }
    return count;
  }, [state, fillTargetCol, treatWsEmpty]);

  // --- 3. Text Cleaning State ---
  const [textTargetCol, setTextTargetCol] = useState<string>('__ALL__');
  const [trimWs, setTrimWs] = useState<boolean>(true);
  const [collapseSpaces, setCollapseSpaces] = useState<boolean>(true);
  const [normalizeUnicode, setNormalizeUnicode] = useState<boolean>(true);
  const [stripAccents, setStripAccents] = useState<boolean>(false);
  const [caseMode, setCaseMode] = useState<TextCaseMode>('none');

  // --- 4. Column Management State ---
  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [editingColName, setEditingColName] = useState<string>('');
  const [colError, setColError] = useState<string | null>(null);
  const [calcColName, setCalcColName] = useState<string>('');
  const [calcExpression, setCalcExpression] = useState<string>('');

  const calcPreview = useMemo(() => {
    if (!calcExpression.trim()) return { values: [], error: null };
    return previewCalculatedColumn(state, calcExpression, 4);
  }, [state, calcExpression]);

  // --- 5. Filter Builder State ---
  const [newTextCol, setNewTextCol] = useState<string>('');
  const [newTextOp, setNewTextOp] = useState<TextFilterOperator>('contains');
  const [newTextVal, setNewTextVal] = useState<string>('');
  const [newTextCase, setNewTextCase] = useState<boolean>(false);

  const [newNumCol, setNewNumCol] = useState<string>('');
  const [newNumMin, setNewNumMin] = useState<string>('');
  const [newNumMax, setNewNumMax] = useState<string>('');

  const defaultColId = state.columns[0]?.id ?? '';

  // Handlers
  const handleRemoveDuplicates = () => {
    const res = removeDuplicateRows(state, {
      columnIds: validDupCols,
      caseSensitive: dupCaseSensitive,
      trimBeforeCompare: dupTrimCompare,
      keep: dupKeep,
    });

    setLastRemovedDuplicates(res.removedCount);

    if (res.removedCount === 0) {
      onNotify('No matching duplicate rows found to remove.', 'info');
      return;
    }

    const scopeLabel =
      validDupCols.length === 0
        ? 'all columns'
        : `${validDupCols.length} selected column${validDupCols.length > 1 ? 's' : ''}`;

    onApplyOperation(res.state, {
      category: 'duplicates',
      title: 'Removed Duplicate Rows',
      summary: `Removed ${res.removedCount} duplicate row${res.removedCount === 1 ? '' : 's'} (${scopeLabel}, kept ${dupKeep})`,
      affectedCount: res.removedCount,
    });
    onNotify(`Removed ${res.removedCount} duplicate row${res.removedCount === 1 ? '' : 's'}.`, 'success');
  };

  const handleRemoveEmptyRows = () => {
    const colIds =
      emptyTargetCol === '__ALL__'
        ? []
        : state.columns.some((c) => c.id === emptyTargetCol)
        ? [emptyTargetCol]
        : [];
    const res = removeEmptyRows(state, {
      mode: emptyRowMode,
      columnIds: colIds,
      treatWhitespaceAsEmpty: treatWsEmpty,
    });

    if (res.removedCount === 0) {
      onNotify('No matching empty rows found.', 'info');
      return;
    }

    onApplyOperation(res.state, {
      category: 'empty',
      title: 'Removed Empty Rows',
      summary: `Removed ${res.removedCount} row${res.removedCount === 1 ? '' : 's'} (${
        emptyRowMode === 'all' ? 'all values empty' : 'containing empty values'
      })`,
      affectedCount: res.removedCount,
    });
    onNotify(`Removed ${res.removedCount} row${res.removedCount === 1 ? '' : 's'}.`, 'success');
  };

  const handleRemoveEmptyColumns = () => {
    const res = removeEmptyColumns(state, treatWsEmpty);
    if (res.removedColumnIds.length === 0) {
      onNotify('No completely empty columns found.', 'info');
      return;
    }

    onApplyOperation(res.state, {
      category: 'empty',
      title: 'Removed Empty Columns',
      summary: `Removed ${res.removedColumnNames.length} empty column${
        res.removedColumnNames.length === 1 ? '' : 's'
      }: ${res.removedColumnNames.join(', ')}`,
      affectedCount: res.removedColumnNames.length,
    });
    onNotify(
      `Removed empty column${res.removedColumnNames.length === 1 ? '' : 's'}: ${res.removedColumnNames.join(', ')}`,
      'success'
    );
  };

  const handleFillEmptyCells = () => {
    const colIds =
      fillTargetCol === '__ALL__'
        ? []
        : state.columns.some((c) => c.id === fillTargetCol)
        ? [fillTargetCol]
        : [];
    const coercedFill = coerceRawScalar(fillValueInput);
    const res = fillEmptyCells(state, {
      fillValue: coercedFill,
      columnIds: colIds,
      treatWhitespaceAsEmpty: treatWsEmpty,
    });

    if (res.replacedCount === 0) {
      onNotify('No empty cells needed replacement.', 'info');
      return;
    }

    onApplyOperation(res.state, {
      category: 'empty',
      title: 'Filled Empty Cells',
      summary: `Replaced ${res.replacedCount} empty cell${
        res.replacedCount === 1 ? '' : 's'
      } with "${fillValueInput}"`,
      affectedCount: res.replacedCount,
    });
    onNotify(`Filled ${res.replacedCount} empty cell${res.replacedCount === 1 ? '' : 's'}.`, 'success');
  };

  const handleApplyTextClean = () => {
    const colIds =
      textTargetCol === '__ALL__'
        ? []
        : state.columns.some((c) => c.id === textTargetCol)
        ? [textTargetCol]
        : [];

    const res = cleanDatasetText(state, {
      columnIds: colIds,
      trimWhitespace: trimWs,
      collapseSpaces,
      normalizeUnicode,
      stripAccents,
      caseMode,
    });

    if (res.modifiedCellsCount === 0) {
      onNotify('All targeted text cells already match those formatting rules.', 'info');
      return;
    }

    const actions: string[] = [];
    if (trimWs) actions.push('trim');
    if (collapseSpaces) actions.push('collapse spaces');
    if (normalizeUnicode) actions.push('normalize');
    if (stripAccents) actions.push('strip accents');
    if (caseMode !== 'none') actions.push(`${caseMode} case`);

    onApplyOperation(res.state, {
      category: 'text',
      title: 'Cleaned Text Values',
      summary: `Formatted ${res.modifiedCellsCount} cell${
        res.modifiedCellsCount === 1 ? '' : 's'
      } (${actions.join(', ')})`,
      affectedCount: res.modifiedCellsCount,
    });
    onNotify(`Cleaned ${res.modifiedCellsCount} text cell${res.modifiedCellsCount === 1 ? '' : 's'}.`, 'success');
  };

  const handleSaveRename = (colId: string) => {
    setColError(null);
    try {
      const oldCol = state.columns.find((c) => c.id === colId);
      const next = renameColumn(state, colId, editingColName);
      setEditingColId(null);
      if (next !== state) {
        onApplyOperation(next, {
          category: 'columns',
          title: 'Renamed Column',
          summary: `Renamed "${oldCol?.name ?? ''}" to "${editingColName.trim()}"`,
          affectedCount: 1,
        });
        onNotify(`Renamed column to "${editingColName.trim()}".`, 'success');
      }
    } catch (err) {
      setColError(err instanceof Error ? err.message : 'Rename failed');
    }
  };

  const handleDeleteColumn = (colId: string, colName: string) => {
    if (state.columns.length <= 1) {
      onNotify('Cannot delete the last remaining column.', 'warning');
      return;
    }
    const next = deleteColumns(state, [colId]);
    onApplyOperation(next, {
      category: 'columns',
      title: 'Deleted Column',
      summary: `Deleted column "${colName}"`,
      affectedCount: 1,
    });
    onNotify(`Deleted column "${colName}".`, 'success');
  };

  const handleMoveColumn = (colId: string, colName: string, direction: 'left' | 'right') => {
    const next = moveColumnStep(state, colId, direction);
    if (next === state) return;
    onApplyOperation(next, {
      category: 'columns',
      title: 'Reordered Columns',
      summary: `Moved column "${colName}" ${direction === 'left' ? 'up/left' : 'down/right'}`,
      affectedCount: 1,
    });
  };

  const handleAddCalculatedColumn = (e: React.FormEvent) => {
    e.preventDefault();
    setColError(null);
    try {
      const next = addCalculatedColumn(state, {
        name: calcColName,
        expression: calcExpression,
      });
      const addedName = calcColName.trim();
      setCalcColName('');
      setCalcExpression('');
      onApplyOperation(next, {
        category: 'columns',
        title: 'Added Calculated Column',
        summary: `Added "${addedName}" = ${calcExpression.trim()}`,
        affectedCount: next.rows.length,
      });
      onNotify(`Added calculated column "${addedName}".`, 'success');
    } catch (err) {
      setColError(err instanceof Error ? err.message : 'Failed to create calculated column');
    }
  };

  const handleAddTextFilter = (e: React.FormEvent) => {
    e.preventDefault();
    const targetCol = newTextCol || defaultColId;
    if (!targetCol) return;
    if (newTextOp !== 'is_empty' && newTextOp !== 'is_not_empty' && !newTextVal.trim()) {
      return;
    }
    const filter: TextColumnFilter = {
      id: `tf_${Date.now()}`,
      columnId: targetCol,
      operator: newTextOp,
      value: newTextVal,
      caseSensitive: newTextCase,
    };
    onChangeFilters({
      ...filters,
      textFilters: [...filters.textFilters, filter],
    });
    setNewTextVal('');
  };

  const handleAddNumericFilter = (e: React.FormEvent) => {
    e.preventDefault();
    const targetCol = newNumCol || defaultColId;
    if (!targetCol) return;
    const min = newNumMin.trim() !== '' ? Number(newNumMin) : undefined;
    const max = newNumMax.trim() !== '' ? Number(newNumMax) : undefined;
    if (min === undefined && max === undefined) return;

    const filter: NumericRangeFilter = {
      id: `nf_${Date.now()}`,
      columnId: targetCol,
      min,
      max,
    };
    onChangeFilters({
      ...filters,
      numericFilters: [...filters.numericFilters, filter],
    });
    setNewNumMin('');
    setNewNumMax('');
  };

  const tabs: { id: CleaningTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'duplicates',
      label: 'Duplicates',
      icon: <Copy className="h-3.5 w-3.5" />,
      badge: metrics.duplicateRowsCount > 0 ? metrics.duplicateRowsCount : undefined,
    },
    {
      id: 'empty',
      label: 'Empty',
      icon: <Eraser className="h-3.5 w-3.5" />,
      badge: metrics.emptyCells > 0 ? metrics.emptyCells : undefined,
    },
    {
      id: 'text',
      label: 'Text',
      icon: <Type className="h-3.5 w-3.5" />,
    },
    {
      id: 'columns',
      label: 'Columns',
      icon: <Columns3 className="h-3.5 w-3.5" />,
      badge: state.columns.length,
    },
    {
      id: 'filters',
      label: 'Filter',
      icon: <Filter className="h-3.5 w-3.5" />,
      badge:
        filters.textFilters.length + filters.numericFilters.length > 0
          ? filters.textFilters.length + filters.numericFilters.length
          : undefined,
    },
    {
      id: 'history',
      label: 'History',
      icon: <History className="h-3.5 w-3.5" />,
      badge: history.length > 1 ? history.length - 1 : undefined,
    },
  ];

  return (
    <aside className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
      {/* Tab Navigation */}
      <div className="grid grid-cols-3 gap-1 border-b border-slate-200 bg-slate-50/80 p-1.5 dark:border-slate-800 dark:bg-slate-900/80 sm:grid-cols-6 lg:grid-cols-3">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition ${
                active
                  ? 'bg-white text-indigo-600 shadow-xs ring-1 ring-slate-200/80 dark:bg-slate-800 dark:text-indigo-400 dark:ring-slate-700'
                  : 'text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] tabular-nums ${
                    active
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                      : 'bg-slate-200/70 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Tool Body */}
      <div className="p-4 space-y-4 text-xs">
        {/* ==================== 1. DUPLICATES ==================== */}
        {activeTab === 'duplicates' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Duplicate Row Removal
              </h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Choose which columns identify duplicate records and remove redundant rows.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Key Columns ({validDupCols.length === 0 ? 'All Columns' : `${validDupCols.length} selected`})
                </span>
                {validDupCols.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setDupSelectedCols([])}
                    className="text-[11px] font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    Use All Columns
                  </button>
                )}
              </div>

              <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/60 p-2 dark:border-slate-800 dark:bg-slate-800/40">
                {state.columns.map((col) => {
                  const checked =
                    validDupCols.length === 0 || validDupCols.includes(col.id);
                  return (
                    <label
                      key={col.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 hover:bg-white dark:hover:bg-slate-800"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          if (validDupCols.length === 0) {
                            // Switching from implicit all -> unchecking one
                            setDupSelectedCols(
                              state.columns.filter((c) => c.id !== col.id).map((c) => c.id)
                            );
                          } else if (validDupCols.includes(col.id)) {
                            const next = validDupCols.filter((id) => id !== col.id);
                            setDupSelectedCols(next);
                          } else {
                            const next = [...validDupCols, col.id];
                            setDupSelectedCols(
                              next.length === state.columns.length ? [] : next
                            );
                          }
                        }}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="truncate text-slate-700 dark:text-slate-200">{col.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 rounded-lg border border-slate-200/80 p-3 dark:border-slate-800">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={dupCaseSensitive}
                  onChange={(e) => setDupCaseSensitive(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600"
                />
                <span className="text-slate-700 dark:text-slate-300">Case-sensitive matching</span>
              </label>

              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={dupTrimCompare}
                  onChange={(e) => setDupTrimCompare(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600"
                />
                <span className="text-slate-700 dark:text-slate-300">
                  Ignore surrounding spaces when comparing
                </span>
              </label>

              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-600 dark:text-slate-400">Keep occurrence:</span>
                <select
                  value={dupKeep}
                  onChange={(e) => setDupKeep(e.target.value as DuplicateKeepStrategy)}
                  className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="first">First row</option>
                  <option value="last">Last row</option>
                </select>
              </div>
            </div>

            {/* Live Impact Preview */}
            <div className="rounded-lg bg-slate-100/80 px-3 py-2 text-xs text-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
              Matching duplicates detected:{' '}
              <strong className="font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                {previewDuplicatesCount} row{previewDuplicatesCount === 1 ? '' : 's'}
              </strong>
            </div>

            {lastRemovedDuplicates !== null && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                Last run removed <strong>{lastRemovedDuplicates}</strong> duplicate row
                {lastRemovedDuplicates === 1 ? '' : 's'}.
              </div>
            )}

            <button
              type="button"
              onClick={handleRemoveDuplicates}
              className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700"
            >
              Remove Duplicate Rows ({previewDuplicatesCount})
            </button>
          </div>
        )}

        {/* ==================== 2. EMPTY DATA ==================== */}
        {activeTab === 'empty' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Empty Data Handling
              </h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Dataset has <strong>{metrics.emptyCells}</strong> empty cells across{' '}
                <strong>{metrics.emptyRowsAny}</strong> rows.
              </p>
            </div>

            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/40">
              <input
                type="checkbox"
                checked={treatWsEmpty}
                onChange={(e) => setTreatWsEmpty(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600"
              />
              <span className="text-slate-700 dark:text-slate-300">
                Treat whitespace-only cells as empty
              </span>
            </label>

            {/* Remove Empty Rows */}
            <div className="space-y-2.5 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <h4 className="font-semibold text-slate-800 dark:text-slate-200">
                1. Remove Rows with Empty Values
              </h4>

              <div className="space-y-1.5">
                <label className="block text-[11px] text-slate-500 dark:text-slate-400">
                  Condition:
                </label>
                <select
                  value={emptyRowMode}
                  onChange={(e) => setEmptyRowMode(e.target.value as EmptyRowRemovalMode)}
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="all">All inspected columns are empty (blank rows)</option>
                  <option value="any">Any inspected column is empty (incomplete rows)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] text-slate-500 dark:text-slate-400">
                  Inspect Columns:
                </label>
                <select
                  value={emptyTargetCol}
                  onChange={(e) => setEmptyTargetCol(e.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="__ALL__">All Columns</option>
                  {state.columns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({metrics.emptyByColumn[c.id] ?? 0} empty)
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleRemoveEmptyRows}
                className="w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700"
              >
                Remove Matching Rows ({previewEmptyRowsCount})
              </button>
            </div>

            {/* Remove Empty Columns */}
            <div className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-slate-800 dark:text-slate-200">
                  2. Remove Empty Columns
                </h4>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {metrics.emptyColumnIds.length} found
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Deletes columns where 100% of rows are empty.
              </p>
              <button
                type="button"
                onClick={handleRemoveEmptyColumns}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Remove Empty Columns ({metrics.emptyColumnIds.length})
              </button>
            </div>

            {/* Fill Empty Cells */}
            <div className="space-y-2.5 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <h4 className="font-semibold text-slate-800 dark:text-slate-200">
                3. Replace Empty Cells
              </h4>

              <div className="space-y-1.5">
                <label className="block text-[11px] text-slate-500 dark:text-slate-400">
                  Target Column:
                </label>
                <select
                  value={fillTargetCol}
                  onChange={(e) => setFillTargetCol(e.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="__ALL__">All Columns</option>
                  {state.columns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({metrics.emptyByColumn[c.id] ?? 0} empty)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="fill-empty-input"
                  className="block text-[11px] text-slate-500 dark:text-slate-400"
                >
                  Replacement Value:
                </label>
                <input
                  id="fill-empty-input"
                  type="text"
                  value={fillValueInput}
                  onChange={(e) => setFillValueInput(e.target.value)}
                  placeholder="e.g. N/A, 0, Unknown"
                  className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <button
                type="button"
                onClick={handleFillEmptyCells}
                className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700"
              >
                Replace Empty Cells ({previewFillCellsCount})
              </button>
            </div>
          </div>
        )}

        {/* ==================== 3. TEXT CLEANING ==================== */}
        {activeTab === 'text' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Text Standardization &amp; Normalization
              </h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Clean whitespace, casing, smart punctuation, and Unicode encoding.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Target Column:
              </label>
              <select
                value={textTargetCol}
                onChange={(e) => setTextTargetCol(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="__ALL__">All Columns</option>
                {state.columns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={trimWs}
                  onChange={(e) => setTrimWs(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600"
                />
                <span className="text-slate-700 dark:text-slate-300">
                  Trim leading &amp; trailing whitespace
                </span>
              </label>

              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={collapseSpaces}
                  onChange={(e) => setCollapseSpaces(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600"
                />
                <span className="text-slate-700 dark:text-slate-300">
                  Remove duplicate internal spaces
                </span>
              </label>

              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={normalizeUnicode}
                  onChange={(e) => setNormalizeUnicode(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600"
                />
                <span className="text-slate-700 dark:text-slate-300">
                  Normalize Unicode, smart quotes &amp; NBSP
                </span>
              </label>

              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={stripAccents}
                  onChange={(e) => setStripAccents(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600"
                />
                <span className="text-slate-700 dark:text-slate-300">
                  Strip diacritics / accents (é → e, ü → u)
                </span>
              </label>
            </div>

            <div className="space-y-1.5">
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Letter Case Conversion:
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    { id: 'none', label: 'Keep Case' },
                    { id: 'title', label: 'Title Case' },
                    { id: 'upper', label: 'UPPERCASE' },
                    { id: 'lower', label: 'lowercase' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setCaseMode(opt.id)}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                      caseMode === opt.id
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-300'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleApplyTextClean}
              className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700"
            >
              Apply Text Cleaning
            </button>
          </div>
        )}

        {/* ==================== 4. COLUMNS ==================== */}
        {activeTab === 'columns' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Column Management
              </h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Rename, reorder, delete, or compute formula columns with immediate preview.
              </p>
            </div>

            {colError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-300">
                {colError}
              </div>
            )}

            {/* Existing Columns List */}
            <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-2 dark:border-slate-800 dark:bg-slate-800/30">
              {state.columns.map((col, idx) => {
                const isEditing = editingColId === col.id;
                return (
                  <div
                    key={col.id}
                    className="flex items-center justify-between gap-1.5 rounded-lg border border-slate-200/80 bg-white px-2.5 py-1.5 dark:border-slate-700/80 dark:bg-slate-800"
                  >
                    {isEditing ? (
                      <div className="flex flex-1 items-center gap-1">
                        <input
                          type="text"
                          value={editingColName}
                          onChange={(e) => setEditingColName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(col.id);
                            if (e.key === 'Escape') setEditingColId(null);
                          }}
                          autoFocus
                          className="w-full rounded border border-indigo-400 bg-white px-2 py-0.5 text-xs text-slate-900 focus:outline-none dark:bg-slate-900 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveRename(col.id)}
                          title="Save column name"
                          className="rounded p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingColId(null)}
                          title="Cancel"
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] text-slate-400">
                              {idx + 1}.
                            </span>
                            <span
                              className="truncate font-medium text-slate-800 dark:text-slate-200"
                              title={col.name}
                            >
                              {col.name}
                            </span>
                            {col.isCalculated && (
                              <span className="rounded bg-indigo-50 px-1 py-0.2 text-[10px] font-semibold text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
                                fx
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => handleMoveColumn(col.id, col.name, 'left')}
                            disabled={idx === 0}
                            title="Move column earlier"
                            className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-700"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveColumn(col.id, col.name, 'right')}
                            disabled={idx === state.columns.length - 1}
                            title="Move column later"
                            className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-700"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingColId(col.id);
                              setEditingColName(col.name);
                              setColError(null);
                            }}
                            title="Rename column"
                            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-700"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteColumn(col.id, col.name)}
                            title="Delete column"
                            className="rounded p-1 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add Calculated Column */}
            <form
              onSubmit={handleAddCalculatedColumn}
              className="space-y-2.5 rounded-xl border border-indigo-200/80 bg-indigo-50/30 p-3 dark:border-indigo-900/50 dark:bg-indigo-950/20"
            >
              <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                <Calculator className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                <h4>Add Calculated Column</h4>
              </div>

              <input
                type="text"
                value={calcColName}
                onChange={(e) => setCalcColName(e.target.value)}
                placeholder="New column name (e.g. Order Total)"
                className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />

              <textarea
                rows={2}
                value={calcExpression}
                onChange={(e) => setCalcExpression(e.target.value)}
                placeholder='e.g. ROUND([Unit Price] * [Quantity], 2) or [Customer Name] & " (" & [Country] & ")"'
                className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />

              {/* Clickable Column Reference Chips */}
              <div className="space-y-1">
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                  Click a column to insert into formula:
                </span>
                <div className="flex flex-wrap gap-1">
                  {state.columns.slice(0, 10).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() =>
                        setCalcExpression((prev) =>
                          prev ? `${prev} [${c.name}]` : `[${c.name}]`
                        )
                      }
                      className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-700 hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    >
                      [{c.name}]
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Formula Preview */}
              {calcExpression.trim() !== '' && (
                <div className="rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Live Preview (First {calcPreview.values.length} Rows)
                  </div>
                  {calcPreview.error ? (
                    <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">
                      {calcPreview.error}
                    </p>
                  ) : (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {calcPreview.values.map((v, idx) => (
                        <span
                          key={idx}
                          className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                        >
                          {v === null || v === '' ? 'EMPTY' : String(v)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={!calcColName.trim() || !calcExpression.trim() || Boolean(calcPreview.error)}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Calculated Column</span>
              </button>
            </form>
          </div>
        )}

        {/* ==================== 5. FILTERS ==================== */}
        {activeTab === 'filters' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Search &amp; Data Filtering
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Showing <strong>{filteredRowCount}</strong> of{' '}
                  <strong>{state.rows.length}</strong> rows
                </p>
              </div>
              {(filters.globalSearch ||
                filters.textFilters.length > 0 ||
                filters.numericFilters.length > 0) && (
                <button
                  type="button"
                  onClick={() =>
                    onChangeFilters({
                      globalSearch: '',
                      textFilters: [],
                      numericFilters: [],
                    })
                  }
                  className="text-xs font-semibold text-rose-600 hover:underline dark:text-rose-400"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Add Text Filter */}
            <form
              onSubmit={handleAddTextFilter}
              className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800"
            >
              <h4 className="font-semibold text-slate-800 dark:text-slate-200">
                Filter by Text / Presence
              </h4>
              <select
                value={newTextCol || defaultColId}
                onChange={(e) => setNewTextCol(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {state.columns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={newTextOp}
                onChange={(e) => setNewTextOp(e.target.value as TextFilterOperator)}
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="contains">Contains</option>
                <option value="not_contains">Does not contain</option>
                <option value="equals">Equals</option>
                <option value="starts_with">Starts with</option>
                <option value="ends_with">Ends with</option>
                <option value="is_not_empty">Is not empty</option>
                <option value="is_empty">Is empty</option>
              </select>

              {newTextOp !== 'is_empty' && newTextOp !== 'is_not_empty' && (
                <input
                  type="text"
                  value={newTextVal}
                  onChange={(e) => setNewTextVal(e.target.value)}
                  placeholder="Text to match..."
                  className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              )}

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                  <input
                    type="checkbox"
                    checked={newTextCase}
                    onChange={(e) => setNewTextCase(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600"
                  />
                  <span>Case-sensitive</span>
                </label>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                >
                  Add Text Filter
                </button>
              </div>
            </form>

            {/* Add Numeric Range Filter */}
            <form
              onSubmit={handleAddNumericFilter}
              className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800"
            >
              <h4 className="font-semibold text-slate-800 dark:text-slate-200">
                Filter by Numeric Range
              </h4>
              <select
                value={newNumCol || defaultColId}
                onChange={(e) => setNewNumCol(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {state.columns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({metrics.inferredTypeByColumn[c.id] ?? 'text'})
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="any"
                  value={newNumMin}
                  onChange={(e) => setNewNumMin(e.target.value)}
                  placeholder="Min value"
                  className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <input
                  type="number"
                  step="any"
                  value={newNumMax}
                  onChange={(e) => setNewNumMax(e.target.value)}
                  placeholder="Max value"
                  className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700"
              >
                Add Numeric Range Filter
              </button>
            </form>

            {/* Active Filter Pills */}
            {(filters.textFilters.length > 0 || filters.numericFilters.length > 0) && (
              <div className="space-y-1.5">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Active Rules
                </h4>
                {filters.textFilters.map((tf) => {
                  const colName =
                    state.columns.find((c) => c.id === tf.columnId)?.name ?? tf.columnId;
                  return (
                    <div
                      key={tf.id}
                      className="flex items-center justify-between rounded-lg border border-indigo-200 bg-indigo-50/70 px-2.5 py-1.5 text-xs dark:border-indigo-900/60 dark:bg-indigo-950/50"
                    >
                      <span className="truncate text-slate-800 dark:text-slate-200">
                        <strong>{colName}</strong> {tf.operator.replace(/_/g, ' ')}{' '}
                        {tf.value ? `"${tf.value}"` : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onChangeFilters({
                            ...filters,
                            textFilters: filters.textFilters.filter((f) => f.id !== tf.id),
                          })
                        }
                        className="ml-2 text-slate-400 hover:text-rose-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
                {filters.numericFilters.map((nf) => {
                  const colName =
                    state.columns.find((c) => c.id === nf.columnId)?.name ?? nf.columnId;
                  return (
                    <div
                      key={nf.id}
                      className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/70 px-2.5 py-1.5 text-xs dark:border-emerald-900/60 dark:bg-emerald-950/50"
                    >
                      <span className="truncate text-slate-800 dark:text-slate-200">
                        <strong>{colName}</strong>:{' '}
                        {nf.min !== undefined ? `≥ ${nf.min}` : ''}{' '}
                        {nf.max !== undefined ? `≤ ${nf.max}` : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onChangeFilters({
                            ...filters,
                            numericFilters: filters.numericFilters.filter((f) => f.id !== nf.id),
                          })
                        }
                        className="ml-2 text-slate-400 hover:text-rose-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}

                {filteredRowCount < state.rows.length && (
                  <button
                    type="button"
                    onClick={onCommitFilteredRows}
                    className="mt-2 w-full rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 transition hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200"
                  >
                    Keep Only Filtered Rows ({filteredRowCount}) &amp; Drop Others
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ==================== 6. HISTORY ==================== */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Transformation History
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Click any step to jump backward or forward in time.
                </p>
              </div>
              {currentHistoryIndex > 0 && (
                <button
                  type="button"
                  onClick={onResetOriginal}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:underline dark:text-rose-400"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
              {history.map((snap, idx) => {
                const isCurrent = idx === currentHistoryIndex;
                const isFuture = idx > currentHistoryIndex;
                return (
                  <button
                    key={snap.operation.id}
                    type="button"
                    onClick={() => onJumpToHistory(idx)}
                    className={`w-full rounded-xl border p-2.5 text-left transition ${
                      isCurrent
                        ? 'border-indigo-500 bg-indigo-50/70 dark:border-indigo-500 dark:bg-indigo-950/40'
                        : isFuture
                        ? 'border-slate-200/60 bg-slate-50/40 opacity-55 hover:opacity-90 dark:border-slate-800 dark:bg-slate-900/40'
                        : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {idx === 0 ? '0. Original Dataset' : `${idx}. ${snap.operation.title}`}
                      </span>
                      {isCurrent && (
                        <span className="rounded bg-indigo-600 px-1.5 py-0.2 text-[10px] font-semibold text-white">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                      {snap.operation.summary}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
