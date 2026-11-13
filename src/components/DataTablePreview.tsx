import React, { useEffect, useMemo, useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  GitCompareArrows,
  History,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import type {
  CellValue,
  DataRow,
  DatasetState,
  PreviewMode,
} from '../types/dataset';
import { isCellModified, type OriginalCellLookup } from '../lib/cleaners/metrics';
import { isCellEmpty } from '../lib/cleaners/emptyData';
import { coerceRawScalar } from '../lib/parsers/headerUtils';

interface DataTablePreviewProps {
  cleanedState: DatasetState;
  filteredRows: DataRow[];
  originalState: DatasetState;
  originalLookup: OriginalCellLookup;
  previewMode: PreviewMode;
  highlightModified: boolean;
  globalSearch: string;
  onChangePreviewMode: (mode: PreviewMode) => void;
  onToggleHighlightModified: () => void;
  onChangeGlobalSearch: (search: string) => void;
  onEditCell: (rowId: string, columnId: string, newValue: CellValue) => void;
  onSortedRowsChange?: (rows: DataRow[]) => void;
}

const columnHelper = createColumnHelper<DataRow>();

function renderReadableCell(val: CellValue): React.ReactNode {
  if (isCellEmpty(val, false)) {
    return (
      <span className="inline-block rounded bg-slate-100 px-1.5 py-0.2 font-mono text-[10px] italic text-slate-400 dark:bg-slate-800 dark:text-slate-500">
        EMPTY
      </span>
    );
  }
  if (typeof val === 'boolean') {
    return (
      <span className="rounded bg-indigo-50 px-1.5 py-0.2 font-mono text-[11px] font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
        {val ? 'true' : 'false'}
      </span>
    );
  }
  if (typeof val === 'number') {
    return <span className="font-mono tabular-nums">{val}</span>;
  }
  const str = String(val);
  // Subtle visual hint if string has leading/trailing spaces
  const hasLeadingOrTrailingSpace = str.length > 0 && str.trim() !== str;
  if (hasLeadingOrTrailingSpace) {
    return (
      <span title="Contains leading or trailing whitespace" className="whitespace-pre">
        <span className="rounded bg-amber-100/80 px-0.5 dark:bg-amber-900/40">{str}</span>
      </span>
    );
  }
  return <span className="whitespace-pre">{str}</span>;
}

export const DataTablePreview: React.FC<DataTablePreviewProps> = ({
  cleanedState,
  filteredRows,
  originalState,
  originalLookup,
  previewMode,
  highlightModified,
  globalSearch,
  onChangePreviewMode,
  onToggleHighlightModified,
  onChangeGlobalSearch,
  onEditCell,
  onSortedRowsChange,
}) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  });

  const [editingCell, setEditingCell] = useState<{
    rowId: string;
    colId: string;
    draft: string;
  } | null>(null);

  const activeDataset = previewMode === 'original' ? originalState : cleanedState;
  const activeRows = previewMode === 'original' ? originalState.rows : filteredRows;

  // Reset sorting if sorted column no longer exists
  useEffect(() => {
    setSorting((prev) =>
      prev.filter((s) => activeDataset.columns.some((c) => c.id === s.id))
    );
  }, [activeDataset.columns]);

  // Clamp pageIndex when row count shrinks
  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(activeRows.length / pagination.pageSize) - 1);
    if (pagination.pageIndex > maxPage) {
      setPagination((prev) => ({ ...prev, pageIndex: maxPage }));
    }
  }, [activeRows.length, pagination.pageIndex, pagination.pageSize]);

  const originalColMap = useMemo(
    () => new Map(originalState.columns.map((c) => [c.id, c.name])),
    [originalState.columns]
  );

  const columns = useMemo(() => {
    const rowNumberCol = columnHelper.display({
      id: '__row_num__',
      header: '#',
      size: 56,
      minSize: 48,
      maxSize: 90,
      enableResizing: false,
      enableSorting: false,
      cell: (info) => (
        <span className="font-mono text-[11px] tabular-nums text-slate-400 dark:text-slate-500">
          {info.row.index + 1}
        </span>
      ),
    });

    const dataCols = activeDataset.columns.map((colMeta) =>
      columnHelper.accessor((row) => row.cells[colMeta.id] ?? null, {
        id: colMeta.id,
        header: () => {
          const origName = originalColMap.get(colMeta.id);
          const wasRenamed =
            previewMode !== 'original' && origName !== undefined && origName !== colMeta.name;
          return (
            <div className="flex items-center gap-1.5 truncate">
              <span className="truncate font-semibold" title={colMeta.name}>
                {colMeta.name}
              </span>
              {colMeta.isCalculated && (
                <span
                  title={`Calculated: ${colMeta.formula ?? ''}`}
                  className="shrink-0 rounded bg-indigo-100 px-1 py-0.2 font-mono text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                >
                  fx
                </span>
              )}
              {wasRenamed && (
                <span
                  title={`Renamed from "${origName}"`}
                  className="shrink-0 rounded bg-amber-100 px-1 py-0.2 text-[10px] font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                >
                  renamed
                </span>
              )}
            </div>
          );
        },
        size: 175,
        minSize: 90,
        maxSize: 600,
        sortingFn: (rowA, rowB, colId) => {
          const a = rowA.original.cells[colId] ?? null;
          const b = rowB.original.cells[colId] ?? null;
          const aEmpty = isCellEmpty(a, false);
          const bEmpty = isCellEmpty(b, false);
          if (aEmpty && bEmpty) return 0;
          if (aEmpty) return 1;
          if (bEmpty) return -1;

          if (typeof a === 'number' && typeof b === 'number') {
            return a - b;
          }
          const numA = Number(a);
          const numB = Number(b);
          if (!Number.isNaN(numA) && !Number.isNaN(numB) && String(a).trim() !== '' && String(b).trim() !== '') {
            return numA - numB;
          }
          return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
        },
        cell: (info) => {
          const row = info.row.original;
          const val = row.cells[colMeta.id] ?? null;

          if (
            previewMode === 'cleaned' &&
            editingCell &&
            editingCell.rowId === row.id &&
            editingCell.colId === colMeta.id
          ) {
            return (
              <input
                type="text"
                value={editingCell.draft}
                autoFocus
                onChange={(e) =>
                  setEditingCell((prev) =>
                    prev ? { ...prev, draft: e.target.value } : null
                  )
                }
                onBlur={() => {
                  const nextScalar = coerceRawScalar(editingCell.draft);
                  if (nextScalar !== (val ?? '')) {
                    onEditCell(row.id, colMeta.id, nextScalar);
                  }
                  setEditingCell(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const nextScalar = coerceRawScalar(editingCell.draft);
                    if (nextScalar !== (val ?? '')) {
                      onEditCell(row.id, colMeta.id, nextScalar);
                    }
                    setEditingCell(null);
                  } else if (e.key === 'Escape') {
                    setEditingCell(null);
                  }
                }}
                className="w-full rounded border border-indigo-500 bg-white px-1.5 py-0.5 text-xs text-slate-900 focus:outline-none dark:bg-slate-900 dark:text-white"
              />
            );
          }

          if (previewMode === 'diff') {
            const diff = isCellModified(row.id, colMeta.id, val, originalLookup);
            if (diff.modified && !diff.isNewColumn) {
              return (
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="line-through decoration-rose-400 opacity-65">
                    {renderReadableCell(diff.originalValue)}
                  </span>
                  <span className="text-slate-400">→</span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                    {renderReadableCell(val)}
                  </span>
                </div>
              );
            }
          }

          return renderReadableCell(val);
        },
      })
    );

    return [rowNumberCol, ...dataCols];
  }, [
    activeDataset.columns,
    editingCell,
    onEditCell,
    originalColMap,
    originalLookup,
    previewMode,
  ]);

  const table = useReactTable({
    data: activeRows,
    columns,
    state: {
      sorting,
      pagination,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    columnResizeMode: 'onChange',
    enableColumnResizing: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  // Expose sorted+filtered rows up to parent so Export can optionally preserve sorted order too
  useEffect(() => {
    if (onSortedRowsChange && previewMode !== 'original') {
      const sorted = table.getPrePaginationRowModel().rows.map((r) => r.original);
      onSortedRowsChange(sorted);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sorting, activeRows, onSortedRowsChange, previewMode]);

  const pageRows = table.getRowModel().rows;
  const totalRows = activeRows.length;
  const pageCount = Math.max(1, table.getPageCount());
  const startRowIdx = totalRows === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1;
  const endRowIdx = Math.min(totalRows, (pagination.pageIndex + 1) * pagination.pageSize);

  return (
    <section className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
      {/* Top Spreadsheet Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-200 px-3.5 py-2.5 dark:border-slate-800">
        {/* Global Search + Row/Column Counter */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => onChangeGlobalSearch(e.target.value)}
              disabled={previewMode === 'original'}
              placeholder={
                previewMode === 'original'
                  ? 'Viewing original snapshot...'
                  : 'Search across all cells...'
              }
              aria-label="Search dataset"
              className="w-52 rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-7 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:w-64"
            />
            {globalSearch && previewMode !== 'original' && (
              <button
                type="button"
                onClick={() => onChangeGlobalSearch('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <span className="rounded-md bg-slate-100 px-2.5 py-1 font-mono text-xs font-medium tabular-nums text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {totalRows.toLocaleString()} rows × {activeDataset.columns.length} cols
          </span>
        </div>

        {/* View Mode Switcher & Highlight Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Data preview mode"
            className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800"
          >
            <button
              type="button"
              onClick={() => onChangePreviewMode('cleaned')}
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                previewMode === 'cleaned'
                  ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-700 dark:text-indigo-300'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Cleaned</span>
            </button>
            <button
              type="button"
              onClick={() => onChangePreviewMode('diff')}
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                previewMode === 'diff'
                  ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-700 dark:text-indigo-300'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <GitCompareArrows className="h-3.5 w-3.5" />
              <span>Inline Diff</span>
            </button>
            <button
              type="button"
              onClick={() => onChangePreviewMode('original')}
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                previewMode === 'original'
                  ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-700 dark:text-indigo-300'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <History className="h-3.5 w-3.5" />
              <span>Original</span>
            </button>
          </div>

          {previewMode !== 'original' && (
            <button
              type="button"
              onClick={onToggleHighlightModified}
              title="Highlight cells changed compared to original file"
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                highlightModified
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Highlight Changes</span>
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Spreadsheet Viewport */}
      <div className="relative max-h-[620px] overflow-auto">
        <table
          className="w-full border-collapse text-left text-xs"
          style={{ minWidth: Math.max(table.getTotalSize(), 640) }}
        >
          <thead className="sticky top-0 z-20 bg-slate-100/95 text-slate-700 backdrop-blur-xs dark:bg-slate-800/95 dark:text-slate-200">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const isRowNum = header.column.id === '__row_num__';
                  const canSort = header.column.getCanSort();
                  const sortDir = header.column.getIsSorted();

                  return (
                    <th
                      key={header.id}
                      style={{ width: header.getSize() }}
                      className={`group relative select-none border-b border-r border-slate-200/90 px-3 py-2.5 font-semibold dark:border-slate-700/80 ${
                        isRowNum
                          ? 'sticky left-0 z-30 bg-slate-100 text-center dark:bg-slate-800'
                          : ''
                      }`}
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          onClick={
                            canSort ? header.column.getToggleSortingHandler() : undefined
                          }
                          className={`flex items-center justify-between gap-1.5 ${
                            canSort ? 'cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400' : ''
                          } ${isRowNum ? 'justify-center' : ''}`}
                        >
                          <div className="min-w-0 flex-1 truncate">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </div>

                          {canSort && (
                            <span className="shrink-0 text-slate-400">
                              {sortDir === 'asc' ? (
                                <ArrowUp className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                              ) : sortDir === 'desc' ? (
                                <ArrowDown className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                              ) : (
                                <ArrowUpDown className="h-3 w-3 opacity-0 transition group-hover:opacity-70" />
                              )}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Column Resize Handle */}
                      {header.column.getCanResize() && (
                        <div
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          onClick={(e) => e.stopPropagation()}
                          title="Drag to resize column"
                          className={`absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none touch-none transition ${
                            header.column.getIsResizing()
                              ? 'bg-indigo-500'
                              : 'hover:bg-indigo-400/70'
                          }`}
                        />
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/80">
            {pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400"
                >
                  No rows match your current filters or dataset state.
                </td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <tr
                  key={row.id}
                  className="bg-white transition-colors hover:bg-slate-50/90 dark:bg-slate-900 dark:hover:bg-slate-800/50"
                >
                  {row.getVisibleCells().map((cell) => {
                    const colId = cell.column.id;
                    const isRowNum = colId === '__row_num__';

                    const diff =
                      !isRowNum && previewMode !== 'original'
                        ? isCellModified(
                            row.original.id,
                            colId,
                            row.original.cells[colId] ?? null,
                            originalLookup
                          )
                        : { modified: false, originalValue: null, isNewColumn: false };

                    const shouldHighlight = highlightModified && diff.modified;

                    return (
                      <td
                        key={cell.id}
                        style={{ width: cell.column.getSize(), maxWidth: cell.column.getSize() }}
                        onDoubleClick={() => {
                          if (!isRowNum && previewMode === 'cleaned') {
                            const currentVal = row.original.cells[colId];
                            setEditingCell({
                              rowId: row.original.id,
                              colId,
                              draft:
                                currentVal === null || currentVal === undefined
                                  ? ''
                                  : String(currentVal),
                            });
                          }
                        }}
                        title={
                          shouldHighlight && !diff.isNewColumn
                            ? `Modified (Original: ${
                                diff.originalValue === null || diff.originalValue === ''
                                  ? 'EMPTY'
                                  : String(diff.originalValue)
                              }) — Double-click to edit`
                            : !isRowNum && previewMode === 'cleaned'
                            ? 'Double-click to edit cell'
                            : undefined
                        }
                        className={`truncate border-r border-slate-100 px-3 py-2 text-slate-800 dark:border-slate-800/70 dark:text-slate-200 ${
                          isRowNum
                            ? 'sticky left-0 z-10 bg-slate-50 text-center dark:bg-slate-900'
                            : ''
                        } ${
                          shouldHighlight
                            ? diff.isNewColumn
                              ? 'bg-indigo-50/55 dark:bg-indigo-950/25'
                              : 'bg-emerald-50/75 font-medium dark:bg-emerald-950/30'
                            : ''
                        }`}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination & Footer Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/70 px-4 py-2.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
        <div className="flex flex-wrap items-center gap-3">
          <span className="tabular-nums">
            Showing <strong>{startRowIdx.toLocaleString()}</strong>–
            <strong>{endRowIdx.toLocaleString()}</strong> of{' '}
            <strong>{totalRows.toLocaleString()}</strong> rows
          </span>

          {previewMode === 'cleaned' && (
            <span className="hidden text-[11px] text-slate-400 xl:inline">
              • Tip: Double-click any cell to edit inline, or drag column borders to resize
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <label htmlFor="page-size-select">Rows / page:</label>
            <select
              id="page-size-select"
              value={pagination.pageSize}
              onChange={(e) =>
                setPagination({ pageIndex: 0, pageSize: Number(e.target.value) })
              }
              className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {[25, 50, 100, 250, 500].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              aria-label="First page"
              className="rounded border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Previous page"
              className="rounded border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            <span className="px-2 font-medium tabular-nums text-slate-700 dark:text-slate-200">
              Page {pagination.pageIndex + 1} of {pageCount}
            </span>

            <button
              type="button"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Next page"
              className="rounded border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => table.setPageIndex(pageCount - 1)}
              disabled={!table.getCanNextPage()}
              aria-label="Last page"
              className="rounded border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
