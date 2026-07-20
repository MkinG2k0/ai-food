import { describe, expect, it } from 'vitest';
import type { FoodBenchmark } from './benchmarks';
import { mergePersistedRows } from './useModelTest';
import { sanitizePersistedRows } from './useModelTestStore';
import type { ModelTestRow } from './modelTestTypes';

const benchmarks: FoodBenchmark[] = [
  {
    id: '1176',
    name: 'Noodles',
    imageFiles: ['images/01176_5.jpg'],
    reference: { calories: 625, protein: 17, fat: 28, carbs: 76 },
  },
];

function sampleRow(overrides: Partial<ModelTestRow> = {}): ModelTestRow {
  return {
    model: 'google/gemini-3-flash-preview',
    label: 'Gemini 3 Flash',
    status: 'done',
    avgPredicted: { calories: 600, protein: 16, fat: 27, carbs: 74 },
    accuracy: 95,
    samples: [
      {
        foodId: '1176',
        runIndex: 1,
        status: 'done',
        predicted: { calories: 600, protein: 16, fat: 27, carbs: 74 },
        result: null,
        accuracy: 95,
      },
    ],
    ...overrides,
  };
}

describe('sanitizePersistedRows', () => {
  it('resets running samples after reload', () => {
    const rows = sanitizePersistedRows([
      sampleRow({
        status: 'running',
        samples: [
          {
            foodId: '1176',
            runIndex: 1,
            status: 'running',
            predicted: null,
            result: null,
            accuracy: null,
          },
        ],
      }),
    ]);
    expect(rows[0].status).toBe('idle');
    expect(rows[0].samples[0].status).toBe('idle');
  });
});

describe('mergePersistedRows', () => {
  it('restores saved samples for matching model and food', () => {
    const merged = mergePersistedRows(benchmarks, [sampleRow()]);
    const gemini = merged.find((r) => r.model === 'google/gemini-3-flash-preview');
    expect(gemini?.samples.find((s) => s.runIndex === 1)?.accuracy).toBe(95);
    expect(gemini?.status).toBe('done');
  });

  it('returns fresh idle rows when nothing saved', () => {
    const merged = mergePersistedRows(benchmarks, []);
    expect(merged.every((r) => r.status === 'idle')).toBe(true);
  });
});
