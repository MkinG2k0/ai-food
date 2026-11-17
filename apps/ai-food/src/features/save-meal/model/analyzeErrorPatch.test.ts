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

  it('clears analyzeJobId for ANALYSIS_TIMEOUT', () => {
    expect(
      analyzeErrorPatch({
        message: 'Analysis timed out.',
        code: 'ANALYSIS_TIMEOUT',
        status: 504,
      }),
    ).toEqual({
      status: 'error',
      analyzeErrorCode: 'ANALYSIS_TIMEOUT',
      analyzeJobId: undefined,
    });
  });

  it('clears analyzeJobId for UPSTREAM_ERROR so the card is not stuck loading', () => {
    expect(
      analyzeErrorPatch({
        message: 'Upstream request failed.',
        code: 'UPSTREAM_ERROR',
        status: 500,
      }),
    ).toEqual({
      status: 'error',
      analyzeErrorCode: 'UPSTREAM_ERROR',
      analyzeJobId: undefined,
    });
  });

  it('clears analyzeJobId for ANALYSIS_FAILED', () => {
    expect(
      analyzeErrorPatch({
        message: 'fail',
        code: 'ANALYSIS_FAILED',
        status: 500,
      }),
    ).toEqual({
      status: 'error',
      analyzeErrorCode: 'ANALYSIS_FAILED',
      analyzeJobId: undefined,
    });
  });

  it('keeps analyzeJobId for STREAM_INTERRUPTED so resume can poll', () => {
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
