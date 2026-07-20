import { useCallback, useEffect, useRef, useState } from 'react';
import { analyzeFoodApi } from '@/features/analyze-food';
import { AI_MODEL_OPTIONS } from '@/features/settings';
import { average, kbjuAccuracy } from './accuracy';
import {
  aiFoodUrl,
  loadFoodBenchmarks,
  RUNS_PER_FOOD,
  type FoodBenchmark,
  type KbjuReference,
} from './benchmarks';
import type {
  BenchmarksStatus,
  ModelTestRow,
  SampleResult,
  TestRunStatus,
} from './modelTestTypes';
import {
  sanitizePersistedRows,
  useModelTestStore,
} from './useModelTestStore';

export type {
  BenchmarksStatus,
  ModelRowStatus,
  ModelTestRow,
  SampleResult,
  SampleStatus,
  TestRunStatus,
} from './modelTestTypes';

export function sampleKey(foodId: string, runIndex: number): string {
  return `${foodId}#${runIndex}`;
}

function emptySamples(benchmarks: FoodBenchmark[]): SampleResult[] {
  return benchmarks.flatMap((b) =>
    Array.from({ length: RUNS_PER_FOOD }, (_, i) => ({
      foodId: b.id,
      runIndex: i + 1,
      status: 'idle' as const,
      predicted: null,
      result: null,
      accuracy: null,
    })),
  );
}

function createInitialRows(benchmarks: FoodBenchmark[]): ModelTestRow[] {
  return AI_MODEL_OPTIONS.map((option) => ({
    model: option.value,
    label: option.label,
    status: 'idle',
    samples: emptySamples(benchmarks),
    avgPredicted: null,
    accuracy: null,
  }));
}

function avgPredictedFromSamples(samples: SampleResult[]): KbjuReference | null {
  const done = samples.filter((s) => s.predicted);
  if (done.length === 0) return null;
  return {
    calories: average(done.map((s) => s.predicted!.calories)),
    protein: average(done.map((s) => s.predicted!.protein)),
    fat: average(done.map((s) => s.predicted!.fat)),
    carbs: average(done.map((s) => s.predicted!.carbs)),
  };
}

function modelAccuracyFromSamples(samples: SampleResult[]): number | null {
  const scores = samples
    .map((s) => s.accuracy)
    .filter((v): v is number => typeof v === 'number');
  if (scores.length === 0) return null;
  return average(scores);
}

/** Keep saved sample results when models/foods still match; fill gaps with idle. */
export function mergePersistedRows(
  benchmarks: FoodBenchmark[],
  saved: ModelTestRow[],
): ModelTestRow[] {
  const fresh = createInitialRows(benchmarks);
  if (saved.length === 0) return fresh;

  const foodIds = new Set(benchmarks.map((b) => b.id));
  const sanitized = sanitizePersistedRows(saved);

  return fresh.map((row) => {
    const prev = sanitized.find((r) => r.model === row.model);
    if (!prev) return row;

    const samples = row.samples.map((slot) => {
      const match = prev.samples.find(
        (s) => s.foodId === slot.foodId && s.runIndex === slot.runIndex,
      );
      if (!match || !foodIds.has(match.foodId)) return slot;
      if (match.status === 'running') return slot;
      return match;
    });

    const hasDone = samples.some((s) => s.status === 'done');
    const hasError = samples.some((s) => s.status === 'error');
    return {
      ...row,
      samples,
      avgPredicted: avgPredictedFromSamples(samples),
      accuracy: modelAccuracyFromSamples(samples),
      status: hasError ? 'error' : hasDone ? 'done' : 'idle',
    };
  });
}

async function loadBenchmarkFiles(benchmark: FoodBenchmark): Promise<File[]> {
  const files: File[] = [];
  for (const imageFile of benchmark.imageFiles) {
    const response = await fetch(aiFoodUrl(imageFile));
    if (!response.ok) {
      throw new Error(`Не удалось загрузить фото: ${imageFile}`);
    }
    const blob = await response.blob();
    const name = imageFile.split('/').pop() ?? imageFile;
    files.push(new File([blob], name, { type: blob.type || 'image/jpeg' }));
  }
  if (files.length === 0) {
    throw new Error(`Нет локальных фото для ${benchmark.id}`);
  }
  return files;
}

function patchSample(
  samples: SampleResult[],
  foodId: string,
  runIndex: number,
  patch: Partial<SampleResult>,
): SampleResult[] {
  return samples.map((s) =>
    s.foodId === foodId && s.runIndex === runIndex ? { ...s, ...patch } : s,
  );
}

