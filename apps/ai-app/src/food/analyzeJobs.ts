import { randomUUID } from 'node:crypto';

export const ANALYZE_JOB_TTL_MS = 15 * 60 * 1000;
const MAX_JOBS = 500;

export type AnalyzeJobStatus = 'running' | 'done' | 'failed';

export type AnalyzeJobError = {
  code: string;
  message: string;
  status: number;
};

export type AnalyzeJob = {
  id: string;
  ownerKey: string;
  clientMealId?: string;
  status: AnalyzeJobStatus;
  content?: string;
  error?: AnalyzeJobError;
  createdAt: number;
};

const jobs = new Map<string, AnalyzeJob>();
const byOwnerMeal = new Map<string, string>();

function mealIndexKey(ownerKey: string, clientMealId: string): string {
  return `${ownerKey}::${clientMealId}`;
}

export function analyzeJobOwnerKey(deviceId: string | undefined): string {
  const trimmed = deviceId?.trim();
  return trimmed ? `device:${trimmed}` : 'anon';
}

function sweepExpired(now = Date.now()): void {
  for (const job of jobs.values()) {
    if (now - job.createdAt <= ANALYZE_JOB_TTL_MS) continue;
    jobs.delete(job.id);
    if (job.clientMealId) {
      const key = mealIndexKey(job.ownerKey, job.clientMealId);
      if (byOwnerMeal.get(key) === job.id) {
        byOwnerMeal.delete(key);
      }
    }
  }
  while (jobs.size > MAX_JOBS) {
    const oldest = jobs.keys().next().value;
    if (!oldest) break;
    const job = jobs.get(oldest);
    jobs.delete(oldest);
    if (job?.clientMealId) {
      const key = mealIndexKey(job.ownerKey, job.clientMealId);
      if (byOwnerMeal.get(key) === oldest) {
        byOwnerMeal.delete(key);
      }
    }
  }
}

export function createAnalyzeJob(input: {
  ownerKey: string;
  clientMealId?: string;
}): AnalyzeJob {
  sweepExpired();
  const job: AnalyzeJob = {
    id: randomUUID(),
    ownerKey: input.ownerKey,
    clientMealId: input.clientMealId,
    status: 'running',
    createdAt: Date.now(),
  };
  jobs.set(job.id, job);
  if (input.clientMealId) {
    byOwnerMeal.set(mealIndexKey(input.ownerKey, input.clientMealId), job.id);
  }
  return job;
}

export function getAnalyzeJob(jobId: string): AnalyzeJob | undefined {
  sweepExpired();
  return jobs.get(jobId);
}

export function getAnalyzeJobByClientMeal(
  ownerKey: string,
  clientMealId: string,
): AnalyzeJob | undefined {
  sweepExpired();
  const jobId = byOwnerMeal.get(mealIndexKey(ownerKey, clientMealId));
  return jobId ? jobs.get(jobId) : undefined;
}

export function completeAnalyzeJob(jobId: string, content: string): void {
  const job = jobs.get(jobId);
  if (!job || job.status !== 'running') return;
  job.status = 'done';
  job.content = content;
  job.error = undefined;
}

export function failAnalyzeJob(jobId: string, error: AnalyzeJobError): void {
  const job = jobs.get(jobId);
  if (!job || job.status !== 'running') return;
  job.status = 'failed';
  job.error = error;
}

export function canAccessAnalyzeJob(
  job: AnalyzeJob,
  ownerKey: string,
): boolean {
  return job.ownerKey === ownerKey;
}

export function publicAnalyzeJob(job: AnalyzeJob): {
  jobId: string;
  status: AnalyzeJobStatus;
  content?: string;
  error?: AnalyzeJobError;
} {
  return {
    jobId: job.id,
    status: job.status,
    ...(job.status === 'done' ? { content: job.content ?? '' } : {}),
    ...(job.status === 'failed' && job.error ? { error: job.error } : {}),
  };
}

/** Test helper — clears in-memory jobs between cases. */
export function resetAnalyzeJobs(): void {
  jobs.clear();
  byOwnerMeal.clear();
}
