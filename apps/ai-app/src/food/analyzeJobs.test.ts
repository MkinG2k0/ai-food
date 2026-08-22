import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ANALYZE_JOB_TTL_MS,
  analyzeJobOwnerKey,
  canAccessAnalyzeJob,
  completeAnalyzeJob,
  createAnalyzeJob,
  failAnalyzeJob,
  getAnalyzeJob,
  getAnalyzeJobByClientMeal,
  publicAnalyzeJob,
  resetAnalyzeJobs,
} from './analyzeJobs.js';

describe('analyzeJobs', () => {
  afterEach(() => {
    resetAnalyzeJobs();
    vi.useRealTimers();
  });

  it('createAnalyzeJob starts as running and is fetchable by id', () => {
    const job = createAnalyzeJob({ ownerKey: 'device:abc' });
    expect(job.status).toBe('running');
    expect(getAnalyzeJob(job.id)?.id).toBe(job.id);
  });

  it('indexes by client meal id for the same owner', () => {
    const job = createAnalyzeJob({
      ownerKey: 'device:abc',
      clientMealId: 'meal-1',
    });
    expect(getAnalyzeJobByClientMeal('device:abc', 'meal-1')?.id).toBe(job.id);
    expect(getAnalyzeJobByClientMeal('device:other', 'meal-1')).toBeUndefined();
  });

  it('completeAnalyzeJob stores content and publicAnalyzeJob exposes it', () => {
    const job = createAnalyzeJob({ ownerKey: 'device:abc' });
    completeAnalyzeJob(job.id, '<foodName>Суп</foodName>');
    expect(publicAnalyzeJob(getAnalyzeJob(job.id)!)).toEqual({
      jobId: job.id,
      status: 'done',
      content: '<foodName>Суп</foodName>',
    });
  });

  it('failAnalyzeJob stores error without content', () => {
    const job = createAnalyzeJob({ ownerKey: 'device:abc' });
    failAnalyzeJob(job.id, {
      code: 'UPSTREAM_ERROR',
      message: 'boom',
      status: 500,
    });
    expect(publicAnalyzeJob(getAnalyzeJob(job.id)!)).toEqual({
      jobId: job.id,
      status: 'failed',
      error: { code: 'UPSTREAM_ERROR', message: 'boom', status: 500 },
    });
  });

  it('canAccessAnalyzeJob is owner-scoped; anon key is device-less', () => {
    const job = createAnalyzeJob({ ownerKey: analyzeJobOwnerKey('dev-1') });
    expect(canAccessAnalyzeJob(job, 'device:dev-1')).toBe(true);
    expect(canAccessAnalyzeJob(job, 'device:other')).toBe(false);
    expect(analyzeJobOwnerKey(undefined)).toBe('anon');
  });

  it('sweeps expired jobs and cleans owner+meal index', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-22T10:00:00.000Z'));

    const job = createAnalyzeJob({
      ownerKey: 'device:abc',
      clientMealId: 'meal-ttl',
    });
    expect(getAnalyzeJob(job.id)?.id).toBe(job.id);

    vi.advanceTimersByTime(ANALYZE_JOB_TTL_MS + 1);
    expect(getAnalyzeJob(job.id)).toBeUndefined();
    expect(getAnalyzeJobByClientMeal('device:abc', 'meal-ttl')).toBeUndefined();
  });

  it('evicts oldest jobs when capacity exceeds 500', () => {
    const first = createAnalyzeJob({
      ownerKey: 'device:first',
      clientMealId: 'm-first',
    });
    for (let i = 0; i < 500; i += 1) {
      createAnalyzeJob({ ownerKey: `device:n${i}` });
    }
    // createAnalyzeJob sweeps before insert: 501st insert leaves size=501;
    // next create evicts the oldest (first).
    createAnalyzeJob({ ownerKey: 'device:overflow' });

    expect(getAnalyzeJob(first.id)).toBeUndefined();
    expect(getAnalyzeJobByClientMeal('device:first', 'm-first')).toBeUndefined();
  });
});

