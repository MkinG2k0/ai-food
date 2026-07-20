import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { capacitorStorage } from '@/shared/lib';
import type { ModelTestRow, TestRunStatus } from './modelTestTypes';

interface ModelTestPersistedState {
  rows: ModelTestRow[];
  /** Last completed/stopped run marker for UI */
  lastRunStatus: TestRunStatus;
  setRows: (rows: ModelTestRow[]) => void;
  patchRows: (patch: (rows: ModelTestRow[]) => ModelTestRow[]) => void;
  setLastRunStatus: (status: TestRunStatus) => void;
  clearResults: () => void;
}

/** Drop in-flight markers after reload — no live request survives refresh. */
export function sanitizePersistedRows(rows: ModelTestRow[]): ModelTestRow[] {
  return rows.map((row) => {
    const samples = row.samples.map((s) =>
      s.status === 'running'
        ? {
            ...s,
            status: 'idle' as const,
            predicted: null,
            result: null,
            accuracy: null,
            errorMessage: undefined,
          }
        : s,
    );
    const hasDone = samples.some((s) => s.status === 'done');
    const hasError = samples.some((s) => s.status === 'error');
    return {
      ...row,
      samples,
      status:
        row.status === 'running'
          ? hasError
            ? ('error' as const)
            : hasDone
              ? ('done' as const)
              : ('idle' as const)
          : row.status,
    };
  });
}

export const useModelTestStore = create<ModelTestPersistedState>()(
  persist(
    (set) => ({
      rows: [],
      lastRunStatus: 'idle',
      setRows: (rows) => set({ rows }),
      patchRows: (patch) => set((state) => ({ rows: patch(state.rows) })),
      setLastRunStatus: (lastRunStatus) => set({ lastRunStatus }),
      clearResults: () => set({ rows: [], lastRunStatus: 'idle' }),
    }),
    {
      name: 'ai-food-model-test',
      storage: createJSONStorage(() => capacitorStorage),
      partialize: (state) => ({
        rows: sanitizePersistedRows(state.rows),
        lastRunStatus:
          state.lastRunStatus === 'running' ? 'done' : state.lastRunStatus,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.rows = sanitizePersistedRows(state.rows);
        if (state.lastRunStatus === 'running') {
          state.lastRunStatus = 'done';
        }
      },
    },
  ),
);
