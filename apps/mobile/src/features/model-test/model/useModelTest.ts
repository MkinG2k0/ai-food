import { useCallback, useRef, useState } from 'react';
import { analyzeFoodApi } from '@/features/analyze-food';
import { AI_MODEL_OPTIONS } from '@/features/settings';
import { average, kbjuAccuracy } from './accuracy';
import {
  FOOD_BENCHMARKS,
  type FoodBenchmark,
  type KbjuReference,
} from './benchmarks';

export type SampleStatus = 'idle' | 'running' | 'done' | 'error';
export type ModelRowStatus = 'idle' | 'running' | 'done' | 'error';

export interface SampleResult {
  foodId: string;
  status: SampleStatus;
  predicted: KbjuReference | null;
  accuracy: number | null;
  errorMessage?: string;
}

export interface ModelTestRow {
  model: string;
  label: string;
  status: ModelRowStatus;
  samples: SampleResult[];
  avgPredicted: KbjuReference | null;
  accuracy: number | null;
}

export type TestRunStatus = 'idle' | 'running' | 'done';

function emptySamples(): SampleResult[] {
  return FOOD_BENCHMARKS.map((b) => ({
    foodId: b.id,
    status: 'idle',
    predicted: null,
    accuracy: null,
  }));
}

function createInitialRows(): ModelTestRow[] {
  return AI_MODEL_OPTIONS.map((option) => ({
    model: option.value,
    label: option.label,
    status: 'idle',
    samples: emptySamples(),
    avgPredicted: null,
    accuracy: null,
  }));
}

async function loadBenchmarkFile(benchmark: FoodBenchmark): Promise<File> {
  const url = `/food/${encodeURIComponent(benchmark.imageFile)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Не удалось загрузить фото: ${benchmark.imageFile}`);
  }
  const blob = await response.blob();
  return new File([blob], benchmark.imageFile, {
    type: blob.type || 'image/png',
  });
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

export function useModelTest() {
  const [rows, setRows] = useState<ModelTestRow[]>(createInitialRows);
  const [runStatus, setRunStatus] = useState<TestRunStatus>('idle');
  const [progressLabel, setProgressLabel] = useState('');
  const runningRef = useRef(false);
  const fileCacheRef = useRef(new Map<string, File>());

  const updateRow = useCallback(
    (model: string, patch: (row: ModelTestRow) => ModelTestRow) => {
      setRows((prev) => prev.map((row) => (row.model === model ? patch(row) : row)));
    },
    [],
  );

  const runModelBenchmarks = useCallback(
    async (model: string, label: string) => {
      updateRow(model, (row) => ({
        ...row,
        status: 'running',
        samples: emptySamples(),
        avgPredicted: null,
        accuracy: null,
      }));

      let hadError = false;
      const fileCache = fileCacheRef.current;

      for (const benchmark of FOOD_BENCHMARKS) {
        setProgressLabel(`${label} · ${benchmark.name}`);

        updateRow(model, (row) => ({
          ...row,
          samples: row.samples.map((s) =>
            s.foodId === benchmark.id
              ? {
                  ...s,
                  status: 'running',
                  predicted: null,
                  accuracy: null,
                  errorMessage: undefined,
                }
              : s,
          ),
        }));

        let sample: SampleResult;
        try {
          let file = fileCache.get(benchmark.id);
          if (!file) {
            file = await loadBenchmarkFile(benchmark);
            fileCache.set(benchmark.id, file);
          }

          const response = await analyzeFoodApi(file, {
            model,
            customInstructions: '',
          });

          const predicted: KbjuReference = {
            calories: response.result.calories,
            protein: response.result.protein,
            fat: response.result.fat,
            carbs: response.result.carbs,
          };
          const accuracy = kbjuAccuracy(predicted, benchmark.reference);

          sample = {
            foodId: benchmark.id,
            status: 'done',
            predicted,
            accuracy,
          };
        } catch (err) {
          hadError = true;
          const message =
            err && typeof err === 'object' && 'message' in err
              ? String((err as { message: unknown }).message)
              : 'Ошибка анализа';
          sample = {
            foodId: benchmark.id,
            status: 'error',
            predicted: null,
            accuracy: 0,
            errorMessage: message,
          };
        }

        updateRow(model, (row) => {
          const nextSamples = row.samples.map((s) =>
            s.foodId === sample.foodId ? sample : s,
          );
          return {
            ...row,
            samples: nextSamples,
            avgPredicted: avgPredictedFromSamples(nextSamples),
            accuracy: modelAccuracyFromSamples(nextSamples),
          };
        });
      }

      updateRow(model, (row) => ({
        ...row,
        status: hadError ? 'error' : 'done',
        avgPredicted: avgPredictedFromSamples(row.samples),
        accuracy: modelAccuracyFromSamples(row.samples),
      }));
    },
    [updateRow],
  );

  const runTest = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setRunStatus('running');
    setRows(createInitialRows());

    try {
      for (const option of AI_MODEL_OPTIONS) {
        await runModelBenchmarks(option.value, option.label);
      }
      setRunStatus('done');
      setProgressLabel('');
    } finally {
      runningRef.current = false;
    }
  }, [runModelBenchmarks]);

  const runSingleModel = useCallback(
    async (model: string) => {
      if (runningRef.current) return;
      const option = AI_MODEL_OPTIONS.find((o) => o.value === model);
      if (!option) return;

      runningRef.current = true;
      setRunStatus('running');

      try {
        await runModelBenchmarks(option.value, option.label);
        setRunStatus('done');
        setProgressLabel('');
      } finally {
        runningRef.current = false;
      }
    },
    [runModelBenchmarks],
  );

  return {
    rows,
    runStatus,
    progressLabel,
    runTest,
    runSingleModel,
    benchmarks: FOOD_BENCHMARKS,
  };
}