function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  if ('name' in err && (err as { name: unknown }).name === 'AbortError') return true;
  if ('message' in err) {
    const message = String((err as { message: unknown }).message).toLowerCase();
    return message.includes('abort') || message.includes('отмен');
  }
  return false;
}

function finalizeStoppedRow(row: ModelTestRow): ModelTestRow {
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
    avgPredicted: avgPredictedFromSamples(samples),
    accuracy: modelAccuracyFromSamples(samples),
    status: hasError ? 'error' : hasDone ? 'done' : 'idle',
  };
}

function hasAnyResults(rows: ModelTestRow[]): boolean {
  return rows.some((row) =>
    row.samples.some((s) => s.status === 'done' || s.status === 'error'),
  );
}

export function useModelTest() {
  const [benchmarks, setBenchmarks] = useState<FoodBenchmark[]>([]);
  const [benchmarksStatus, setBenchmarksStatus] =
    useState<BenchmarksStatus>('loading');
  const [benchmarksError, setBenchmarksError] = useState<string | null>(null);
  const rows = useModelTestStore((s) => s.rows);
  const setRows = useModelTestStore((s) => s.setRows);
  const patchRows = useModelTestStore((s) => s.patchRows);
  const clearStoredResults = useModelTestStore((s) => s.clearResults);
  const setLastRunStatus = useModelTestStore((s) => s.setLastRunStatus);
  const lastRunStatus = useModelTestStore((s) => s.lastRunStatus);
  const [runStatus, setRunStatus] = useState<TestRunStatus>('idle');
  const [progressLabel, setProgressLabel] = useState('');
  const [hydrated, setHydrated] = useState(
    () => useModelTestStore.persist.hasHydrated(),
  );
  const runningRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fileCacheRef = useRef(new Map<string, File[]>());
  const benchmarksRef = useRef<FoodBenchmark[]>([]);

  useEffect(() => {
    const unsub = useModelTestStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    if (useModelTestStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    return unsub;
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    let cancelled = false;
    setBenchmarksStatus('loading');
    setBenchmarksError(null);

    void loadFoodBenchmarks()
      .then((loaded) => {
        if (cancelled) return;
        benchmarksRef.current = loaded;
        setBenchmarks(loaded);
        const saved = useModelTestStore.getState().rows;
        setRows(mergePersistedRows(loaded, saved));
        setBenchmarksStatus('ready');
        if (useModelTestStore.getState().lastRunStatus === 'done') {
          setRunStatus('done');
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Не удалось загрузить бенчмарки';
        setBenchmarksError(message);
        setBenchmarksStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [hydrated, setRows]);

  const updateRow = useCallback(
    (model: string, patch: (row: ModelTestRow) => ModelTestRow) => {
      patchRows((prev) =>
        prev.map((row) => (row.model === model ? patch(row) : row)),
      );
    },
    [patchRows],
  );

  const runModelBenchmarks = useCallback(
    async (model: string, label: string): Promise<'completed' | 'stopped'> => {
      const currentBenchmarks = benchmarksRef.current;
      updateRow(model, (row) => ({
        ...row,
        status: 'running',
        samples: emptySamples(currentBenchmarks),
        avgPredicted: null,
        accuracy: null,
      }));

      let hadError = false;
      const fileCache = fileCacheRef.current;

      for (const benchmark of currentBenchmarks) {
        if (stopRequestedRef.current) {
          updateRow(model, finalizeStoppedRow);
          return 'stopped';
        }

        let files = fileCache.get(benchmark.id);
        if (!files) {
          files = await loadBenchmarkFiles(benchmark);
          fileCache.set(benchmark.id, files);
        }

        for (let run = 1; run <= RUNS_PER_FOOD; run++) {
          if (stopRequestedRef.current) {
            updateRow(model, finalizeStoppedRow);
            return 'stopped';
          }

          setProgressLabel(`${label} · ${benchmark.name} · прогон ${run}/${RUNS_PER_FOOD}`);

          updateRow(model, (row) => ({
            ...row,
            samples: patchSample(row.samples, benchmark.id, run, {
              status: 'running',
              predicted: null,
              result: null,
              accuracy: null,
              errorMessage: undefined,
            }),
          }));

          let sample: SampleResult;
          try {
            const signal = abortControllerRef.current?.signal;
            const response = await analyzeFoodApi(
              { images: files },
              {
                model,
                customInstructions: '',
                signal,
                features: {
                  vitamins: true,
                  healthiness: true,
                  composition: true,
                },
              },
            );

            if (stopRequestedRef.current) {
              updateRow(model, finalizeStoppedRow);
              return 'stopped';
            }

            const predicted: KbjuReference = {
              calories: response.result.calories,
              protein: response.result.protein,
              fat: response.result.fat,
              carbs: response.result.carbs,
            };
            const accuracy = kbjuAccuracy(predicted, benchmark.reference);

            sample = {
              foodId: benchmark.id,
              runIndex: run,
              status: 'done',
              predicted,
              result: response.result,
              accuracy,
            };
          } catch (err) {
            if (stopRequestedRef.current || isAbortError(err)) {
              updateRow(model, finalizeStoppedRow);
              return 'stopped';
            }

            hadError = true;
            const message =
              err && typeof err === 'object' && 'message' in err
                ? String((err as { message: unknown }).message)
                : 'Ошибка анализа';
            sample = {
              foodId: benchmark.id,
              runIndex: run,
              status: 'error',
              predicted: null,
              result: null,
              accuracy: 0,
              errorMessage: message,
            };
          }

          updateRow(model, (row) => {
            const nextSamples = row.samples.map((s) =>
              s.foodId === sample.foodId && s.runIndex === sample.runIndex
                ? sample
                : s,
            );
            return {
              ...row,
              samples: nextSamples,
              avgPredicted: avgPredictedFromSamples(nextSamples),
              accuracy: modelAccuracyFromSamples(nextSamples),
            };
          });
        }
      }

      updateRow(model, (row) => ({
        ...row,
        status: hadError ? 'error' : 'done',
        avgPredicted: avgPredictedFromSamples(row.samples),
        accuracy: modelAccuracyFromSamples(row.samples),
      }));
      return 'completed';
    },
    [updateRow],
  );

  const beginRun = useCallback(() => {
    stopRequestedRef.current = false;
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    runningRef.current = true;
    setRunStatus('running');
    setLastRunStatus('running');
  }, [setLastRunStatus]);

  const endRun = useCallback(
    (stopped: boolean) => {
      runningRef.current = false;
      abortControllerRef.current = null;
      setRunStatus('done');
      setLastRunStatus('done');
      setProgressLabel(stopped ? 'Остановлено' : '');
    },
    [setLastRunStatus],
  );

  const stopTest = useCallback(() => {
    if (!runningRef.current) return;
    stopRequestedRef.current = true;
    abortControllerRef.current?.abort();
    setProgressLabel('Остановка…');
  }, []);

  const clearTests = useCallback(() => {
    if (runningRef.current) return;
    clearStoredResults();
    setRows(createInitialRows(benchmarksRef.current));
    setRunStatus('idle');
    setProgressLabel('');
  }, [clearStoredResults, setRows]);

  const runTest = useCallback(async () => {
    if (runningRef.current) return;
    if (benchmarksRef.current.length === 0) return;
    beginRun();
    setRows(createInitialRows(benchmarksRef.current));

    let stopped = false;
    try {
      for (const option of AI_MODEL_OPTIONS) {
        if (stopRequestedRef.current) {
          stopped = true;
          break;
        }
        const result = await runModelBenchmarks(option.value, option.label);
        if (result === 'stopped') {
          stopped = true;
          break;
        }
      }
    } finally {
      endRun(stopped);
    }
  }, [beginRun, endRun, runModelBenchmarks, setRows]);

  const runSingleModel = useCallback(
    async (model: string) => {
      if (runningRef.current) return;
      if (benchmarksRef.current.length === 0) return;
      const option = AI_MODEL_OPTIONS.find((o) => o.value === model);
      if (!option) return;

      beginRun();

      let stopped = false;
      try {
        const result = await runModelBenchmarks(option.value, option.label);
        stopped = result === 'stopped';
      } finally {
        endRun(stopped);
      }
    },
    [beginRun, endRun, runModelBenchmarks],
  );

  return {
    rows,
    runStatus: runStatus === 'idle' && lastRunStatus === 'done' ? 'done' : runStatus,
    progressLabel,
    runTest,
    runSingleModel,
    stopTest,
    clearTests,
    hasResults: hasAnyResults(rows),
    benchmarks,
    benchmarksStatus,
    benchmarksError,
    runsPerFood: RUNS_PER_FOOD,
  };
}
