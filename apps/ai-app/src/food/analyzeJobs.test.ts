import { afterEach, describe, expect, it } from 'vitest';
import {
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
});
