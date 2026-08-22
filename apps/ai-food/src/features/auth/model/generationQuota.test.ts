import { describe, expect, it } from 'vitest';
import { createDefaultGuestUsage } from '../api/fetchUsage';
import { isGenerationQuotaAvailable } from './generationQuota';

describe('isGenerationQuotaAvailable', () => {
  it('allows generation while free quota remains', () => {
    const usage = { ...createDefaultGuestUsage(), remaining: 3 };
    expect(isGenerationQuotaAvailable(usage)).toBe(true);
  });

  it('blocks when free quota is exhausted', () => {
    const usage = { ...createDefaultGuestUsage(), remaining: 0 };
    expect(isGenerationQuotaAvailable(usage)).toBe(false);
  });

  it('allows unlimited usage with active subscription', () => {
    expect(
      isGenerationQuotaAvailable({
        ...createDefaultGuestUsage(true),
        remaining: null,
        hasActiveSubscription: true,
      }),
    ).toBe(true);
  });

  it('optimistically allows when usage is not loaded yet', () => {
    expect(isGenerationQuotaAvailable(undefined)).toBe(true);
  });
});
