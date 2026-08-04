import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  getAuthLoginBonus,
  getEffectiveLimit,
  getFreeLimit,
  getUsageSnapshot,
  parseUsageKind,
  shouldEnforceQuota,
} from './quota.js';

describe('quota helpers', () => {
  const prevLimit = process.env.FREE_GENERATION_LIMIT;
  const prevBonus = process.env.AUTH_LOGIN_GENERATION_BONUS;
  const prevDb = process.env.DATABASE_URL;
  const prevEnforce = process.env.QUOTA_ENFORCE;

  afterEach(() => {
    if (prevLimit === undefined) delete process.env.FREE_GENERATION_LIMIT;
    else process.env.FREE_GENERATION_LIMIT = prevLimit;
    if (prevBonus === undefined) delete process.env.AUTH_LOGIN_GENERATION_BONUS;
    else process.env.AUTH_LOGIN_GENERATION_BONUS = prevBonus;
    if (prevDb === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = prevDb;
    if (prevEnforce === undefined) delete process.env.QUOTA_ENFORCE;
    else process.env.QUOTA_ENFORCE = prevEnforce;
  });

  it('parseUsageKind defaults to other', () => {
    expect(parseUsageKind(undefined)).toBe('other');
    expect(parseUsageKind('analyze')).toBe('analyze');
    expect(parseUsageKind('refine')).toBe('refine');
    expect(parseUsageKind('nope')).toBe('other');
  });

  it('getFreeLimit defaults to 50', () => {
    delete process.env.FREE_GENERATION_LIMIT;
    expect(getFreeLimit()).toBe(50);
    process.env.FREE_GENERATION_LIMIT = '25';
    expect(getFreeLimit()).toBe(25);
  });

  it('getAuthLoginBonus defaults to 100', () => {
    delete process.env.AUTH_LOGIN_GENERATION_BONUS;
    expect(getAuthLoginBonus()).toBe(100);
    process.env.AUTH_LOGIN_GENERATION_BONUS = '75';
    expect(getAuthLoginBonus()).toBe(75);
  });

  it('getEffectiveLimit sums free + login bonus when authenticated', () => {
    process.env.FREE_GENERATION_LIMIT = '50';
    process.env.AUTH_LOGIN_GENERATION_BONUS = '100';
    expect(getEffectiveLimit(false)).toBe(50);
    expect(getEffectiveLimit(true)).toBe(150);
  });

  it('shouldEnforceQuota follows DATABASE_URL and QUOTA_ENFORCE', () => {
    delete process.env.QUOTA_ENFORCE;
    delete process.env.DATABASE_URL;
    expect(shouldEnforceQuota()).toBe(false);
    process.env.DATABASE_URL = 'postgresql://x';
    expect(shouldEnforceQuota()).toBe(true);
    process.env.QUOTA_ENFORCE = 'false';
    expect(shouldEnforceQuota()).toBe(false);
    process.env.QUOTA_ENFORCE = 'true';
    delete process.env.DATABASE_URL;
    expect(shouldEnforceQuota()).toBe(true);
  });

  it('getUsageSnapshot: auth with subscription → remaining null', async () => {
    process.env.FREE_GENERATION_LIMIT = '50';
    process.env.AUTH_LOGIN_GENERATION_BONUS = '100';
    const prisma = {
      device: { findUnique: vi.fn() },
    } as never;
    const snap = await getUsageSnapshot(prisma, 'dev-1', {
      authenticated: true,
      hasActiveSubscription: true,
    });
    expect(snap).toEqual({
      used: 0,
      limit: 150,
      remaining: null,
      authenticated: true,
      hasActiveSubscription: true,
    });
  });

  it('getUsageSnapshot: auth without subscription → free + login bonus', async () => {
    process.env.FREE_GENERATION_LIMIT = '50';
    process.env.AUTH_LOGIN_GENERATION_BONUS = '100';
    const prisma = {
      device: {
        findUnique: vi.fn().mockResolvedValue({ id: 'drow' }),
      },
      usageEvent: {
        count: vi.fn().mockResolvedValue(10),
      },
    } as never;
    const snap = await getUsageSnapshot(prisma, 'dev-1', {
      authenticated: true,
      hasActiveSubscription: false,
    });
    expect(snap).toEqual({
      used: 10,
      limit: 150,
      remaining: 140,
      authenticated: true,
      hasActiveSubscription: false,
    });
  });

  it('getUsageSnapshot: guest → free limit only', async () => {
    process.env.FREE_GENERATION_LIMIT = '50';
    process.env.AUTH_LOGIN_GENERATION_BONUS = '100';
    const prisma = {
      device: {
        findUnique: vi.fn().mockResolvedValue({ id: 'drow' }),
      },
      usageEvent: {
        count: vi.fn().mockResolvedValue(10),
      },
    } as never;
    const snap = await getUsageSnapshot(prisma, 'dev-1', {
      authenticated: false,
      hasActiveSubscription: false,
    });
    expect(snap).toEqual({
      used: 10,
      limit: 50,
      remaining: 40,
      authenticated: false,
      hasActiveSubscription: false,
    });
  });
});
