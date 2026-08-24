import { describe, expect, it } from 'vitest';
import type { Meal } from '@ai-food/shared-types';
import {
  applySyncResponse,
  buildSyncPayload,
  mergeMealsLww,
} from './mealSyncMerge';

function meal(
  id: string,
  clientUpdatedAt: string,
  extras: Partial<Meal> = {},
): Meal {
  return {
    id,
    timestamp: '2026-08-13T08:00:00.000Z',
    items: [],
    totalCalories: 100,
    clientUpdatedAt,
    ...extras,
  };
}

describe('mergeMealsLww', () => {
  it('newer clientUpdatedAt meal replaces older', () => {
    const local = [meal('a', '2026-08-13T10:00:00.000Z', { name: 'old' })];
    const remote = [meal('a', '2026-08-13T12:00:00.000Z', { name: 'new' })];
    const merged = mergeMealsLww(local, remote, []);
    expect(merged).toHaveLength(1);
    expect(merged[0].name).toBe('new');
  });

  it('older server row does not overwrite newer local', () => {
    const local = [meal('a', '2026-08-13T12:00:00.000Z', { name: 'local' })];
    const remote = [meal('a', '2026-08-13T10:00:00.000Z', { name: 'server' })];
    const merged = mergeMealsLww(local, remote, []);
    expect(merged[0].name).toBe('local');
  });

  it('keeps local analyzeJobId when remote meal omits it', () => {
    const local = [
      meal('a', '2026-08-13T10:00:00.000Z', {
        status: 'analyzing',
        analyzeJobId: 'job-1',
      }),
    ];
    const remote = [
      meal('a', '2026-08-13T12:00:00.000Z', {
        status: 'analyzing',
        name: 'Анализ…',
      }),
    ];
    const merged = mergeMealsLww(local, remote, []);
    expect(merged[0].analyzeJobId).toBe('job-1');
    expect(merged[0].name).toBe('Анализ…');
  });

  it('keeps local imageUri when newer remote row omits photo stub', () => {
    const local = [
      meal('a', '2026-08-13T10:00:00.000Z', {
        imageUri: 'meal-images/local.jpg',
        imageUris: ['meal-images/local.jpg'],
      }),
    ];
    const remote = [
      meal('a', '2026-08-13T12:00:00.000Z', {
        status: 'ready',
        name: 'Салат',
      }),
    ];
    const merged = mergeMealsLww(local, remote, []);
    expect(merged[0].name).toBe('Салат');
    expect(merged[0].imageUri).toBe('meal-images/local.jpg');
    expect(merged[0].imageUris).toEqual(['meal-images/local.jpg']);
  });

  it('tombstone removes local meal when delete clock wins', () => {
    const local = [meal('a', '2026-08-13T10:00:00.000Z')];
    const merged = mergeMealsLww(local, [], [
      { id: 'a', clientUpdatedAt: '2026-08-13T11:00:00.000Z' },
    ]);
    expect(merged).toHaveLength(0);
  });

  it('tombstone loses to newer local meal', () => {
    const local = [meal('a', '2026-08-13T12:00:00.000Z', { name: 'kept' })];
    const merged = mergeMealsLww(local, [], [
      { id: 'a', clientUpdatedAt: '2026-08-13T11:00:00.000Z' },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].name).toBe('kept');
  });
});

describe('buildSyncPayload', () => {
  it('upserts include clientUpdatedAt; image stubs only', () => {
    const meals = [
      meal('a', '2026-08-13T10:00:00.000Z', {
        imageUri: 'file://local/a.jpg',
        imageUris: ['file://local/a.jpg'],
        analyzeJobId: 'job-local',
      }),
    ];
    const body = buildSyncPayload({
      mode: 'full',
      meals,
      pendingDeletes: [],
    });
    expect(body.upserts).toHaveLength(1);
    expect(body.upserts[0].clientUpdatedAt).toBe('2026-08-13T10:00:00.000Z');
    expect(body.upserts[0].imageUri).toBe('file://local/a.jpg');
    expect(body.upserts[0].analyzeJobId).toBeUndefined();
    expect(body.deletes).toEqual([]);
  });

  it('deletes list pending delete ids with clocks', () => {
    const body = buildSyncPayload({
      mode: 'delete',
      meals: [],
      mealIds: ['gone'],
      pendingDeletes: [
        { id: 'gone', clientUpdatedAt: '2026-08-13T09:00:00.000Z' },
      ],
    });
    expect(body.upserts).toEqual([]);
    expect(body.deletes).toEqual([
      { id: 'gone', clientUpdatedAt: '2026-08-13T09:00:00.000Z' },
    ]);
  });
});

describe('applySyncResponse', () => {
  it('after successful sync, diary matches merged active set', () => {
    const local = [
      meal('a', '2026-08-13T10:00:00.000Z'),
      meal('b', '2026-08-13T10:00:00.000Z'),
    ];
    const next = applySyncResponse(local, {
      meals: [meal('a', '2026-08-13T12:00:00.000Z', { name: 'updated' })],
      tombstones: ['b'],
    });
    expect(next.map((m) => m.id)).toEqual(['a']);
    expect(next[0].name).toBe('updated');
  });
});
