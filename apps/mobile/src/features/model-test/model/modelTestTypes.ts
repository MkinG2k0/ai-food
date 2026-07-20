import type { NutritionResult } from '@ai-food/shared-types';
import type { KbjuReference } from './benchmarks';

export type SampleStatus = 'idle' | 'running' | 'done' | 'error';
export type ModelRowStatus = 'idle' | 'running' | 'done' | 'error';
export type TestRunStatus = 'idle' | 'running' | 'done';
export type BenchmarksStatus = 'loading' | 'ready' | 'error';

export interface SampleResult {
  foodId: string;
  runIndex: number;
  status: SampleStatus;
  predicted: KbjuReference | null;
  /** Full analyze payload for the detail modal */
  result: NutritionResult | null;
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
