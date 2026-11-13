import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  CleaningOperationLog,
  DatasetState,
  HistorySnapshot,
  OperationCategory,
} from '../types/dataset';

const MAX_HISTORY_STEPS = 40;

export function useDatasetHistory() {
  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);

  const hasDataset = history.length > 0 && currentIndex >= 0;

  const originalState: DatasetState = useMemo(() => {
    return history[0]?.state ?? { columns: [], rows: [] };
  }, [history]);

  const currentSnapshot: HistorySnapshot | null = useMemo(() => {
    if (currentIndex < 0 || currentIndex >= history.length) return null;
    return history[currentIndex] ?? null;
  }, [history, currentIndex]);

  const currentState: DatasetState = useMemo(() => {
    return currentSnapshot?.state ?? { columns: [], rows: [] };
  }, [currentSnapshot]);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex >= 0 && currentIndex < history.length - 1;

  const initializeDataset = useCallback((state: DatasetState, summaryLabel: string) => {
    const initialOp: CleaningOperationLog = {
      id: `op_${Date.now()}`,
      category: 'import',
      title: 'Imported Dataset',
      summary: summaryLabel,
      affectedCount: state.rows.length,
      timestamp: Date.now(),
    };

    setHistory([{ state, operation: initialOp }]);
    setCurrentIndex(0);
  }, []);

  const clearDataset = useCallback(() => {
    setHistory([]);
    setCurrentIndex(-1);
  }, []);

  const pushOperation = useCallback(
    (
      nextState: DatasetState,
      meta: {
        category: OperationCategory;
        title: string;
        summary: string;
        affectedCount: number;
      }
    ) => {
      const op: CleaningOperationLog = {
        id: `op_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        category: meta.category,
        title: meta.title,
        summary: meta.summary,
        affectedCount: meta.affectedCount,
        timestamp: Date.now(),
      };

      setHistory((prev) => {
        const sliced = prev.slice(0, currentIndex + 1);
        const appended = [...sliced, { state: nextState, operation: op }];
        if (appended.length > MAX_HISTORY_STEPS) {
          // Always preserve index 0 (original dataset) so diff & reset remain accurate!
          const first = appended[0]!;
          const tail = appended.slice(appended.length - (MAX_HISTORY_STEPS - 1));
          return [first, ...tail];
        }
        return appended;
      });

      setCurrentIndex((prevIdx) => {
        const nextIdx = prevIdx + 1;
        return Math.min(nextIdx, MAX_HISTORY_STEPS - 1);
      });
    },
    [currentIndex]
  );

  const undo = useCallback(() => {
    setCurrentIndex((idx) => (idx > 0 ? idx - 1 : idx));
  }, []);

  const redo = useCallback(() => {
    setCurrentIndex((idx) => (idx < history.length - 1 ? idx + 1 : idx));
  }, [history.length]);

  const jumpToStep = useCallback(
    (index: number) => {
      if (index >= 0 && index < history.length) {
        setCurrentIndex(index);
      }
    },
    [history.length]
  );

  const resetToOriginal = useCallback(() => {
    if (history.length > 0) {
      setCurrentIndex(0);
    }
  }, [history.length]);

  // Global keyboard shortcuts for Undo (Ctrl/Cmd+Z) and Redo (Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z)
  useEffect(() => {
    if (!hasDataset) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;

      if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
        if (canUndo) {
          e.preventDefault();
          undo();
        }
      } else if (
        (e.key.toLowerCase() === 'z' && e.shiftKey) ||
        (e.key.toLowerCase() === 'y' && !e.shiftKey)
      ) {
        if (canRedo) {
          e.preventDefault();
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasDataset, canUndo, canRedo, undo, redo]);

  return {
    hasDataset,
    history,
    currentIndex,
    originalState,
    currentState,
    currentSnapshot,
    canUndo,
    canRedo,
    initializeDataset,
    clearDataset,
    pushOperation,
    undo,
    redo,
    jumpToStep,
    resetToOriginal,
  };
}
