import { describe, expect, it } from 'vitest';
import { analyzeErrorPatch } from './analyzeErrorPatch';

describe('analyzeErrorPatch', () => {
  it('clears analyzeJobId for terminal no-food errors', () => {
    expect(
      analyzeErrorPatch({
        message: 'На фото не обнаружена еда.',
        code: 'NO_FOOD_DETECTED',
        status: 422,
      }),
    ).toEqual({
      status: 'error',
      analyzeErrorCode: 'NO_FOOD_DETECTED',
      analyzeJobId: undefined,
    });
  });

  it('keeps analyzeJobId for generic failures so resume can poll', () => {
    expect(
      analyzeErrorPatch({
        message: 'Поток анализа оборвался.',
        code: 'STREAM_INTERRUPTED',
        status: 499,
      }),
    ).toEqual({
      status: 'error',
      analyzeErrorCode: 'STREAM_INTERRUPTED',
    });
  });
});
